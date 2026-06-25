import type { Prisma, PrismaClient, Submission } from '@prisma/client';
import { ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { buildSubmissionSchema, visibleFields } from '../forms/form-fields.js';
import { parseFormSchema } from '../forms/forms.service.js';
import type { StorageService } from '../storage/storage.types.js';
import type { SubmissionDto, SubmissionListQuery } from './submissions.schemas.js';

export interface SubmissionMetadata {
  ip?: string | undefined;
  userAgent?: string | undefined;
}

export interface PaginatedSubmissions {
  submissions: SubmissionDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * A file that has already been saved to storage by the route handler.
 * The stream is consumed before this is created, so there is no stream
 * reference here — only the metadata and storage key returned by StorageService.
 */
export interface SavedFileRef {
  /** Name of the form field this file belongs to. */
  fieldName: string;
  /** Original filename as sent by the client (stored as metadata only). */
  filename: string;
  /** MIME type reported by the client. */
  mimeType: string;
  /** Storage key assigned by StorageService.save(). */
  storageKey: string;
  /** Exact byte count as reported by StorageService.save(). */
  size: number;
}

/**
 * Submission use-cases: public creation (validated against the form schema) and
 * owner-scoped review.
 */
export class SubmissionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage?: StorageService,
  ) {}

  /**
   * Validates and stores a submission for a *published* form, identified by its
   * public slug. Unknown fields are stripped and answers are coerced/validated
   * against the form's field definitions.
   *
   * This is the JSON path (existing behaviour). For multipart submissions use
   * `createForSlugMultipart`.
   */
  async createForSlug(
    slug: string,
    rawData: unknown,
    metadata: SubmissionMetadata,
  ): Promise<{ id: string }> {
    const form = await this.prisma.form.findUnique({ where: { slug } });
    if (!form || form.status !== 'PUBLISHED') {
      throw new NotFoundError('Form not found or not accepting submissions');
    }

    const fields = parseFormSchema(form.schema);
    // Re-evaluate visibility server-side against the submitted answers: hidden
    // fields are not required and their smuggled answers are stripped by .strip().
    const submitted = (typeof rawData === 'object' && rawData !== null
      ? rawData
      : {}) as Record<string, unknown>;
    const visible = visibleFields(fields, submitted);
    const validator = buildSubmissionSchema(visible);
    // Throws ZodError on failure -> mapped to 422 by the error handler.
    const data = validator.parse(submitted);

    const submission = await this.prisma.submission.create({
      data: {
        formId: form.id,
        data: serializeData(data),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    return { id: submission.id };
  }

  /**
   * Multipart variant of `createForSlug`.
   *
   * The route handler is responsible for iterating the multipart stream and
   * saving each file to storage BEFORE calling this method (so that busboy can
   * advance past each file part without deadlocking). This method receives the
   * already-saved file references and:
   *   1. Validates each file against the per-field `accept`/`maxSizeBytes` constraints.
   *   2. Deletes refs for hidden file fields (visibility filtering).
   *   3. Merges file references with the text fields.
   *   4. Runs the same `buildSubmissionSchema` validator as the JSON path.
   *
   * On any per-file validation failure all saved file keys are deleted (to
   * avoid orphans) and a `ValidationError` (→ 422) is thrown.
   *
   * The route handler must also delete all saved keys if this method throws,
   * as it may throw before it has had a chance to clean up (e.g. form lookup
   * failure before any key-specific cleanup).
   */
  async createForSlugMultipart(
    slug: string,
    textFields: Record<string, string>,
    savedFiles: SavedFileRef[],
    metadata: SubmissionMetadata,
  ): Promise<{ id: string }> {
    const storageService = this.requireStorage();

    const form = await this.prisma.form.findUnique({ where: { slug } });
    if (!form || form.status !== 'PUBLISHED') {
      throw new NotFoundError('Form not found or not accepting submissions');
    }

    const fields = parseFormSchema(form.schema);

    // Build a lookup so we can check per-field constraints quickly.
    const fieldsByName = new Map(fields.map((f) => [f.name, f]));

    // Pre-compute which file fields are visible using text answers only, so we
    // can discard refs for fields hidden by a text answer and avoid orphans.
    const visibleByTextAnswers = new Set(
      visibleFields(fields, textFields as Record<string, unknown>).map((f) => f.name),
    );

    // All storage keys received — needed for rollback on validation failure.
    const allKeys = savedFiles.map((f) => f.storageKey);

    // Accumulator: fieldName → single reference or array of references.
    const fileData: Record<string, unknown> = {};

    try {
      for (const ref of savedFiles) {
        const fieldDef = fieldsByName.get(ref.fieldName);

        // Unknown / non-file-field: should not reach here in normal flow, but
        // delete the orphan and reject.
        if (fieldDef === undefined || fieldDef.type !== 'file') {
          throw new ValidationError(
            `Field "${ref.fieldName}" is not a file field in this form`,
          );
        }

        // Hidden file field: delete the already-saved bytes and skip.
        if (!visibleByTextAnswers.has(ref.fieldName)) {
          await storageService.delete(ref.storageKey);
          continue;
        }

        // MIME type check.
        if (
          fieldDef.accept !== undefined &&
          fieldDef.accept.length > 0 &&
          !fieldDef.accept.includes(ref.mimeType)
        ) {
          throw new ValidationError(
            `File "${ref.filename}" has type "${ref.mimeType}" which is not allowed for field "${ref.fieldName}". Allowed types: ${fieldDef.accept.join(', ')}`,
          );
        }

        // Per-field size check.
        if (fieldDef.maxSizeBytes !== undefined && ref.size > fieldDef.maxSizeBytes) {
          throw new ValidationError(
            `File "${ref.filename}" (${ref.size} bytes) exceeds the per-field limit of ${fieldDef.maxSizeBytes} bytes for field "${ref.fieldName}"`,
          );
        }

        const reference = {
          storageKey: ref.storageKey,
          filename: ref.filename,
          mimeType: ref.mimeType,
          size: ref.size,
        };

        // Accumulate multiple files into an array when maxFiles > 1.
        const maxFiles = fieldDef.maxFiles ?? 1;
        if (maxFiles > 1) {
          const existing = fileData[ref.fieldName];
          if (Array.isArray(existing)) {
            existing.push(reference);
          } else {
            fileData[ref.fieldName] = [reference];
          }
        } else {
          fileData[ref.fieldName] = reference;
        }
      }
    } catch (err) {
      // Rollback: delete all saved files (those already cleaned up above are
      // idempotent-safe — LocalDiskStorageService.delete() ignores ENOENT).
      await Promise.allSettled(allKeys.map((k) => storageService.delete(k)));
      throw err;
    }

    // Merge text fields and file references, then run the authoritative validator.
    const rawData: Record<string, unknown> = { ...textFields, ...fileData };
    const visible = visibleFields(fields, rawData);
    const validator = buildSubmissionSchema(visible);
    // Throws ZodError on failure -> mapped to 422 by the error handler.
    const data = validator.parse(rawData);

    const submission = await this.prisma.submission.create({
      data: {
        formId: form.id,
        data: serializeData(data),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    return { id: submission.id };
  }

  async listForForm(
    ownerId: string,
    formId: string,
    query: SubmissionListQuery,
  ): Promise<PaginatedSubmissions> {
    await this.requireOwnedForm(ownerId, formId);

    const { page, pageSize } = query;
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.submission.count({ where: { formId } }),
      this.prisma.submission.findMany({
        where: { formId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      submissions: rows.map(toSubmissionDto),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getOne(ownerId: string, formId: string, id: string): Promise<SubmissionDto> {
    await this.requireOwnedForm(ownerId, formId);
    const submission = await this.prisma.submission.findFirst({ where: { id, formId } });
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }
    return toSubmissionDto(submission);
  }

  /**
   * Retrieves a submission and verifies both ownership and that the requested
   * `storageKey` is actually referenced inside that submission's `data`.
   * Returns the full data record so the route can extract filename/mimeType.
   */
  async getSubmissionFileRef(
    ownerId: string,
    formId: string,
    submissionId: string,
    storageKey: string,
  ): Promise<{ filename: string; mimeType: string; storageKey: string }> {
    await this.requireOwnedForm(ownerId, formId);

    const submission = await this.prisma.submission.findFirst({
      where: { id: submissionId, formId },
    });
    if (!submission) {
      throw new NotFoundError('Submission not found');
    }

    // Walk the submission data looking for the storageKey.
    const ref = findFileRef(submission.data, storageKey);
    if (!ref) {
      throw new NotFoundError('File not found in this submission');
    }

    return ref;
  }

  async requireOwnedForm(ownerId: string, formId: string): Promise<void> {
    const form = await this.prisma.form.findUnique({
      where: { id: formId },
      select: { ownerId: true },
    });
    if (!form) {
      throw new NotFoundError('Form not found');
    }
    if (form.ownerId !== ownerId) {
      throw new ForbiddenError();
    }
  }

  private requireStorage(): StorageService {
    if (!this.storage) {
      throw new Error('StorageService is not configured on SubmissionsService');
    }
    return this.storage;
  }
}

/** Converts validated answers into JSON-serialisable values (e.g. Date). */
function serializeData(data: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out as Prisma.InputJsonValue;
}

function toSubmissionDto(submission: Submission): SubmissionDto {
  return {
    id: submission.id,
    formId: submission.formId,
    data: (submission.data ?? {}) as Record<string, unknown>,
    metadata: (submission.metadata ?? null) as Record<string, unknown> | null,
    createdAt: submission.createdAt,
  };
}

/**
 * Recursively searches a submission's `data` object for any file reference
 * whose `storageKey` matches `key`. Handles both single-reference fields and
 * array (maxFiles > 1) fields.
 */
function findFileRef(
  data: unknown,
  key: string,
): { filename: string; mimeType: string; storageKey: string } | null {
  if (data === null || typeof data !== 'object') return null;

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = findFileRef(item, key);
      if (found) return found;
    }
    return null;
  }

  const record = data as Record<string, unknown>;

  // Check if this object itself is a file reference.
  if (
    typeof record['storageKey'] === 'string' &&
    typeof record['filename'] === 'string' &&
    typeof record['mimeType'] === 'string' &&
    record['storageKey'] === key
  ) {
    return {
      storageKey: record['storageKey'],
      filename: record['filename'],
      mimeType: record['mimeType'],
    };
  }

  // Recurse into values.
  for (const value of Object.values(record)) {
    const found = findFileRef(value, key);
    if (found) return found;
  }

  return null;
}
