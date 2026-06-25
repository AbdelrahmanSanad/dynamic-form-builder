import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { formsApi } from '../api/forms';
import { Badge, Button, Card, Spinner } from '../components/ui';
import type { FormSummary } from '../types';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: forms, isLoading, error } = useQuery({
    queryKey: ['forms'],
    queryFn: formsApi.list,
  });

  const remove = useMutation({
    mutationFn: formsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
  });

  const togglePublish = useMutation({
    mutationFn: (form: FormSummary) =>
      form.status === 'PUBLISHED' ? formsApi.unpublish(form.id) : formsApi.publish(form.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
  });

  if (isLoading) return <Spinner />;
  if (error) return <p className="text-red-600">Failed to load forms.</p>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your forms</h1>
        <Link to="/forms/new">
          <Button>+ New form</Button>
        </Link>
      </div>

      {forms && forms.length === 0 && (
        <Card className="p-10 text-center">
          <p className="text-slate-500">You haven't created any forms yet.</p>
          <Link to="/forms/new" className="mt-3 inline-block">
            <Button>Create your first form</Button>
          </Link>
        </Card>
      )}

      <div className="space-y-3">
        {forms?.map((form) => (
          <Card key={form.id} className="flex items-center justify-between p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate font-semibold text-slate-900 dark:text-white">{form.title}</h2>
                <Badge status={form.status} />
              </div>
              <p className="mt-0.5 text-sm text-slate-500">
                {form.submissionCount} submission{form.submissionCount === 1 ? '' : 's'}
                {form.status === 'PUBLISHED' && (
                  <>
                    {' · '}
                    <a
                      href={`/f/${form.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:underline"
                    >
                      View public form
                    </a>
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => togglePublish.mutate(form)}
                disabled={togglePublish.isPending}
              >
                {form.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
              </Button>
              <Link to={`/forms/${form.id}/submissions`}>
                <Button variant="secondary">Responses</Button>
              </Link>
              <Link to={`/forms/${form.id}/edit`}>
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(`Delete "${form.title}" and all its submissions?`)) {
                    remove.mutate(form.id);
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
