import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError } from '../api/client';
import { publicApi } from '../api/public';
import { DynamicForm } from '../components/DynamicForm';
import { Card, Spinner } from '../components/ui';
import { Alert } from './LoginPage';

export function PublicFormPage() {
  const { slug } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  const { data: form, isLoading, error: loadError } = useQuery({
    queryKey: ['public-form', slug],
    queryFn: () => publicApi.getForm(slug!),
    retry: false,
  });

  const submit = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      publicApi.submit(slug!, form!.schema, data, (pct) => setUploadPercent(pct)),
    onSuccess: () => {
      setSubmitted(true);
      setUploadPercent(null);
    },
    onError: (err) => {
      setUploadPercent(null);
      setError(err instanceof ApiError ? err.message : 'Submission failed. Please try again.');
    },
  });

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900">
      <div className="w-full max-w-xl">
        {isLoading && <Spinner />}

        {loadError && (
          <Card className="p-10 text-center">
            <h1 className="text-xl font-semibold text-slate-900">Form not available</h1>
            <p className="mt-2 text-sm text-slate-500">
              This form may have been unpublished or does not exist.
            </p>
          </Card>
        )}

        {form && submitted && (
          <Card className="p-10 text-center">
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Thank you!</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your response has been recorded.</p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/browse"
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Browse more forms
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                Go to home
              </Link>
            </div>
          </Card>
        )}

        {form && !submitted && (
          <Card className="p-8">
            <h1 className="text-2xl font-bold text-slate-900">{form.title}</h1>
            {form.description && <p className="mt-1 text-sm text-slate-500">{form.description}</p>}
            <div className="mt-6">
              {error && (
                <div className="mb-4">
                  <Alert message={error} />
                </div>
              )}
              {uploadPercent !== null && (
                <div className="mb-4">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${uploadPercent}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Uploading… {uploadPercent}%</p>
                </div>
              )}
              <DynamicForm
                fields={form.schema}
                submitting={submit.isPending}
                onSubmit={(data) => {
                  setError(null);
                  submit.mutate(data);
                }}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
