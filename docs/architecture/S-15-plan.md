# Architecture Plan — S-15: Conditional logic — server-side enforcement on submit

VERDICT: APPROVED

## Goal
On submit, compute each field's visibility against the submitted answers; for fields that resolve hidden, skip `required` enforcement and strip any submitted answer, with the server as the sole authority on visibility.

## Affected modules

| File | Change |
|---|---|
| `backend/src/modules/forms/form-fields.ts` | Add `visibleFields(fields, answers)` pure helper |
| `backend/src/modules/forms/submissions.service.ts` | Both `createForSlug` (JSON) and `createForSlugMultipart` apply `visibleFields` before `buildSubmissionSchema` |
| `backend/test/conditional-logic.test.ts` | Unit tests for `visibleFields` |
| New test file for service-level scenarios | Integration: hidden-required succeeds, smuggled hidden stripped, visible-required 422 |

**Frontend:** none. **DB:** none. **API URL:** unchanged — `POST /api/public/forms/:slug/submissions` (behavior change only).

## Key decisions

- **Filter the field set, not the Zod schema.** Compute the visible subset with `visibleFields(fields, rawAnswers)`, then call `buildSubmissionSchema(visibleFields)`. The existing `.strip()` drops smuggled hidden answers automatically.
- **Evaluation order is already safe.** `validateRuleReferences` ensures rules only reference earlier fields. A single forward pass over raw answers is correct — no fixpoint needed.
- **Evaluate against raw (pre-validation) answers.** Run `visibleFields` on the merged `rawData` before calling `buildSubmissionSchema.parse()`. For multipart: merge `textFields + fileData` first, then filter, then validate.
- **One shared helper, two call sites.** `visibleFields` is called from both JSON and multipart paths to prevent drift.

## Risks & mitigations

- 🧩 Double-path drift — single `visibleFields` helper mitigates.
- 🔐 Smuggled hidden answers — `.strip()` on visible-only schema removes them; covered by a test.
- 🧩 Hidden upstream field gating a later field — evaluated against raw answers in field order; backward-reference-only rules make a single forward pass sufficient. Hidden fields still contribute their raw answer to downstream evaluations.
- 📈 Pure in-memory pass; no new queries.
- ⚠️ File orphans from hidden file fields — out of scope for S-15 (no storage changes listed); add a code comment.

## Implementation order

1. `form-fields.ts` — `export function visibleFields(fields, answers): FormField[]`
2. `submissions.service.ts` — wire into `createForSlug` (JSON) and `createForSlugMultipart`
3. Tests — unit for `visibleFields` + service-level scenarios

## Verification

- `cd backend && npm run typecheck && npm run lint && npm test`
