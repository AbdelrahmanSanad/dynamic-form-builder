import { z } from 'zod';
import { formSchemaArray } from './form-fields.js';

export const createFormBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional(),
  schema: formSchemaArray.default([]),
});

export const updateFormBodySchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).nullable(),
    schema: formSchemaArray,
  })
  .partial();

export const formIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const formStatusSchema = z.enum(['DRAFT', 'PUBLISHED']);

/** Full form representation returned to the owner. */
export const formSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: formStatusSchema,
  slug: z.string(),
  schema: formSchemaArray,
  publishedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/** Lightweight representation for list views, with a submission count. */
export const formSummarySchema = formSchema
  .omit({ schema: true })
  .extend({ submissionCount: z.number().int().nonnegative() });

export const formListSchema = z.object({
  forms: z.array(formSummarySchema),
});

export type CreateFormBody = z.infer<typeof createFormBodySchema>;
export type UpdateFormBody = z.infer<typeof updateFormBodySchema>;
export type FormDto = z.infer<typeof formSchema>;
export type FormSummaryDto = z.infer<typeof formSummarySchema>;
