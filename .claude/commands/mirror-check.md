---
description: Check that the backend and frontend field-model mirrors are in sync and report any divergence.
allowed-tools: Read, Bash, Grep
---

The field model is intentionally duplicated and must stay in sync:
- `backend/src/modules/forms/form-fields.ts`
- `frontend/src/lib/form-fields.ts`

Compare the two and report divergence in:

1. **`FIELD_TYPES`** — the exact set of type strings must match between the files.
2. **`buildSubmissionSchema` cases** — every type in `FIELD_TYPES` must have a
   handling arm in BOTH files' `fieldToValidator` switches.
3. **Validation semantics** — for each type, the constraints applied
   (required/min/max/options membership/etc.) should agree in spirit; flag any
   place where the server enforces something the client doesn't, or vice-versa
   (the server is authoritative, but the client should not be stricter).
4. **Rule/operator catalog** (if conditional logic exists) — the operator lists
   and the `evaluate` logic must match.

Read both files, extract the type lists (e.g. with grep on `FIELD_TYPES` and the
`case '...':` arms), and present:

- a side-by-side list of types in each file,
- ✅ "in sync" or ❌ with the specific missing/extra entries and file:line.

Do not edit anything — this is a report. If out of sync, suggest running
`/new-question-type` or pointing the relevant agent at the gap.
