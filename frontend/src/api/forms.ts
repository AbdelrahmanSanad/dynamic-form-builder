import type { FormField } from '../lib/form-fields';
import type { Form, FormSummary } from '../types';
import { api, request } from './client';

export interface FormInput {
  title: string;
  description?: string;
  schema: FormField[];
}

export const formsApi = {
  list: () => request<{ forms: FormSummary[] }>(api.get('/forms')).then((r) => r.forms),

  get: (id: string) => request<Form>(api.get(`/forms/${id}`)),

  create: (input: FormInput) => request<Form>(api.post('/forms', input)),

  update: (id: string, input: Partial<FormInput>) => request<Form>(api.patch(`/forms/${id}`, input)),

  remove: (id: string) => request<void>(api.delete(`/forms/${id}`)),

  publish: (id: string) => request<Form>(api.post(`/forms/${id}/publish`)),

  unpublish: (id: string) => request<Form>(api.post(`/forms/${id}/unpublish`)),
};
