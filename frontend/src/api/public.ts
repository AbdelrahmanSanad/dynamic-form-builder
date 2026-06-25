import type { FormField } from '../lib/form-fields';
import type { PublicForm, PublicFormSummary } from '../types';
import { api, request, toApiError } from './client';

export const publicApi = {
  listForms: () =>
    request<{ forms: PublicFormSummary[] }>(api.get('/public/forms')).then((r) => r.forms),

  getForm: (slug: string) => request<PublicForm>(api.get(`/public/forms/${slug}`)),

  submit: (
    slug: string,
    fields: FormField[],
    values: Record<string, unknown>,
    onUploadProgress?: (percent: number) => void,
  ) => {
    const hasFile = fields.some((f) => f.type === 'file');
    if (hasFile) {
      return submitMultipart(slug, fields, values, onUploadProgress);
    }
    return request<{ id: string; message: string }>(api.post(`/public/forms/${slug}/submissions`, values));
  },
};

async function submitMultipart(
  slug: string,
  fields: FormField[],
  values: Record<string, unknown>,
  onUploadProgress?: (percent: number) => void,
): Promise<{ id: string; message: string }> {
  const formData = new FormData();

  for (const field of fields) {
    const value = values[field.name];
    if (value === undefined || value === null) continue;

    if (field.type === 'file') {
      if (Array.isArray(value)) {
        for (const file of value as File[]) {
          formData.append(field.name, file);
        }
      } else {
        formData.append(field.name, value as File);
      }
    } else if (Array.isArray(value)) {
      // checkboxes and other multi-value fields
      for (const item of value as unknown[]) {
        formData.append(field.name, String(item));
      }
    } else {
      formData.append(field.name, String(value));
    }
  }

  try {
    const config = onUploadProgress
      ? { onUploadProgress: (e: { loaded: number; total?: number }) => {
          if (e.total) onUploadProgress(Math.round((e.loaded / e.total) * 100));
        }}
      : {};
    const { data } = await api.post<{ id: string; message: string }>(
      `/public/forms/${slug}/submissions`,
      formData,
      config,
    );
    return data;
  } catch (error) {
    throw toApiError(error);
  }
}
