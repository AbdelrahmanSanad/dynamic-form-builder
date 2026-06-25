# Architecture Plan — S-17: Conditional logic — visual rule builder UI

VERDICT: APPROVED

## Goal
Let a form creator visually build, nest, and manage AND/OR/NOT rule trees that populate `FormField.visibility`, with type-driven operators, a human-readable summary, and forward-reference guarding — persisting through the existing `PATCH /api/forms/:id`.

## Affected modules

| File | Change |
|---|---|
| `frontend/src/components/FieldEditor.tsx` | Integrate RuleBuilder; pass preceding fields; wire `visibility` via `update(id, patch)` |
| `frontend/src/lib/rule-helpers.ts` | New — pure helpers: `newCondition`, `newGroup`, `defaultOperatorFor`, `operatorLabel`, `needsValueInput` |
| `frontend/src/components/ConditionEditor.tsx` | New — renders one Condition: field dropdown, operator dropdown, adaptive value input |
| `frontend/src/components/RuleNode.tsx` | New — renders one Rule recursively; group → combinator + children + add buttons; condition → ConditionEditor |
| `frontend/src/components/RuleSummary.tsx` | New — pure recursive human-readable render of Rule |
| `frontend/src/components/RuleBuilder.tsx` | New — entry: empty state, top-level RuleNode, RuleSummary, clear button |

## Key decisions

- **Controlled, no RHF.** `RuleBuilder` takes `value: Rule | undefined` + `onChange`. Matches existing FieldEditor pattern.
- **Recursion via `RuleNode`**, not self-calling `RuleBuilder`. Keeps each file ≤150 lines.
- **Immutable tree edits by structural replacement.** `onChange(updated | null)` bubbles up; no node IDs in the persisted schema.
- **Forward-reference guard in `FieldEditor`**: passes `fields.slice(0, index)` as `availableFields`.
- **NOT group enforces arity = 1 in UI**; cap add-buttons at `rules.max(20)`.
- **Operator/value derivation from `OPERATORS[targetField.type]`**: presence ops → no value input; option types → option picker; else text/number.

## Component decomposition

```
RuleBuilder (entry + empty-state + summary)
  └─ RuleNode (one Rule, recursive)
       └─ ConditionEditor (one Condition: dropdowns + value input)
```

## Risks & mitigations

- 🧩 ≤150-line rule — 4 components + 1 helpers file keeps each focused
- 🧩 Deep nesting — UI enforces max 20 children and NOT arity = 1
- 🧩 Contract drift — builder emits exact `Rule` union (no extra keys)
- 🔐 No new trust boundary — backend validates `visibility` via `formFieldSchema` on PATCH

## Implementation order

1. `frontend/src/lib/rule-helpers.ts` — pure helpers (no JSX)
2. `frontend/src/components/ConditionEditor.tsx`
3. `frontend/src/components/RuleNode.tsx`
4. `frontend/src/components/RuleSummary.tsx`
5. `frontend/src/components/RuleBuilder.tsx`
6. `frontend/src/components/FieldEditor.tsx` — integrate RuleBuilder

## Verification

- `cd frontend && npm run typecheck && npm run lint && npm run build`
