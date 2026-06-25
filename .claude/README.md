# `.claude/` — project AI workspace

Committed Claude Code configuration for the Dynamic Form Builder. It encodes this
repo's conventions so AI-assisted changes stay consistent and safe. Personal,
machine-specific overrides live in the gitignored `settings.local.json`.

## Layout

```
.claude/
├── settings.json          # shared permissions allow/deny + hook wiring
├── settings.local.json    # personal overrides (gitignored)
├── agents/                # specialized sub-agents
│   ├── architect.md           read-only architecture gate (runs before code)
│   ├── reviewer.md            read-only review for this repo's failure modes
│   ├── backend-dev.md         Fastify module/feature work (backend/)
│   ├── frontend-dev.md        React SPA work (frontend/)
│   ├── db-migrator.md         the only agent that edits the Prisma schema
│   └── conditional-logic.md   bonus "Challenge Mode" nested-rule engine
├── commands/              # /slash workflows
│   ├── verify-all.md          typecheck + lint + test + build, both packages
│   ├── e2e-smoke.md           full register→publish→submit→review API test
│   ├── dev-up.md              docker compose up + seed
│   ├── new-question-type.md   add a field type across ALL mirrored touchpoints
│   ├── new-migration.md       safe Prisma migration recipe
│   └── mirror-check.md        report drift between the two field-model files
├── hooks/                 # Node scripts run by settings.json
│   ├── protect-secrets.mjs    PreToolUse: block writes to real .env files
│   ├── format.mjs             PostToolUse: Prettier the saved .ts/.tsx
│   └── mirror-warn.mjs        PostToolUse: warn when a field-model mirror changes
└── skills/
    └── next-story/            incremental Story runner (one Story per run)
```

## Incremental delivery workflow

The `next-story` skill drives the backlog in `docs/` one Story at a time:

```
Read Story → Check dependencies → Architecture Gate (architect)
  → Explain plan → Select implementation agents → Implement
  → Verify → Reviewer → Mark DONE (only if all green) → Stop
```

The **Architecture Gate** runs the read-only `architect` agent exactly once per
Story before any code: it reviews the design, flags security/scalability/
complexity risks, recommends the simplest production-ready approach, and emits a
plan with a verdict (`APPROVED` / `BLOCKED` / `NEEDS-CLARIFICATION`). Only
`APPROVED` lets implementation proceed. Plans are saved under
[`../docs/architecture/`](../docs/architecture/). The gate never edits the Story.

## The one rule everything orbits

The dynamic field model is duplicated on purpose and **must stay in sync**:
`backend/src/modules/forms/form-fields.ts` ⇄ `frontend/src/lib/form-fields.ts`.
The `mirror-warn` hook, the `/mirror-check` and `/new-question-type` commands, and
the `reviewer` agent all exist to keep that contract from drifting. See the root
[`CLAUDE.md`](../CLAUDE.md) for the full architecture.

## Notes

- Hooks are Node scripts (`.mjs`) for cross-platform (Windows) reliability; they
  are all non-blocking except `protect-secrets`, which denies secret-file writes.
- Agents are invoked via the Agent tool; commands via `/<name>`. Editing these
  files takes effect on the next session load.
