import type { FormField } from '../lib/form-fields';

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export type FormStatus = 'DRAFT' | 'PUBLISHED';

export interface FormSummary {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  slug: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  submissionCount: number;
}

export interface Form extends Omit<FormSummary, 'submissionCount'> {
  schema: FormField[];
}

export interface PublicForm {
  title: string;
  description: string | null;
  slug: string;
  schema: FormField[];
}

export interface PublicFormSummary {
  title: string;
  description: string | null;
  slug: string;
  publishedAt: string | null;
}

export interface Submission {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SubmissionList {
  submissions: Submission[];
  pagination: Pagination;
}

export interface FileReference {
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
}

/** Shape of the structured error envelope returned by the API. */
export interface ApiErrorBody {
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
  };
}
