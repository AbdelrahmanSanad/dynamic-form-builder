---
name: next-story
description: >-
  Drive incremental delivery of the Dynamic Form Builder from the planning docs.
  Implements exactly ONE story per run: reads docs/IMPLEMENTATION_PLAN.md, picks
  the first incomplete Story (or one named by the user), runs the Architecture
  Gate (architect agent) before any code, explains the approved plan, delegates to
  the right implementation sub-agents, implements only that Story, runs
  verification, runs the reviewer, and marks it DONE only on success. Use when the
  user says "next story", "/next-story", "continue the plan", "implement the next
  story", "work the backlog", or asks for the current plan status. NEVER implements
  more than one Story in a single run, and NEVER skips the Architecture Gate.
---

# next-story — incremental Story runner

You execute the backlog in [`docs/IMPLEMENTATION_PLAN.md`](../../../docs/IMPLEMENTATION_PLAN.md)
one Story at a time. The **Backlog table** there is the source of truth for order
and status; per-Story detail is in [`docs/STORIES.md`](../../../docs/STORIES.md).

## Workflow (every implementation run follows this exact order)

```
Read Story → Check dependencies → Architecture Gate (architect)
  → Explain implementation plan → Select implementation agents
  → Implement the Story → Run verification → Run reviewer
  → Mark Story DONE only if every verification succeeds → Stop
```

## Inviolable rules

1. **One Story per invocation.** Even if many Stories are `TODO`, do exactly one,
   then stop. Never batch.
2. **Never skip the Architecture Gate.** No run may go from dependency-check
   straight to implementation. Only an `APPROVED` gate permits coding.
3. **Never mark a Story DONE without passing verification** (and a non-blocking
   reviewer verdict).

## Arguments

- _(none)_ or `next` / `continue` → select the **first incomplete** Story and run
  the full workflow on it.
- `status` → print the backlog status (counts + the next Story) and **stop**;
  implement nothing.
- `explain` (or `dry-run`) → select the next Story, run through the Architecture
  Gate, present the approved plan, then **stop** before selecting agents.
- a Story id, e.g. `S-12` → target that specific Story (still only one).

---

## Stage 1 — Read the Story
1. Read the Backlog table in `IMPLEMENTATION_PLAN.md`.
2. If arg is `status`: report DONE/WIP/TODO counts and the next `TODO` Story, then
   stop.
3. Determine the target Story: the requested id, else the first row whose Status
   is `⬜ TODO` (in Order). If none remain, congratulate the user — the backlog is
   complete — and stop.
4. Read the Story's full spec in `STORIES.md`.

## Stage 2 — Check dependencies
Every id in the Story's `Depends On` must be `✅ DONE`. If any is not done, stop
and report which must be completed first. Do not implement out of order.

## Stage 3 — Architecture Gate (runs exactly once per Story)
This gate must run before any implementation and must never modify the Story.

1. **Reuse if already approved.** If `docs/architecture/<S-ID>-plan.md` exists and
   its verdict is `APPROVED`, the gate already passed for this Story — reuse that
   plan and skip re-invoking the architect (this is what "exactly once per Story"
   means: one approved gate). Otherwise continue.
2. **Invoke the `architect` agent** (Agent tool, subagent_type `architect`) with:
   the Story id + spec, and pointers to `CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md`,
   and the modules the Story touches. The architect is read-only and returns a
   gate verdict plus a short plan.
3. **Persist the artifact.** Write the architect's output to
   `docs/architecture/<S-ID>-plan.md` (you write it — the architect never writes
   files; this is a plan artifact, not production code). Never write to
   `STORIES.md` or the Story's backlog row from this stage.
