# Implementation Plan — Dynamic Form Builder

This is the master roadmap derived from [`REQUIREMENTS.md`](../REQUIREMENTS.md).
Requirements are grouped into **Epics → Milestones → Stories**. Each Story is a
small, independently shippable unit. Full per-Story specs live in
[`STORIES.md`](./STORIES.md).

> **Source of truth for progress:** the **Backlog** table below. The
> `next-story` skill reads it to pick the first incomplete Story and flips its
> **Status** to `✅ DONE` only after implementation **and** verification pass.

## Status legend

| Symbol | Meaning |
|---|---|
| `✅ DONE` | Implemented and verified |
| `🔄 WIP` | In progress (claimed by a run) |
| `⬜ TODO` | Not started |

Stories S-01 … S-10 are marked `✅ DONE` because they were delivered and
end-to-end verified by the initial scaffold (auth, form CRUD, builder with text/
choice types, publishing, public submission, submissions list, Dockerized stack).
The first genuinely incomplete Story is **S-11 (File upload — backend)**.

---

## Epics & Milestones

### Epic E1 — Platform Foundation _(enabler)_
Infrastructure every feature relies on.
- **M1.1 Backend skeleton & tooling** — S-01, S-05
- **M1.2 Data layer** — S-02
- **M1.3 Authentication** — S-03
- **M1.4 Frontend skeleton** — S-04

### Epic E2 — Form Management
Create/edit/list/delete forms, build questions, publish.
- **M2.1 Form CRUD** — S-06
- **M2.2 Form builder & question types** — S-07, S-11, S-12
- **M2.3 Publishing & public URL** — S-08

### Epic E3 — Public Submission
Unauthenticated form filling + data capture.
- **M3.1 Public rendering & submit** — S-09
- **M3.2 File capture** — (covered by S-11/S-12)

### Epic E4 — Submission Viewing
Creators review responses.
- **M4.1 Submissions dashboard** — S-10
- **M4.2 Submission detail & files** — S-13

### Epic E5 — Conditional Logic _(Bonus / Challenge Mode)_
Nested, type-aware visibility rules.
- **M5.1 Rule engine core** — S-14
- **M5.2 Server enforcement** — S-15
- **M5.3 Runtime & builder UI** — S-16, S-17

### Epic E6 — Delivery & Deployment
Ship it.
- **M6.1 Deployment & docs** — S-18

---

## Delivery workflow

Stories are delivered one at a time by the `next-story` skill, which always runs
an **Architecture Gate** before any code:

```
Read Story → Check dependencies → Architecture Gate (architect)
  → Explain plan → Select implementation agents → Implement
  → Verify → Reviewer → Mark DONE (only if all green) → Stop
```

The Architecture Gate runs the read-only `architect` agent **exactly once per
Story** before implementation. It analyzes the Story against the existing
architecture, names the affected modules/dependencies, flags security /
scalability / complexity / over-engineering risks, recommends the simplest
production-ready approach, and emits a plan ending in a verdict:

- `APPROVED` → implementation may proceed (plan saved to
  [`architecture/<S-ID>-plan.md`](./architecture/)).
- `BLOCKED` → a real architectural issue must be resolved first; no code.
- `NEEDS-CLARIFICATION` → ambiguous requirement; the user answers before coding.

The gate never modifies the Story. See
[`architecture/README.md`](./architecture/README.md).

---

## Backlog (recommended implementation order)

| Order | ID | Story | Epic | Depends On | Status |
|------|------|-------|------|-----------|--------|
| 1 | S-01 | Backend app skeleton & config | E1 | — | ✅ DONE |
| 2 | S-02 | Database schema & migrations | E1 | S-01 | ✅ DONE |
| 3 | S-03 | Authentication (httpOnly cookie JWT) | E1 | S-02 | ✅ DONE |
| 4 | S-04 | Frontend skeleton & auth UI | E1 | S-03 | ✅ DONE |
| 5 | S-05 | Dockerized stack & verification tooling | E1 | S-01 | ✅ DONE |
| 6 | S-06 | Form CRUD API & dashboard (create/list/rename/delete) | E2 | S-04 | ✅ DONE |
| 7 | S-07 | Form builder & base question types (text, choice, required, reorder) | E2 | S-06 | ✅ DONE |
| 8 | S-08 | Publishing & unique public URL | E2 | S-06 | ✅ DONE |
| 9 | S-09 | Public form page & submission (required validation) | E3 | S-08 | ✅ DONE |
| 10 | S-10 | Submissions dashboard (summary list) | E4 | S-09 | ✅ DONE |
| 11 | S-11 | File upload — backend (multipart, storage, upload/download, validation) | E2 | S-07, S-09 | ✅ DONE (2026-06-24) |
| 12 | S-12 | File upload — frontend (builder config + renderer + multipart submit) | E2 | S-11 | ✅ DONE (2026-06-24) |
| 13 | S-13 | Submission detail view (full answers + file downloads) | E4 | S-10, S-11 | ✅ DONE (2026-06-24) |
| 14 | S-14 | Conditional logic — shared rule schema + pure evaluator + tests | E5 | S-07 | ✅ DONE (2026-06-24) |
| 15 | S-15 | Conditional logic — server-side enforcement on submit | E5 | S-14, S-09 | ✅ DONE (2026-06-25) |
| 16 | S-16 | Conditional logic — runtime visibility in public form | E5 | S-14, S-09 | ✅ DONE (2026-06-25) |
| 17 | S-17 | Conditional logic — visual rule builder UI | E5 | S-14, S-07 | ✅ DONE (2026-06-25) |
| 18 | S-18 | Deployment & README finalization (live URL) | E6 | S-13 | ⬜ TODO |

---

## Definition of Done (applies to every Story)

A Story is `✅ DONE` only when **all** hold:

0. The **Architecture Gate** approved a plan for it
   (`architecture/<S-ID>-plan.md`, `VERDICT: APPROVED`).
1. Its **Acceptance Criteria** (in `STORIES.md`) are met.
2. **Backend** changes pass: `npm run typecheck && npm run lint && npm test`.
3. **Frontend** changes pass: `npm run typecheck && npm run lint && npm run build`.
4. If the Story touches the public API flow, the `/e2e-smoke` checks pass.
5. If the Story touches the field model, `/mirror-check` reports **in sync**.
6. No secrets committed; new env vars documented in the relevant `.env.example`.

## Verification command reference

| Scope | Command(s) |
|---|---|
| Backend | `cd backend && npm run typecheck && npm run lint && npm test` |
| Frontend | `cd frontend && npm run typecheck && npm run lint && npm run build` |
| Both | `/verify-all` |
| API flow | `/e2e-smoke` (needs the stack up — `/dev-up`) |
| Field model | `/mirror-check` |

## Conventions

- One Story per change set. Keep Stories independent; respect `Depends On`.
- Every Story passes the **Architecture Gate** (`architect` agent) before any code
  is written; only an `APPROVED` plan permits implementation.
- Database changes go through the **db-migrator** agent / `/new-migration`.
- New field/question types go through `/new-question-type` so both field-model
  mirrors and the renderer/editor/tests move together.
- Backend follows the module pattern (`routes`/`service`/`schemas`); frontend
  follows the TanStack-Query + RHF + Zod + Tailwind conventions. See
  [`../CLAUDE.md`](../CLAUDE.md).
