import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { submissionsApi } from '../api/submissions';
import { Button, Card, Spinner } from '../components/ui';
import type { FormField } from '../lib/form-fields';

export function FormSubmissionsPage() {
  const { id } = useParams();
  const [page, setPage] = useState(1);

  const { data: form } = useQuery({ queryKey: ['forms', id], queryFn: () => formsApi.get(id!) });
  const { data, isLoading, error } = useQuery({
    queryKey: ['submissions', id, page],
    queryFn: () => submissionsApi.list(id!, page),
  });

  const fields: FormField[] = form?.schema ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="text-sm text-indigo-600 hover:underline">
            ← Back to forms
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{form?.title ?? 'Submissions'}</h1>
        </div>
      </div>

      {isLoading && <Spinner />}
      {error && <p className="text-red-600">Failed to load submissions.</p>}

      {data && data.submissions.length === 0 && (
        <Card className="p-10 text-center text-slate-500">No submissions yet.</Card>
      )}

      {data && data.submissions.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Submitted</th>
                {fields.map((f) => (
                  <th key={f.id} className="px-4 py-2 font-medium">
                    {f.label}
                  </th>
                ))}
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data.submissions.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-slate-500">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  {fields.map((f) => (
                    <td key={f.id} className="px-4 py-2 text-slate-700">
                      {formatValue(s.data[f.name])}
                    </td>
                  ))}
                  <td className="px-4 py-2">
                    <Link
                      to={`/forms/${id}/submissions/${s.id}`}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-sm text-slate-500">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
