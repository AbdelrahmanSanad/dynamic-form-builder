---
description: Add a new form question/field type, editing every required touchpoint in lockstep (both field-model mirrors, renderer, editor, tests).
argument-hint: "<type-name> [short description of behaviour]"
allowed-tools: Read, Edit, Grep, Glob, Bash
---

Add a new question/field type called `$1` to the form system. Goal: `$ARGUMENTS`.

This codebase mirrors the field model across two files that MUST stay in sync;
the whole point of this command is to touch every place at once so client and
server never diverge. Work through ALL of these:

1. **Backend model** — `backend/src/modules/forms/form-fields.ts`
   - add the type to `FIELD_TYPES`
   - extend the field Zod schema if it needs new props (options/validation)
   - add a `case` in `buildSubmissionSchema`'s `fieldToValidator` (and update the
     exhaustiveness handling)
   - if it's an option-based type, add it to `OPTION_FIELD_TYPES`

2. **Frontend mirror** — `frontend/src/lib/form-fields.ts`
   - same `FIELD_TYPES` entry, `FIELD_TYPE_LABELS` label, schema, and
     `buildSubmissionSchema` case
   - `defaultValueForField` default for the new type

3. **Renderer** — `frontend/src/components/DynamicForm.tsx`
   - render the input control for the new type (use `ui.tsx` primitives;
     use a `Controller` for non-native value shapes)

4. **Builder** — `frontend/src/components/FieldEditor.tsx`
   - ensure the new type is configurable (label/name/required, options if needed)

5. **Tests** — `backend/test/form-fields.test.ts`
   - add valid + invalid cases for the new type through `buildSubmissionSchema`

If the type needs to persist binary data (e.g. file upload), stop and confirm the
storage approach with the user first (it also needs a backend upload route and is
better handled with the `backend-dev` agent).

Finish by running backend `npm run typecheck && npm test` and frontend
`npm run typecheck && npm run build`, then summarise exactly which files changed.
