/**
 * Unit tests for SubmissionsService.createForSlugMultipart.
 *
 * With the busboy-deadlock fix, file streams are now consumed by the route
 * handler BEFORE calling this service. The service therefore receives
 * already-saved SavedFileRef objects (storageKey + size) instead of raw
 * streams. Storage saves no longer happen inside the service; only deletions
 * (rollbacks on validation failure and cleanup of hidden-field orphans) do.
 */
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { ValidationError } from '../src/lib/errors.js';
import type { FormField } from '../src/modules/forms/form-fields.js';
import type { SaveResult, StorageService } from '../src/modules/storage/storage.types.js';
import type { SavedFileRef } from '../src/modules/submissions/submissions.service.js';
import { SubmissionsService } from '../src/modules/submissions/submissions.service.js';

// ─── Fake StorageService ──────────────────────────────────────────────────────

function makeFakeStorage(): StorageService & {
  savedKeys: string[];
  deletedKeys: string[];
} {
  const savedKeys: string[] = [];
  const deletedKeys: string[] = [];
  let counter = 0;

  return {
    savedKeys,
    deletedKeys,

    async save(): Promise<SaveResult> {
      const storageKey = `fake-key-${++counter}`;
      savedKeys.push(storageKey);
      return { storageKey, size: 100 };
    },

    createReadStream() {
      return null;
    },

    async stat() {
      return null;
    },

    async delete(storageKey: string): Promise<void> {
      deletedKeys.push(storageKey);
    },
  };
}

// ─── Fake PrismaClient ────────────────────────────────────────────────────────

function makeFakePrisma(fields: FormField[]) {
  const form = {
    id: 'form-1',
    status: 'PUBLISHED',
    schema: fields,
  };

  return {
    form: {
      findUnique: vi.fn().mockResolvedValue(form),
    },
    submission: {
      create: vi.fn().mockResolvedValue({ id: 'sub-1' }),
    },
  } as unknown as PrismaClient;
}

// ─── Test form schema ─────────────────────────────────────────────────────────

const resumeField: FormField = {
  id: 'f1',
  type: 'file',
  label: 'Resume',
  name: 'resume',
  required: false,
};

const textField: FormField = {
  id: 'f2',
  type: 'text',
  label: 'Name',
  name: 'name',
  required: false,
};

/** Minimal SavedFileRef — storageKey pre-assigned (route handler already saved it). */
function savedRef(overrides: Partial<SavedFileRef> & { fieldName: string; storageKey: string }): SavedFileRef {
  return {
    filename: 'file.pdf',
    mimeType: 'application/pdf',
    size: 100,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SubmissionsService.createForSlugMultipart — unknown field guard (Fix 1)', () => {
  it('rejects a file whose fieldName is not declared in the form schema', async () => {
    const storage = makeFakeStorage();
    const prisma = makeFakePrisma([resumeField]);
    const service = new SubmissionsService(prisma, storage);

    await expect(
      service.createForSlugMultipart(
        'test-form',
        {},
        [savedRef({ fieldName: 'ghost', storageKey: 'key-ghost' })],
        {},
      ),
    ).rejects.toThrow(ValidationError);

    await expect(
      service.createForSlugMultipart(
        'test-form',
        {},
        [savedRef({ fieldName: 'ghost', storageKey: 'key-ghost-2' })],
        {},
      ),
    ).rejects.toThrow('Field "ghost" is not a file field in this form');
  });

  it('rolls back the pre-saved ref when the fieldName is undeclared (no orphan left)', async () => {
    const storage = makeFakeStorage();
    const prisma = makeFakePrisma([resumeField]);
    const service = new SubmissionsService(prisma, storage);

    await expect(
      service.createForSlugMultipart(
        'test-form',
        {},
        [savedRef({ fieldName: 'ghost', storageKey: 'orphan-key' })],
        {},
      ),
    ).rejects.toThrow(ValidationError);

    // Service must delete the pre-saved orphan key on rollback.
    expect(storage.deletedKeys).toContain('orphan-key');
  });

  it('rejects a file whose fieldName corresponds to a non-file field (e.g. text)', async () => {
    const storage = makeFakeStorage();
    const prisma = makeFakePrisma([resumeField, textField]);
    const service = new SubmissionsService(prisma, storage);

    await expect(
      service.createForSlugMultipart(
        'test-form',
        {},
        [savedRef({ fieldName: 'name', storageKey: 'trick-key' })],
        {},
      ),
    ).rejects.toThrow(ValidationError);

    // The pre-saved key must be deleted (rolled back) even though the field is text.
    expect(storage.deletedKeys).toContain('trick-key');
  });

  it('rolls back ALL pre-saved refs when a later file has an undeclared fieldName', async () => {
    const storage = makeFakeStorage();
    const prisma = makeFakePrisma([resumeField]);
    const service = new SubmissionsService(prisma, storage);

    await expect(
      service.createForSlugMultipart(
        'test-form',
        {},
        [
          savedRef({ fieldName: 'resume', storageKey: 'key-valid' }),
          savedRef({ fieldName: 'ghost', storageKey: 'key-invalid' }),
        ],
        {},
      ),
    ).rejects.toThrow(ValidationError);

    // Both pre-saved keys must be deleted by the catch-block rollback.
    expect(storage.deletedKeys).toContain('key-valid');
    expect(storage.deletedKeys).toContain('key-invalid');
  });

  it('accepts a valid file for a declared file field without error', async () => {
    const storage = makeFakeStorage();
    const prisma = makeFakePrisma([resumeField]);
    const service = new SubmissionsService(prisma, storage);

    const result = await service.createForSlugMultipart(
      'test-form',
      {},
      [savedRef({ fieldName: 'resume', storageKey: 'key-resume' })],
      {},
    );

    expect(result).toHaveProperty('id');
    // No rollback deletions — the file should be kept.
    expect(storage.deletedKeys).toHaveLength(0);
  });
});