4. **Act on the verdict:**
   - `BLOCKED` → **stop.** Report the blocking issues and what would unblock.
     Leave the Story `⬜ TODO`. Do not implement.
   - `NEEDS-CLARIFICATION` → **stop.** Surface the architect's questions to the
     user (use AskUserQuestion when helpful, leading with the recommended
     default). Leave the Story `⬜ TODO`. Do not implement. The gate re-runs on a
     later invocation once answers exist.
   - `APPROVED` → proceed to Stage 4.

## Stage 4 — Explain the implementation plan
Present a concise briefing from the **approved architecture plan** plus the Story
spec:
- Story id + title, Epic/Milestone, Goal.
- Affected modules and key architecture decisions (from the plan).
- What will change: backend tasks, frontend tasks, DB/migration, API endpoints.
- Validation requirements and key Acceptance Criteria.
- Which implementation agents you will use and why.
- The verification commands you will run.

If the arg was `explain`/`dry-run`, stop here.

## Stage 5 — Select implementation agents
Follow the architect's plan; pick the minimal appropriate set (the user has
authorized agent use via this skill):

| Story involves | Agent(s), in order |
|---|---|
| Prisma schema / migration | `db-migrator` first |
| Backend endpoints/services/validation | `backend-dev` |
| React pages/components/API client | `frontend-dev` |
| A new field/question type | prefer the `/new-question-type` workflow; or `backend-dev` + `frontend-dev` |
| Conditional-logic (any S-14…S-17) | `conditional-logic` (spans both sides) |

(`architect` is the gate in Stage 3 and `reviewer` is Stage 8 — neither is an
implementation agent.) Give each agent the approved plan and the tasks for **this
Story only**; do not let an agent wander into other Stories' scope.

## Stage 6 — Implement the Story
Hand the approved plan to the implementation agents and apply the changes. Stay
strictly within the Story's tasks and acceptance criteria. If you discover work
that belongs to a different Story, note it for the user and stop rather than
absorbing it. (Optionally set the backlog Status cell to `🔄 WIP` here so an
interrupted run is visible.)

## Stage 7 — Run verification
Run the commands implied by the Story and the Definition of Done:
- Backend touched → `cd backend && npm run typecheck && npm run lint && npm test`
- Frontend touched → `cd frontend && npm run typecheck && npm run lint && npm run build`
- Field model touched → `/mirror-check` (must report in sync)
- Public API flow touched → `/dev-up` if needed, then `/e2e-smoke`
- (Or run `/verify-all` for the cross-package checks.)

## Stage 8 — Run reviewer
Invoke the `reviewer` agent for a read-only pass. Address any 🔴 blocking findings
and re-run the relevant verification. A `REQUEST CHANGES` verdict blocks DONE.

## Stage 9 — Mark status
- **On full success** (acceptance criteria met, all verification green, reviewer
  not requesting changes): edit the Story's Status cell in
  `IMPLEMENTATION_PLAN.md` from `⬜ TODO`/`🔄 WIP` to `✅ DONE (YYYY-MM-DD)`.
- **On failure**: leave the Story `⬜ TODO` (revert any `🔄 WIP`), summarize what
  passed/failed with the failing output, and do **not** mark it done.

## Stage 10 — Stop and hand off
Report: the Story completed, files changed, verification + reviewer results, and
the **next** Story in the backlog. Tell the user to run `/next-story` again (or
say "next") to continue. Do not start the next Story.

## Guardrails
- One Story per run — no exceptions.
- The Architecture Gate runs exactly once per Story (reuse an `APPROVED` plan) and
  is never skipped; a `BLOCKED` or `NEEDS-CLARIFICATION` gate stops the run.
- The architect never writes code and the gate never edits the Story.
- Never mark a Story DONE without passing verification and the reviewer.
- Schema work goes through `db-migrator`; never edit already-applied migrations.
- Keep the two `form-fields.ts` mirrors in sync; if a Story changes field types or
  rules, the run isn't done until `/mirror-check` is clean.
- Don't commit or push unless the user explicitly asks.
- If the plan docs are missing or the table can't be parsed, stop and tell the
  user rather than guessing.
