# docs/

Planning documents for the Dynamic Form Builder.

- **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** — Epics → Milestones →
  Stories, the ordered **Backlog** table (the single source of truth for Story
  status), the Definition of Done, and verification commands.
- **[STORIES.md](./STORIES.md)** — full per-Story specs (Goal, tasks, DB, API,
  validation, dependencies, acceptance criteria).
- **[architecture/](./architecture/)** — per-Story architecture plans produced by
  the Architecture Gate (`architect` agent) before any code is written.
- **[../REQUIREMENTS.md](../REQUIREMENTS.md)** — the original task & bonus.

Incremental delivery is driven by the **`next-story`** skill, which implements
exactly one incomplete Story per run. Before any code, it runs the
**Architecture Gate** (the read-only `architect` agent) to review the design and
produce an approved plan; only `APPROVED` plans proceed to implementation. See
`.claude/skills/next-story/SKILL.md`.
