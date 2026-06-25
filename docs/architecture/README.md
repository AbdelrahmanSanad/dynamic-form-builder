# docs/architecture/

Per-Story architecture plans produced by the **Architecture Gate** — the
`architect` agent that runs once before any code is written for a Story (see
`.claude/skills/next-story/SKILL.md`, Stage 3).

## What lives here

One file per gated Story: `<S-ID>-plan.md` (e.g. `S-11-plan.md`). Each is written
by the `next-story` skill from the `architect` agent's output. The architect
itself is read-only and never writes files; these are **plans**, not code.

## Verdicts

Every plan ends with one verdict:

| Verdict | Meaning | Effect on the run |
|---|---|---|
| `APPROVED` | Plan is safe and ready | Implementation proceeds; the plan is frozen and reused if the Story is re-run ("exactly once per Story") |
| `BLOCKED` | Real design/security/scalability problem | Run stops; issues must be resolved first |
| `NEEDS-CLARIFICATION` | Requirements ambiguous in a design-changing way | Run stops; user answers the open questions, then the gate re-runs |

## Notes

- A plan file existing with `VERDICT: APPROVED` is the record that the gate passed
  for that Story; the skill will not re-invoke the architect for it again.
- The gate **never** modifies the Story (`../STORIES.md`) or the backlog spec —
  only this artifact and (after success) the Story's Status cell are written.
- This directory is empty until the first Story is gated.
