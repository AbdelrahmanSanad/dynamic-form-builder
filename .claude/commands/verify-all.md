---
description: Run typecheck, lint, build and tests across backend and frontend, then report a pass/fail table.
allowed-tools: Bash, Read
---

Verify the whole repository. Run each step and capture results — do not stop at
the first failure; run them all so the report is complete.

Backend (`backend/`):
1. `npm run typecheck`
2. `npm run lint`
3. `npm test`
4. `npm run build`

Frontend (`frontend/`):
1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`   ← runs `tsc -b` (catches project-reference errors `--noEmit` misses)

If a package has no `node_modules`, run `npm install` there first.

Then print a single Markdown table:

| Package | typecheck | lint | test | build |
|---|---|---|---|---|

Use ✅/❌. For every ❌, quote the first few error lines and the file:line so the
user can jump straight to it. End with an overall PASS/FAIL verdict. Do not
attempt fixes unless asked.
