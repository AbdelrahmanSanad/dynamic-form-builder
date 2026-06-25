# Dynamic Form Builder

A production-grade dynamic form builder. Authenticated users design forms with a
visual builder, publish them to a public URL, collect submissions from anonymous
visitors, and review responses — all with end-to-end type safety.

- **Backend:** Fastify 5 + TypeScript, Prisma + PostgreSQL, Zod-validated routes,
  JWT auth via httpOnly cookie, modular architecture.
- **Frontend:** React 18 + TypeScript + Vite, TanStack Query, React Hook Form +
  Zod, Tailwind CSS.

The defining feature is that **a form's field definitions are the single source
of truth**: the same JSON schema drives the builder UI, renders the public form,
and is compiled into a Zod validator on both the client (instant feedback) and
the server (authoritative validation) when a submission arrives.

---

## Quick start (Docker)

The fastest way to run the whole stack:

```bash
# from the repository root
docker compose up --build
```

Then open:

- **App:** http://localhost:8080
- **API:** http://localhost:4000
- **API docs (dev):** http://localhost:4000/docs

Migrations run automatically on the API container's first boot. To load a demo
account and a sample published form:

```bash
docker compose exec api npm run db:seed
# Login: demo@example.com / password123
```

---

## Local development (without Docker)

You need Node 20+ and a PostgreSQL 14+ instance.

### Backend

```bash
cd backend
cp .env.example .env          # then edit DATABASE_URL and JWT_SECRET
npm install
npm run prisma:migrate        # create the schema
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:4000
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173 (proxies /api -> :4000)
```

---

## Architecture

```
dynamic-form-builder/
├── backend/                  Fastify API
│   ├── src/
│   │   ├── app.ts            buildApp(): plugins + module registration
│   │   ├── server.ts         entrypoint + graceful shutdown
│   │   ├── config/           Zod-validated environment
│   │   ├── lib/              domain errors
│   │   ├── plugins/          prisma, auth, security, swagger, error-handler
│   │   └── modules/          auth, forms, submissions, public, health
│   │       └── forms/form-fields.ts   the dynamic field model + validator builder
│   └── prisma/               schema + seed
├── frontend/                 React SPA
│   └── src/
│       ├── api/              typed axios clients
│       ├── components/       UI primitives, DynamicForm, FieldEditor
│       ├── hooks/            useAuth (React Query)
│       ├── lib/              form-fields.ts (mirror of the backend model)
│       └── pages/            login, register, dashboard, builder, submissions, public
└── docker-compose.yml        db + api + web
```

See [`CLAUDE.md`](CLAUDE.md) for a deeper architectural reference.

### Data model

- **User** — owns forms.
- **Form** — `title`, `description`, `status` (`DRAFT`/`PUBLISHED`), unguessable
  `slug`, and `schema` (JSONB array of field definitions).
- **Submission** — `data` (JSONB answers) + request `metadata`.

### Request flow for a public submission

1. Visitor loads `GET /api/public/forms/:slug` (only `PUBLISHED` forms resolve).
2. The SPA renders the form and validates input client-side against a Zod schema
   built from the field definitions.
3. `POST /api/public/forms/:slug/submissions` re-validates **authoritatively** on
   the server against the same definitions, strips unknown keys, and stores it.

---

## Security highlights

- Passwords hashed with **argon2id**; login uses constant-time-ish verification
  to limit user enumeration.
- JWT delivered as an **httpOnly, SameSite=Lax cookie** — never exposed to JS.
- Helmet security headers, CORS allow-list with credentials, and rate limiting
  (with a stricter limit on public submission intake).
- Every owner-scoped query is filtered by `ownerId`; cross-tenant access yields
  `403`/`404`.
- Strict TypeScript and Zod validation at every trust boundary.

---

## Useful commands

| Location   | Command                  | Description                   |
| ---------- | ------------------------ | ----------------------------- |
| `backend`  | `npm run dev`            | Run API with reload           |
| `backend`  | `npm test`               | Run unit tests (Vitest)       |
| `backend`  | `npm run typecheck`      | Type-check without emitting   |
| `backend`  | `npm run lint`           | Lint                          |
| `backend`  | `npm run prisma:migrate` | Create/apply a dev migration  |
| `backend`  | `npm run prisma:studio`  | Browse the database           |
| `frontend` | `npm run dev`            | Run the SPA with HMR          |
| `frontend` | `npm run build`          | Type-check + production build |
| `frontend` | `npm run lint`           | Lint                          |
