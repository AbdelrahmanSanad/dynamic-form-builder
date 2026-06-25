# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A full-stack Dynamic Form Builder split into two independent packages: a Fastify
+ TypeScript API (`backend/`) and a React + TypeScript SPA (`frontend/`). There
is **no monorepo tooling** — each folder has its own `package.json`, lockfile,
and is installed/built separately.

## Commands

Run these from inside the relevant package directory.

### Backend (`backend/`)

```bash
npm run dev               # tsx watch — dev server on :4000 with pino-pretty logs
npm run build             # tsup -> dist/ (ESM, Node 20)
npm start                 # run the built server
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm test                  # vitest run (all tests)
npx vitest run test/form-fields.test.ts            # a single test file
npx vitest -t "rejects duplicate field names"      # a single test by name
npm run prisma:migrate    # prisma migrate dev (create + apply a migration)
npm run prisma:deploy     # prisma migrate deploy (apply in prod/CI)
npm run db:seed           # seed demo user + sample form
```

### Frontend (`frontend/`)

```bash
npm run dev               # vite dev server on :5173 (proxies /api -> :4000)
npm run build             # tsc -b && vite build
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
```

### Whole stack

```bash
docker compose up --build         # db + api + web (app on :8080, api on :4000)
docker compose exec api npm run db:seed
```

The API container runs `prisma migrate deploy` automatically on startup (see
`backend/Dockerfile` CMD).

## The central abstraction: the dynamic field model

This is the most important thing to understand before changing either package.

A form's fields are **not** database columns — they are a JSON array of field
definitions stored in `Form.schema` (JSONB). That same array is the single
source of truth used in three places:

1. **Builder UI** (`frontend/src/components/FieldEditor.tsx`) edits the array.
2. **Renderer** (`frontend/src/components/DynamicForm.tsx`) renders inputs from it.
3. **Validation** — `buildSubmissionSchema(fields)` compiles the array into a Zod
   object schema. This function exists **twice and must stay in sync**:
   - `backend/src/modules/forms/form-fields.ts` — authoritative, runs on submit.
   - `frontend/src/lib/form-fields.ts` — mirror, for instant client feedback.

**When you add or change a field type, you must update both copies** (the
`FIELD_TYPES` list, the field schema, and the `buildSubmissionSchema` switch) or
client and server validation will diverge. The backend is always authoritative:
on `POST .../submissions`, the server rebuilds the validator from the stored form
schema, `.strip()`s unknown keys, and rejects invalid input with a `422`.

## Backend architecture

`buildApp()` in `src/app.ts` composes everything and is exported separately from
`server.ts` so tests can import the app without starting a listener.

- **Modular, not layered globally.** Each feature lives in `src/modules/<name>/`
  with `.routes.ts` (HTTP + schema), `.service.ts` (business logic), and
  `.schemas.ts` (Zod). Services are plain classes constructed with `app.prisma`;
  they throw domain errors and know nothing about HTTP.
- **Plugins** (`src/plugins/`, wrapped in `fastify-plugin`) provide cross-cutting
  concerns and decorate the instance: `prisma` (`app.prisma`), `auth`
  (`app.authenticate`, `app.issueAuthCookie`, `app.clearAuthCookie`), `security`
  (helmet/cors/rate-limit/sensible), `swagger` (dev-only `/docs`), and
  `error-handler`.
- **Validation/serialization** use Zod via `fastify-type-provider-zod`. Routes
  are registered through `app.withTypeProvider<ZodTypeProvider>()` and declare
  `schema: { body, params, querystring, response }` with Zod schemas. Do **not**
  hand-write JSON Schema.
- **Errors** are centralized. Services throw the classes in `src/lib/errors.ts`
  (`NotFoundError`, `ForbiddenError`, etc.). The `error-handler` plugin maps
  those, Zod validation failures, and known Prisma errors (`P2002`→409,
  `P2025`→404) to a consistent `{ error: { statusCode, code, message, details } }`
  envelope. Throw a domain error rather than calling `reply.status().send()` for
  failures.
