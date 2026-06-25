import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { publicApi } from '../api/public';
import { Card, Spinner } from './ui';

/** Lists all published forms as clickable cards linking to their public page. */
export function PublicFormsList() {
  const { data: forms, isLoading, error } = useQuery({
    queryKey: ['public-forms-list'],
    queryFn: publicApi.listForms,
  });

  if (isLoading) return <Spinner />;

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">Failed to load forms.</p>;
  }

  if (forms && forms.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-slate-500 dark:text-slate-400">No published forms yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {forms?.map((form) => (
        <Link key={form.slug} to={`/f/${form.slug}`} className="block">
          <Card className="p-5 transition hover:border-indigo-300 hover:shadow-md dark:hover:border-indigo-500">
            <h2 className="font-semibold text-slate-900 dark:text-white">{form.title}</h2>
            {form.description && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{form.description}</p>
            )}
            {form.publishedAt && (
              <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                Published {new Date(form.publishedAt).toLocaleDateString()}
              </p>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
