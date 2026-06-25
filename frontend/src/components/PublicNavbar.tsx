import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from './ThemeToggle';

/** Navigation bar for public, unauthenticated pages (home + browse). */
export function PublicNavbar() {
  const { user } = useAuth();

  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-slate-900 dark:text-white">
            Form Builder
          </Link>
          <Link
            to="/browse"
            className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            Browse forms
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            to={user ? '/dashboard' : '/login'}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {user ? 'Dashboard' : 'Sign in'}
          </Link>
        </div>
      </div>
    </header>
  );
}
