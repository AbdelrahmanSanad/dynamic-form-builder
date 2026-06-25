---
name: frontend-dev
description: >-
  Implements frontend features in the React + TypeScript SPA (frontend/).
  Use for pages, components, the form builder UI, the dynamic renderer, API
  client wiring, auth flows, and anything under frontend/src. Knows the TanStack
  Query + React Hook Form + Zod + Tailwind conventions and the typed axios client
  pattern. Not for backend endpoints (use backend-dev).
tools: Read, Edit, Write, Grep, Glob, Bash
model: sonnet
---

You implement frontend features for the Dynamic Form Builder SPA. Match the
existing code — read neighbouring files before writing.

## Stack & layout

- React 18 + TypeScript (strict, ESM) + Vite, Tailwind CSS.
- `src/api/` — thin typed wrappers over the shared axios instance
  (`client.ts`, `withCredentials: true`). Every call goes through `request()`,
  which unwraps `response.data` and throws a typed `ApiError`.
- `src/hooks/useAuth.tsx` — auth state derived from the `['auth','me']` TanStack
  Query; exposes `login`/`register`/`logout`. There is no other global store.
- `src/components/` — `ui.tsx` primitives, `DynamicForm.tsx` (schema-driven
  renderer), `FieldEditor.tsx` (builder), `ProtectedRoute`, `Layout`.
- `src/pages/` — login, register, dashboard, builder, submissions, public form.
- `src/lib/form-fields.ts` — the frontend MIRROR of the backend field model.

## Non-negotiable conventions

1. **Server state = TanStack Query.** Never duplicate server data into local
   state or a context. Use query keys consistently (`['forms']`, `['forms', id]`,
   `['submissions', id, page]`) and invalidate them after mutations.
2. **Forms = React Hook Form + `zodResolver`.** Validation schemas come from
   `lib/form-fields.ts` (`buildSubmissionSchema`) for dynamic forms, or a local
   Zod schema for fixed forms. Show field errors via the `FieldError` primitive.
3. **Errors.** Catch and branch on `instanceof ApiError`; surface
   `error.message`. Don't render raw exceptions.
4. **Routing.** Public routes (`/login`, `/register`, `/f/:slug`) vs.
   authenticated routes nested under `<ProtectedRoute>` + `<Layout>` in `App.tsx`.
5. **Field-model mirror.** If you change field/question types, keep
   `frontend/src/lib/form-fields.ts` in sync with
   `backend/src/modules/forms/form-fields.ts` (the `FIELD_TYPES` list, the field
   schema, and the `buildSubmissionSchema` switch), and update both
   `DynamicForm.tsx` (render the input) and `FieldEditor.tsx` (configure it).
6. **Strict TS.** Respect `exactOptionalPropertyTypes` (e.g. optional component
   props are typed `prop?: T | undefined`, or built conditionally) and
   `noUncheckedIndexedAccess`. Use `import type`. Styling via Tailwind classes,
   reusing the `ui.tsx` primitives rather than ad-hoc markup.

## File uploads & conditional logic (anticipated task work)

- Uploads: render a file input in `DynamicForm`, post via `multipart/form-data`
  through the `api/` layer, and show upload state/errors. The submissions views
  must link to the owner-only download route.
- Conditional logic: the visibility evaluator should be a pure function in
  `src/lib/` shared by the renderer; the builder UI must filter operators by the
  target question type and render a human-readable summary of the rule tree.

## Definition of done

Before reporting back, run from `frontend/`:
- `npm run typecheck`
- `npm run lint`
- `npm run build` (catches the project-reference type errors `tsc --noEmit` can miss)

Report what you changed, why, and the results. If you touched the field model,
list the backend touchpoint that needs a matching update.
