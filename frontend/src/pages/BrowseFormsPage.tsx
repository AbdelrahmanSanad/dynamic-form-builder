import { PublicFormsList } from '../components/PublicFormsList';
import { PublicNavbar } from '../components/PublicNavbar';

/** Public directory of all published forms. */
export function BrowseFormsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <PublicNavbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">Browse forms</h1>
        <PublicFormsList />
      </main>
    </div>
  );
}
