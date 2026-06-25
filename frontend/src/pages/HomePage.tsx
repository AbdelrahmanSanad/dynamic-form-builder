import { Navigate } from 'react-router-dom';
import { PublicFormsList } from '../components/PublicFormsList';
import { PublicNavbar } from '../components/PublicNavbar';
import { Spinner } from '../components/ui';
import { useAuth } from '../hooks/useAuth';

/**
 * Public landing page. Unauthenticated visitors see a navbar and the list of
 * published forms; authenticated users are sent straight to their dashboard.
 */
export function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Spinner label="Loading…" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Discover and fill out published forms
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Browse the forms below, or sign in to build your own.
          </p>
        </section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Published forms</h2>
        <PublicFormsList />
      </main>
    </div>
  );
}
