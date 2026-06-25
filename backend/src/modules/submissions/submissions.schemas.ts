import { z } from 'zod';

export const submissionFormParamsSchema = z.object({
  formId: z.string().uuid(),
});

export const submissionIdParamsSchema = z.object({
  formId: z.string().uuid(),
  id: z.string().uuid(),
});

/** Params for the owner-only file download route. */
export const fileDownloadParamsSchema = z.object({
  formId: z.string().uuid(),
  id: z.string().uuid(),
  storageKey: z.string().min(1).max(128),
});

export const submissionListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const submissionSchema = z.object({
  id: z.string().uuid(),
  formId: z.string().uuid(),
  data: z.record(z.unknown()),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
});

export const submissionListSchema = z.object({
  submissions: z.array(submissionSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type SubmissionDto = z.infer<typeof submissionSchema>;
export type SubmissionListQuery = z.infer<typeof submissionListQuerySchema>;