- **Auth model:** JWT is signed and set as an httpOnly `access_token` cookie.
  Protect routes with `onRequest: [app.authenticate]` (or
  `router.addHook('onRequest', app.authenticate)` for a whole module); the
  payload is `{ sub, email }` available as `request.user`.
- **Ownership:** owner-scoped services load the resource and assert
  `ownerId === request.user.sub`, throwing `NotFoundError`/`ForbiddenError`.
  Preserve this pattern for any new owned resource.

### Route map

- `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`
- `GET/POST /api/forms`, `GET/PATCH/DELETE /api/forms/:id`,
  `POST /api/forms/:id/{publish,unpublish}` — all authenticated, owner-scoped
- `GET /api/forms/:formId/submissions[/:id]` — authenticated, owner-scoped
- `GET /api/public/forms/:slug`, `POST /api/public/forms/:slug/submissions` —
  anonymous; only `PUBLISHED` forms resolve; submission intake is rate-limited
- `GET /health` — liveness + DB ping

## Frontend architecture

- **Server state** is owned by TanStack Query; there is no other global store.
  `useAuth` (`src/hooks/useAuth.tsx`) wraps the `['auth','me']` query and exposes
  `login`/`register`/`logout` mutations. Auth state is derived from that query,
  not stored separately.
- **API layer** (`src/api/`) is thin typed wrappers over a shared axios instance
  (`client.ts`) with `withCredentials: true` so the cookie flows. All calls go
  through `request()`, which unwraps `response.data` and rethrows a typed
  `ApiError`. Surface errors by checking `instanceof ApiError`.
- **Routing** (`src/App.tsx`): public routes (`/login`, `/register`, `/f/:slug`)
  vs. authenticated routes nested under `<ProtectedRoute>` + `<Layout>`.
- **Forms** use React Hook Form with `zodResolver`. Form-shaped validation Zod
  schemas live next to the page or in `lib/form-fields.ts`.

### Frontend Architecture Standards

#### API Layer

- Use **Axios** as the only HTTP client. Never call `fetch()` directly.
- Create reusable API modules inside `src/api/`.
- All API requests must go through the shared Axios instance.

#### Server State

- Use **TanStack Query** for all server state and caching. Do not duplicate server state in React state.
- Use mutations for create, update, and delete operations.
- Configure proper query keys and cache invalidation. Avoid unnecessary refetches.

#### Component Architecture

- **One component per file** — never declare more than one React component in the same file.
- Components should follow the Single Responsibility Principle.
- Prefer composition over large, complex components.
- Keep components focused on rendering; move business logic into hooks and API logic into `src/api/`.

#### Component Size

- A component must not exceed **150 lines**. If it grows beyond this, split it into smaller reusable components.
- Extract reusable UI into shared components whenever appropriate.

#### State Management

- Prefer local state whenever possible.
- If a component contains more than **5 independent state variables**, extract state management into a custom hook.
- Custom hooks encapsulate business logic, side effects, and derived state to improve readability and testability.

#### Code Organization

```
components/   reusable UI components
pages/        route-level components
hooks/        reusable custom hooks
api/          Axios clients and API functions
types/        shared TypeScript types
utils/        helper functions
constants/    application constants
```

#### Performance

- Memoize expensive computations with `useMemo` only when there is a measurable benefit.
- Memoize callbacks with `useCallback` only when required (e.g., passed to memoized children).
- Avoid premature optimization.

#### Forms

- Use **React Hook Form** for all forms.
- Use **Zod** as the single source of truth for validation via `zodResolver`.
- Never manage large forms with multiple `useState` hooks.

## Conventions

- Both packages are ESM (`"type": "module"`) with strict TypeScript, including
  `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` — index access can
  be `undefined`, and optional props can't be set to `undefined` explicitly.
- `consistent-type-imports` is enforced: use `import type { ... }`.
- The backend builds with **tsup** (not `tsc`), so relative imports use `.js`
  extensions (NodeNext-style) even though sources are `.ts`. Match the existing
  imports when adding files.
- After changing `prisma/schema.prisma`, run `npm run prisma:migrate` (which also
  regenerates the client); `prisma generate` runs on `postinstall`.
- The demo seed credentials are `demo@example.com` / `password123`.
