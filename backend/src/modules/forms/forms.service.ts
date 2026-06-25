import type { Form, Prisma, PrismaClient } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import { formSchemaArray, type FormSchema } from './form-fields.js';
import type {
  CreateFormBody,
  FormDto,
  FormSummaryDto,
  UpdateFormBody,
} from './forms.schemas.js';

// URL-safe, lowercase, no ambiguous characters.
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

/**
 * Form management use-cases for an authenticated owner. Every read/write is
 * scoped by `ownerId` so users can only ever touch their own forms.
 */
export class FormsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(ownerId: string): Promise<FormSummaryDto[]> {
    const forms = await this.prisma.form.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    });

    return forms.map((form) => ({
      id: form.id,
      title: form.title,
      description: form.description,
      status: form.status,
      slug: form.slug,
      publishedAt: form.publishedAt,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt,
      submissionCount: form._count.submissions,
    }));
  }

  async getOwned(ownerId: string, id: string): Promise<FormDto> {
    const form = await this.requireOwnedForm(ownerId, id);
    return toFormDto(form);
  }

  async create(ownerId: string, input: CreateFormBody): Promise<FormDto> {
    const form = await this.prisma.form.create({
      data: {
        ownerId,
        title: input.title,
        description: input.description ?? null,
        schema: input.schema as Prisma.InputJsonValue,
        slug: this.buildSlug(input.title),
      },
    });
    return toFormDto(form);
  }

  async update(ownerId: string, id: string, input: UpdateFormBody): Promise<FormDto> {
    await this.requireOwnedForm(ownerId, id);

    const data: Prisma.FormUpdateInput = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.schema !== undefined) data.schema = input.schema as Prisma.InputJsonValue;

    const form = await this.prisma.form.update({ where: { id }, data });
    return toFormDto(form);
  }

  async remove(ownerId: string, id: string): Promise<void> {
    await this.requireOwnedForm(ownerId, id);
    await this.prisma.form.delete({ where: { id } });
  }

  async publish(ownerId: string, id: string): Promise<FormDto> {
    const existing = await this.requireOwnedForm(ownerId, id);
    if (existing.status === 'PUBLISHED') {
      return toFormDto(existing);
    }
    const form = await this.prisma.form.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return toFormDto(form);
  }

  async unpublish(ownerId: string, id: string): Promise<FormDto> {
    await this.requireOwnedForm(ownerId, id);
    const form = await this.prisma.form.update({
      where: { id },
      data: { status: 'DRAFT' },
    });
    return toFormDto(form);
  }

  /** Loads a form and asserts the caller owns it; throws 404/403 otherwise. */
  private async requireOwnedForm(ownerId: string, id: string): Promise<Form> {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) {
      throw new NotFoundError('Form not found');
    }
    if (form.ownerId !== ownerId) {
      throw new ForbiddenError();
    }
    return form;
  }

  private buildSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
    return `${base || 'form'}-${nanoid()}`;
  }
}

/** Parses the stored JSON field definitions back into the typed model. */
export function parseFormSchema(raw: Prisma.JsonValue): FormSchema {
  return formSchemaArray.parse(raw);
}

function toFormDto(form: Form): FormDto {
  return {
    id: form.id,
    title: form.title,
    description: form.description,
    status: form.status,
    slug: form.slug,
    schema: parseFormSchema(form.schema),
    publishedAt: form.publishedAt,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
  };
}
