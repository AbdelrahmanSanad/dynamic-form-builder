# Architecture Plan — S-14: Conditional logic — shared rule schema + pure evaluator + tests

VERDICT: APPROVED

## Goal
Add a nested, recursive rule model (group AND/OR/NOT + leaf condition) plus a pure, total `evaluate(rule, answers)` and a per-type operator catalog, defined once in the backend `form-fields.ts` and mirrored exactly in the frontend, so later stories can drive both server enforcement and client visibility from the same logic. No DB or API surface changes.

## Affected modules

| File | Change |
|---|---|
| `backend/src/modules/forms/form-fields.ts` | Authoritative: add `OPERATORS` catalog, `ruleSchema` (discriminated union via `z.lazy`), `visibility?` on `formFieldSchema`, `evaluate()`, `validateRuleReferences()` |
| `frontend/src/lib/form-fields.ts` | Exact mirror (no UI) |
| `backend/test/conditional-logic.test.ts` (new) | Unit coverage |

**Not touched in S-14:** `forms.service.ts` / `forms.schemas.ts` — `visibility` rides inside `formFieldSchema` and flows through `formSchemaArray` with zero wiring. Calling `validateRuleReferences` in the update flow is **S-15 scope**.

Depends on S-07 (field model) — DONE.

## Key decisions

- **Reference fields by `name`, not `id`** — `name` is the key present in submission `data`/`answers`. `evaluate` reads `answers[condition.fieldName]`.
- **Recursive union with `z.lazy`** — explicit `Rule` TS type, then `const ruleSchema: z.ZodType<Rule> = z.lazy(() => z.discriminatedUnion('kind', [conditionSchema, groupSchema]))`. Add a literal discriminant `kind: 'group' | 'condition'` (combinator/operator alone don't qualify). NOT group = `{ kind:'group', combinator:'NOT', rules:[oneRule] }`; enforce exactly-one child via `superRefine`. Bound nesting depth (~10) and `rules` length against pathological payloads.
- **Operator catalog is one object keyed by FieldType** — `Record<FieldType, readonly string[]>`. Single source backing both `validateRuleReferences` and `evaluate`'s switch. Mirror verbatim.
- **`evaluate` is total** — missing answer → `undefined`; each operator defines safe behaviour (`isEmpty`/`isAbsent` true on undefined; `equals`/`gt`/etc. false). Unknown operator → false, never throws.
- **`validateRuleReferences(fields)` returns issues** (array of messages) rather than throwing, so S-15 can adapt to `superRefine`/`ValidationError`. Checks: referenced field exists, is strictly earlier in the array, operator legal for that field's type.

## Risks & mitigations

- 🧩 Mirror drift — catalog + `evaluate` join `FIELD_TYPES` as sync-critical; keep catalog as a single literal object so diffs are trivial. `/mirror-check` covers the rule/operator catalog.
- 📈 Unbounded recursion / payload — cap nesting depth and `rules[]` length in Zod; `evaluate` recursion then bounded.
- 🧩 Scope creep into S-15 — do NOT call `validateRuleReferences` from the update path or add endpoints/UI here. S-14 ships schema + evaluator + helper + tests only.
- 🔐 No new trust boundary in S-14; enforcement lands in S-15. Rules still parsed/bounded by Zod via the existing persist flow.

## Implementation order

1. [backend] `form-fields.ts`: discriminant-based `conditionSchema` + `groupSchema`, recursive `ruleSchema` via `z.lazy` with depth/length bounds + NOT-arity refine; `OPERATORS` catalog; `visibility: ruleSchema.optional()` on `formFieldSchema`; pure total `evaluate(rule, answers)`; `validateRuleReferences(fields)` returning issues; export `Rule` type.
2. [frontend] Mirror all of the above verbatim (schema, catalog, `evaluate`, `Rule` type, `visibility`); no UI.
3. [tests] `backend/test/conditional-logic.test.ts`: deep nesting (AND/OR/NOT), NOT arity, every operator per type (true+false), missing-answer totality, `validateRuleReferences` rejecting forward/unknown refs + illegal operator-for-type, and `formSchemaArray.parse` accepting a field with `visibility`.

## Verification

- `cd backend && npm run typecheck && npm run lint && npm test`
- `cd frontend && npm run typecheck`
- `/mirror-check` — rule model in sync
