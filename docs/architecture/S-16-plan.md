# Architecture Plan — S-16: Conditional logic — runtime visibility in public form

VERDICT: APPROVED

## Goal
Make the public `DynamicForm` show/hide questions live as answers change, using the shared `evaluate`/`visibleFields`, and ensure only currently-visible fields are validated and submitted — matching server enforcement (S-15).

## Affected modules

| File | Change |
|---|---|
| `frontend/src/components/DynamicForm.tsx` | Add reactive visibility via `watch()` + `visibleFields`; render visible subset; reset values on hide; filter payload at submit |
| `frontend/src/lib/form-fields.ts` | Read-only — `visibleFields`/`evaluate`/`buildSubmissionSchema` already exist |
| `frontend/src/pages/PublicFormPage.tsx` | No change |
| `frontend/src/api/public.ts` | No change |

## Key decisions

- **Watch all values** (`const values = watch()`), then `const shown = visibleFields(fields, values)`. Simplest, O(fields) per change, no risk of drift with the cascaded pass.
- **Hidden fields are unmounted** (conditional render over `shown`, not `fields`). Naturally drops them from DOM and validation.
- **Schema rebuilt from visible subset**: `buildSubmissionSchema(shown)` — skips required-enforcement for hidden fields automatically.
- **Reset on hide**: a `useRef` tracks previous visible names; an effect calls `setValue(name, defaultValueForField(field))` for fields that just became hidden so re-show starts clean.
- **Payload filter at submit**: `handleSubmit((data) => onSubmit(pick(data, shownNames)))` — belt-and-suspenders with server stripping.
- If the component exceeds 150 lines, extract `useVisibleFields(fields, watch, setValue)` into `frontend/src/hooks/`.

## Risks & mitigations

- 🧩 Schema/resolver staleness — mitigated by always deriving schema from `shown`
- 🧩 Re-show after hide carries stale value — mitigated by resetting to `defaultValueForField` on hide
- 🔐 Client/server divergence — both use the same `visibleFields` forward-pass; server is authoritative

## Implementation order

1. Import `visibleFields` + `defaultValueForField` in `DynamicForm.tsx`
2. Add `const values = watch()` and `const shown = visibleFields(fields, values)`
3. Derive schema/resolver from `shown`; map render over `shown`
4. Add hide-reset effect using `useRef` for previous visible names
5. Wrap submit to pick only `shown` field names

## Verification

- `cd frontend && npm run typecheck && npm run lint && npm run build`
