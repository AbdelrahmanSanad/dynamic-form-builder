import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BrowseFormsPage } from './pages/BrowseFormsPage';
import { DashboardPage } from './pages/DashboardPage';
import { HomePage } from './pages/HomePage';
import { FormBuilderPage } from './pages/FormBuilderPage';
import { FormSubmissionsPage } from './pages/FormSubmissionsPage';
import { SubmissionDetailPage } from './pages/SubmissionDetailPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicFormPage } from './pages/PublicFormPage';
import { RegisterPage } from './pages/RegisterPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/browse" element={<BrowseFormsPage />} />
      <Route path="/f/:slug" element={<PublicFormPage />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/forms/new" element={<FormBuilderPage />} />
          <Route path="/forms/:id/edit" element={<FormBuilderPage />} />
          <Route path="/forms/:id/submissions" element={<FormSubmissionsPage />} />
          <Route path="/forms/:id/submissions/:submissionId" element={<SubmissionDetailPage />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
