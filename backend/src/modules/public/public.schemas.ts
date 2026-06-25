import { z } from 'zod';
import { formSchemaArray } from '../forms/form-fields.js';

export const slugParamsSchema = z.object({
  slug: z.string().min(1).max(80),
});

/** Minimal public summary of a published form for directory listings. */
export const publishedFormSummarySchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  publishedAt: z.string().datetime().nullable(),
});

export const publishedFormListSchema = z.object({
  forms: z.array(publishedFormSummarySchema),
});

export type PublishedFormSummaryDto = z.infer<typeof publishedFormSummarySchema>;

/** The minimal, safe representation of a published form for anonymous users. */
export const publicFormSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  schema: formSchemaArray,
});

export const submitResponseSchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
});

export type PublicFormDto = z.infer<typeof publicFormSchema>;
