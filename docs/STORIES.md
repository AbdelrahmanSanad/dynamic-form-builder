# Stories — Detailed Specifications

Per-Story specs for the [Implementation Plan](./IMPLEMENTATION_PLAN.md). Each
Story lists Goal, Backend tasks, Frontend tasks, Database changes, API endpoints,
Validation, Dependencies, and Acceptance Criteria.

Before implementation, every Story passes the **Architecture Gate** (`architect`
agent), which turns the spec below into an approved plan under
[`architecture/`](./architecture/) — see the
[delivery workflow](./IMPLEMENTATION_PLAN.md#delivery-workflow). The gate reads
these specs but never edits them.

Status is tracked in the Backlog table of the Implementation Plan, **not** here.
Stories S-01 … S-10 are already delivered by the initial scaffold and are
documented compactly; S-11 onward are the active backlog and are specified in
full.

---

## S-01 — Backend app skeleton & config  _(✅ delivered)_

**Goal:** A composable Fastify app with validated config and hardening.
**Backend:** `buildApp()` (plugins + modules), `server.ts` with graceful
shutdown, Zod-validated `config/env.ts`, plugins for security (helmet/CORS/rate-
limit/sensible), Swagger (dev), central error handler, domain error classes.
**Frontend:** —. **DB:** —. **API:** `GET /health`.
**Validation:** env fails fast on bad/missing vars.
**Dependencies:** none.
**Acceptance Criteria:** server boots; `/health` returns `ok`; invalid env exits
non-zero; `npm run typecheck && npm test` pass.

## S-02 — Database schema & migrations  _(✅ delivered)_

**Goal:** Persistent data layer.
**Backend:** Prisma client plugin (`app.prisma`), connection lifecycle.
**DB:** `User`, `Form` (JSONB `schema`, unique `slug`, `status`), `Submission`
(JSONB `data`/`metadata`); initial migration + `migration_lock.toml`; seed.
**API:** —. **Validation:** —.
**Dependencies:** S-01.
**Acceptance Criteria:** `prisma migrate deploy` creates all tables; seed inserts
demo data; `/health` DB ping succeeds.

## S-03 — Authentication  _(✅ delivered)_

**Goal:** Account creation and sessions.
**Backend:** `auth` plugin (JWT + cookie helpers, `app.authenticate`),
`AuthService` (argon2id hash, constant-ish-time login), routes.
**Frontend:** —. **DB:** uses `User`.
**API:** `POST /api/auth/register|login|logout`, `GET /api/auth/me`.
**Validation:** email format, password ≥ 8; duplicate email → 409; bad creds →
401 (no user enumeration).
**Dependencies:** S-02.
**Acceptance Criteria:** register/login set an httpOnly cookie; `/me` returns the
user; logout clears the cookie.

## S-04 — Frontend skeleton & auth UI  _(✅ delivered)_

**Goal:** SPA shell with auth.
**Frontend:** Vite + React + TS, router, TanStack Query, Tailwind, axios client
(`withCredentials`), `useAuth`, `ProtectedRoute`, `Layout`, login/register pages.
**Backend:** —. **DB:** —. **API:** consumes auth endpoints.
**Validation:** client-side RHF + Zod on auth forms.
**Dependencies:** S-03.
**Acceptance Criteria:** unauthenticated users are redirected to login;
successful login lands on the dashboard; refresh keeps the session.

## S-05 — Dockerized stack & verification tooling  _(✅ delivered)_

**Goal:** One-command local run + repeatable checks.
**Backend/Frontend:** multi-stage Dockerfiles; nginx serves SPA and proxies
`/api`. **Infra:** `docker-compose.yml` (db + api + web); `.claude` commands
`/verify-all`, `/e2e-smoke`, `/dev-up`.
**Dependencies:** S-01.
**Acceptance Criteria:** `docker compose up --build` serves app on :8080 and API
on :4000; migrations run on boot; `/e2e-smoke` passes.

## S-06 — Form CRUD API & dashboard  _(✅ delivered)_

**Goal:** Create, list, rename, delete forms (owner-scoped).
**Backend:** `FormsService` + routes (ownership enforced via `requireOwnedForm`).
**Frontend:** dashboard list with create/edit/delete; rename via the builder
title field. **DB:** `Form`.
**API:** `GET/POST /api/forms`, `GET/PATCH/DELETE /api/forms/:id`.
**Validation:** title required; only the owner may read/mutate (else 403/404).
**Dependencies:** S-04.
**Acceptance Criteria:** CRUD works end to end; another user cannot access a
form; deleting a form removes its submissions (cascade).

## S-07 — Form builder & base question types  _(✅ delivered)_

**Goal:** Build forms with Text and Multiple Choice questions.
**Backend:** field model + `buildSubmissionSchema` in `forms/form-fields.ts`
(types: text, textarea, email, number, date, select, radio, checkbox,
checkboxes). **Frontend:** `FieldEditor` (add/edit/delete/**reorder**, required,
options editor), mirrored `lib/form-fields.ts`, `DynamicForm` renderer.
**DB:** fields stored in `Form.schema` JSONB.
**API:** via S-06 update endpoint.
**Validation:** field `name` is a unique identifier; choice types require ≥1
option; both mirrors stay in sync (`/mirror-check`).
**Dependencies:** S-06.
**Acceptance Criteria:** questions can be added/edited/removed/reordered and
marked required; saved schema round-trips; mirrors in sync.

## S-08 — Publishing & unique public URL  _(✅ delivered)_

**Goal:** Toggle Draft/Published; published forms get a public URL.
**Backend:** publish/unpublish endpoints set `status` + `publishedAt`; unguessable
`slug`. **Frontend:** publish/unpublish on dashboard; "view public form" link.
**DB:** `Form.status`, `Form.slug`, `Form.publishedAt`.
**API:** `POST /api/forms/:id/publish|unpublish`.
**Validation:** only the owner toggles; only `PUBLISHED` forms are publicly
resolvable.
**Dependencies:** S-06.
**Acceptance Criteria:** publishing exposes `/f/:slug`; unpublishing hides it.

## S-09 — Public form page & submission  _(✅ delivered)_

**Goal:** Anonymous users view and submit a published form.
**Backend:** public read by slug; submission intake re-validated against the
stored schema, unknown keys stripped; metadata (ip/UA) captured; tighter rate
limit. **Frontend:** `/f/:slug` renders via `DynamicForm`, success state.
**DB:** `Submission`.
**API:** `GET /api/public/forms/:slug`, `POST /api/public/forms/:slug/submissions`.
**Validation:** required fields enforced **server-side** (authoritative) and
client-side; invalid → 422; unpublished/missing → 404.
**Dependencies:** S-08.
**Acceptance Criteria:** valid submission → 201 and is stored stripped of unknown
keys; invalid → 422; submitting to an unpublished form → 404.

## S-10 — Submissions dashboard (summary list)  _(✅ delivered)_

**Goal:** Owners see all submissions for a form.
**Backend:** paginated, owner-scoped list. **Frontend:** table of submissions per
form (columns from the form schema), pagination.
**API:** `GET /api/forms/:formId/submissions?page&pageSize`.
**Validation:** owner-only; pagination bounds.
**Dependencies:** S-09.
**Acceptance Criteria:** submissions appear newest-first with working pagination;
non-owners get 403/404.

---

## S-11 — File upload: backend  _(⬜ TODO — first incomplete)_

**Goal:** Support a **File Upload** question type end-to-end on the server:
accept uploaded files on public submission, store them safely, persist a
reference in the submission, and let the form owner download them.

**Backend tasks:**
- Add `@fastify/multipart`; register with sensible limits (e.g. 5 MB/file, max
  files per request) in a plugin.
- Add `file` (and optionally `files`) to the field model `FIELD_TYPES` in
  `backend/src/modules/forms/form-fields.ts`; extend the field schema with
  per-field constraints (`accept`/allowed MIME types, `maxSizeBytes`,
  `maxFiles`). In `buildSubmissionSchema`, a file answer validates as a
  **reference object** `{ storageKey, filename, mimeType, size }` (or array),
  not raw bytes.
- Introduce a storage abstraction (`StorageService`) with a local-disk
  implementation writing to an `uploads/` dir keyed by a random `storageKey`;
  keep the interface swappable for S3-style storage in deployment.
- Submission flow: parse multipart, validate each file against the target
  field's constraints, persist via storage, and store only references in
  `Submission.data`. Reject if a required file field has no file.
- Owner-scoped download endpoint that streams a stored file with correct
  `Content-Type`/`Content-Disposition`, after verifying the caller owns the form
  that owns the submission.
- Update `config/env.ts` with upload settings (dir/limits) and document them.

**Frontend tasks:** none (covered by S-12). Keep the renderer unchanged this
Story.

**Database changes:** none — references live in existing `Submission.data`
JSONB. (No new tables; storage is filesystem/object-store.)

**API endpoints:**
- `POST /api/public/forms/:slug/submissions` — extended to accept
  `multipart/form-data` (fields + files) in addition to JSON.
- `GET /api/forms/:formId/submissions/:id/files/:storageKey` — owner-only file
  download.

**Validation requirements:**
- Enforce per-field allowed MIME types and max size **server-side**; reject
  oversize/disallowed with 422 and a clear message.
- Required file field missing → 422.
- Sanitize/ignore client-supplied filenames for storage paths (never use them as
  the on-disk path); store the original name only as metadata.
- Download route authorizes by form ownership; unknown `storageKey` → 404.

**Dependencies:** S-07 (field model), S-09 (submission flow).

**Acceptance Criteria:**
- A form containing a required `file` field rejects a submission with no file
  (422) and accepts one with a valid file (201), storing a reference object.
- Disallowed type / oversize file → 422 with reason.
- The form owner can download the exact uploaded bytes; a non-owner cannot.
- `/mirror-check` notes the new type (frontend mirror updated in S-12 — call out
  the pending frontend touchpoints).
- Backend `typecheck`, `lint`, `test` pass; new unit tests cover file-field
  validation and the storage reference shape.

## S-12 — File upload: frontend  _(⬜ TODO)_

**Goal:** Configure file questions in the builder and let respondents upload
files on the public form.

**Backend tasks:** none.

**Frontend tasks:**
- Mirror the `file` type in `frontend/src/lib/form-fields.ts` (`FIELD_TYPES`,
  label, schema with `accept`/`maxSizeBytes`/`maxFiles`, `buildSubmissionSchema`
  arm, `defaultValueForField`).
- `FieldEditor`: configure a file field (allowed types, max size, required).
- `DynamicForm`: render a file input (with client-side type/size checks and
  selected-file UI); collect `File` objects.
- Public submission path: when a form has file fields, submit as
  `multipart/form-data` via the `api/` layer (extend `public.ts`); otherwise keep
  JSON. Show upload progress/errors.

**Database changes:** none.
**API endpoints:** consumes the multipart endpoint from S-11.

**Validation requirements:**
- Client-side enforce the same allowed types/size as the server (server remains
  authoritative); show inline errors.
- Required file field blocks submit until a file is chosen.

**Dependencies:** S-11.

**Acceptance Criteria:**
- Builder can add/configure a file question; preview renders a file input.
- A respondent can attach a valid file and submit successfully; invalid files are
  rejected client-side with a clear message and never reach the server.
- `/mirror-check` reports **in sync**; frontend `typecheck`, `lint`, `build`
  pass; `/e2e-smoke` still passes for non-file forms.

## S-13 — Submission detail view  _(⬜ TODO)_

**Goal:** Owners open an individual submission to see the full set of answers and
access uploaded files.

**Backend tasks:** ensure `GET /api/forms/:formId/submissions/:id` returns the
full answer set (already present) and that file references include enough to build
download URLs; add tests for the owner check.

**Frontend tasks:**
- New route/page `'/forms/:id/submissions/:submissionId'` rendering each
  question label with its answer, formatted by type (text, choice → labels,
  checkboxes → list, file → download link(s) to the S-11 download route).
- Link each row in the submissions dashboard (S-10) to its detail page.
- Handle not-found/unauthorized gracefully.

**Database changes:** none.
**API endpoints:** `GET /api/forms/:formId/submissions/:id` (existing);
file download from S-11.

**Validation requirements:** owner-only; unknown submission → 404.

**Dependencies:** S-10, S-11.

**Acceptance Criteria:**
- Clicking a submission opens a detail view showing every field’s answer in a
  readable format.
- File answers render as working download links restricted to the owner.
- Non-owners cannot open the detail or download files (403/404).
- Frontend `typecheck`, `lint`, `build` pass.

## S-14 — Conditional logic: shared rule schema + evaluator  _(⬜ TODO, Bonus)_

**Goal:** Define the nested rule model and a pure evaluator used by both server
enforcement and client rendering.

**Backend tasks:**
- In `forms/form-fields.ts`, add a Zod **discriminated union** for the rule tree:
  a **group** `{ combinator: 'AND'|'OR'|'NOT', rules: Rule[] }` (NOT takes one
  child) supporting arbitrary nesting, and a **condition**
  `{ fieldName, operator, value? }`.
- Define an **operator catalog** keyed by question type (text:
  equals/notEquals/contains/startsWith/isEmpty…; choice:
  includes/notIncludes/equals/isAnyOf…; file: isPresent/isAbsent; number:
  eq/gt/lt…). This catalog is the single authority for valid operators per type.
- Implement `evaluate(rule, answers): boolean` — pure, recursive, total (handles
  missing answers safely). Add an optional `visibility?: Rule` to the field
  schema (default: always visible).
- Add a `validateRuleReferences(fields)` helper: a field’s rule may only
  reference **earlier** fields and legal operators for the target type.

**Frontend tasks:** mirror the schema, operator catalog, and `evaluate` in
`frontend/src/lib/form-fields.ts` (no UI yet).

**Database changes:** none — rules ride inside `Form.schema` JSONB.
**API endpoints:** none new (rules persist via the form update endpoint).

**Validation requirements:**
- Reject forms whose rules reference unknown/forward fields or use an operator
  illegal for the target type.

**Dependencies:** S-07.

**Acceptance Criteria:**
- Unit tests cover deep nesting, `NOT`, every operator, and missing-answer cases.
- `/mirror-check` reports the rule model in sync across both files.
- Backend `typecheck`, `lint`, `test` pass.

## S-15 — Conditional logic: server-side enforcement  _(⬜ TODO, Bonus)_

**Goal:** Apply visibility rules authoritatively when validating a submission.

**Backend tasks:**
- In the submission path, compute each field’s visibility with `evaluate`
  against the submitted answers. For a field that resolves **hidden**: do not
  enforce `required`, and strip/ignore any answer provided for it.
- Ensure evaluation order handles dependencies (rules reference earlier fields).
- Add tests: hidden required field is not enforced; answers to hidden fields are
  dropped; visible required still enforced.

**Frontend tasks:** none.
**Database changes:** none.
**API endpoints:** `POST /api/public/forms/:slug/submissions` (behavior change).

**Validation requirements:** server is the source of truth for visibility;
never trust client-reported visibility.

**Dependencies:** S-14, S-09.

**Acceptance Criteria:**
- Submitting a form where a required field is hidden by rules succeeds without
  that field; its answer (if smuggled in) is not stored.
- Visible required fields still reject when missing (422).
- Backend `typecheck`, `lint`, `test` pass.

## S-16 — Conditional logic: runtime visibility in public form  _(⬜ TODO, Bonus)_

**Goal:** Show/hide questions live on the public form as answers change.

**Backend tasks:** none.
**Frontend tasks:**
- In `DynamicForm`, recompute visibility with the shared `evaluate` on every
  relevant answer change; unmount hidden fields and exclude their values from the
  payload; skip client validation for hidden fields.
- Ensure smooth UX (no flicker; reset values of fields that become hidden).

**Database changes:** none.
**API endpoints:** none.
**Validation requirements:** client visibility must match server logic (same
shared evaluator).

**Dependencies:** S-14, S-09.

**Acceptance Criteria:**
- Toggling a controlling answer shows/hides dependent questions immediately.
- Submitting only sends answers for currently-visible fields, and the result
  agrees with server enforcement (S-15).
- Frontend `typecheck`, `lint`, `build` pass.

## S-17 — Conditional logic: visual rule builder UI  _(⬜ TODO, Bonus)_

**Goal:** Let creators visually construct, nest, and manage rule trees per field.

**Backend tasks:** none.
**Frontend tasks:**
- A `RuleBuilder` component (used in `FieldEditor`) to add/remove/nest AND/OR/NOT
  groups and conditions to arbitrary depth.
- The condition editor’s **operator dropdown is filtered by the target field’s
  type** (driven by the operator catalog), and the value input adapts to the
  type (text input, option picker, none for presence checks).
- Render a **human-readable summary** of the configured logic (e.g. _“Show this
  question if (Country is "SA" AND (Age > 18 OR Consent is checked))”_).
- Prevent selecting forward-referenced fields; surface validation errors from
  S-14’s reference check.

**Database changes:** none.
**API endpoints:** persists via the existing form update endpoint.
**Validation requirements:** UI must not allow illegal operators or
forward/unknown references; mirror server validation messages.

**Dependencies:** S-14, S-07.

**Acceptance Criteria:**
- A creator can build a nested rule tree and see a correct human-readable
  summary; the saved rule round-trips and drives S-16 at runtime.
- Operator options always match the selected target field’s type.
- Frontend `typecheck`, `lint`, `build` pass.

## S-18 — Deployment & README finalization  _(⬜ TODO)_

**Goal:** A live, deployed app and clear delivery docs with the working URL.

**Backend tasks:** production config review — `COOKIE_SECURE=true` behind HTTPS,
`CORS_ORIGIN` set to the deployed web origin, `JWT_SECRET` from the host’s
secrets, `prisma migrate deploy` on release; if using ephemeral file systems,
switch the S-11 storage to an object store (e.g. S3-compatible) via the storage
abstraction.

**Frontend tasks:** point the SPA at the deployed API origin (same-origin `/api`
via the web service’s proxy, or `VITE_API_BASE_URL`); production build.

**Infra/Delivery:**
- Deploy db + api + web to a host (Render/Railway/Fly/AWS). Provision a managed
  Postgres. Configure env/secrets.
- Finalize `README.md`: local setup (already present) **plus** the live URL and
  any demo credentials; note the deployment topology.

**Database changes:** none (managed Postgres provisioning only).
**API endpoints:** none new.
**Validation requirements:** smoke-test the deployed URL end-to-end; confirm
secure cookie + CORS work over HTTPS.

**Dependencies:** S-13 (core features complete).

**Acceptance Criteria:**
- A public URL serves the working app; register → build form → publish → submit
  (incl. file) → review works in production.
- `README.md` contains the live URL and accurate setup instructions.
