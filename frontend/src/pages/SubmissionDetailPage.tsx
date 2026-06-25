import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { submissionsApi } from '../api/submissions';
import { ApiError } from '../api/client';
import { AnswerRow } from '../components/AnswerRow';
import { Card, Spinner } from '../components/ui';

export function SubmissionDetailPage() {
  const { id, submissionId } = useParams<{ id: string; submissionId: string }>();

  const formQuery = useQuery({
    queryKey: ['forms', id],
    queryFn: () => formsApi.get(id!),
    enabled: id != null,
  });

  const submissionQuery = useQuery({
    queryKey: ['submissions', id, submissionId],
    queryFn: () => submissionsApi.get(id!, submissionId!),
    // Only fetch after the form is confirmed accessible (avoids a wasted 404 on non-owner).
    enabled: formQuery.isSuccess && submissionId != null,
  });

  if (!id || !submissionId) return null;

  const isLoading = formQuery.isLoading || submissionQuery.isLoading;
  const queryError = formQuery.error ?? submissionQuery.error;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (queryError) {
    const isExpected =
      queryError instanceof ApiError &&
      (queryError.status === 403 || queryError.status === 404);
    return (
      <Card className="mx-auto max-w-lg p-10 text-center">
        <p className="mb-4 text-slate-700">
          {isExpected
            ? 'Submission not found or access denied.'
            : 'Failed to load submission.'}
        </p>
        <Link to={`/forms/${id}/submissions`} className="text-indigo-600 hover:underline">
          ← Back to submissions
        </Link>
      </Card>
    );
  }

  const form = formQuery.data;
  const submission = submissionQuery.data;

  if (!form || !submission) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          to={`/forms/${id}/submissions`}
          className="text-sm text-indigo-600 hover:underline"
        >
          ← Back to submissions
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{form.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Submitted at: {new Date(submission.createdAt).toLocaleString()}
        </p>
      </div>

      <Card className="px-6 py-4">
        <dl className="divide-y divide-slate-100">
          {form.schema.map((field) => (
            <AnswerRow
              key={field.id}
              field={field}
              value={submission.data[field.name]}
              formId={id}
              submissionId={submissionId}
            />
          ))}
          {form.schema.length === 0 && (
            <p className="py-4 text-center text-slate-500">No fields in this form.</p>
          )}
        </dl>
      </Card>
    </div>
  );
}
