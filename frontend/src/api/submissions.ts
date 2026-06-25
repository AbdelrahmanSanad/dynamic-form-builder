import type { Submission, SubmissionList } from '../types';
import { api, request } from './client';

export const submissionsApi = {
  list: (formId: string, page = 1, pageSize = 20) =>
    request<SubmissionList>(
      api.get(`/forms/${formId}/submissions`, { params: { page, pageSize } }),
    ),

  get: (formId: string, submissionId: string) =>
    request<Submission>(api.get(`/forms/${formId}/submissions/${submissionId}`)),
};
