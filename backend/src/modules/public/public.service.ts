import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../lib/errors.js';
import { parseFormSchema } from '../forms/forms.service.js';
import type { PublicFormDto, PublishedFormSummaryDto } from './public.schemas.js';

/** Read access to published forms for anonymous visitors. */
export class PublicService {
  constructor(private readonly prisma: PrismaClient) {}

  async listPublishedForms(): Promise<PublishedFormSummaryDto[]> {
    const forms = await this.prisma.form.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: 100,
      select: { title: true, description: true, slug: true, publishedAt: true },
    });
    return forms.map((f) => ({
      title: f.title,
      description: f.description,
      slug: f.slug,
      publishedAt: f.publishedAt?.toISOString() ?? null,
    }));
  }

  async getPublishedForm(slug: string): Promise<PublicFormDto> {
    const form = await this.prisma.form.findUnique({ where: { slug } });
    if (!form || form.status !== 'PUBLISHED') {
      throw new NotFoundError('Form not found');
    }
    return {
      title: form.title,
      description: form.description,
      slug: form.slug,
      schema: parseFormSchema(form.schema),
    };
  }
}
