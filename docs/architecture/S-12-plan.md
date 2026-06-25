# Architecture Plan — S-12: File upload: frontend

VERDICT: APPROVED

## Goal
Let form authors add/configure `file` questions in the builder, render a file input on the public form with client-side type/size checks, and submit file-bearing forms as `multipart/form-data` (JSON otherwise), with progress/error feedback. Backend (S-11) is complete and authoritative.

## Affected modules

| File | Change |
|---|---|
| `frontend/src/lib/form-fields.ts` | Add `file` to `FIELD_TYPES`, label, schema, `buildSubmissionSchema` arm, `defaultValueForField` |
| `frontend/src/components/FieldEditor.tsx` | File-field config UI (accept, maxSizeBytes, maxFiles, required) |
| `frontend/src/components/DynamicForm.tsx` | File input Controller, client-side checks, selected-file UI |
| `frontend/src/api/public.ts` | `submitMultipart` function with `onUploadProgress`; JSON-vs-multipart branch |
| Public form page (`pages/`) | Wire progress/error state, JSON-vs-multipart call |

## Key decisions

- **Client Zod validates `File` objects** (not reference objects — those are built server-side). The `buildSubmissionSchema` `file` arm uses `z.instanceof(File).refine(...)` for type/size. Mirror shape legitimately diverges here; document with a comment.
- **Multipart encoding contract:** non-file answers go as string fields; files under their field `name`. Only switch to multipart when the form has ≥1 file field.
- **Array-field risk (checkboxes + file):** `Submission.data` `textFields` is `Record<string,string>` (last-wins). A form mixing `checkboxes` + `file` may lose array data. Implementer must verify or document as a known limitation.
- Use axios `FormData` + `onUploadProgress` via the existing `client.ts` instance; keep `request()` unwrap.

## Risks

- 🧩 **Mirror shape divergence** — unavoidable; client validates `File`, server validates the stored reference. Keep `FIELD_TYPES`/labels/schema-key parity for `/mirror-check`.
- 🧩 **Multipart + array fields** — `checkboxes` in a file-bearing form may 422; document or handle.
- 🔐 Client checks are UX only; server re-validates and is authoritative.

## Implementation order

1. Mirror `file` in `frontend/src/lib/form-fields.ts`
2. `FieldEditor.tsx` — file field config UI
3. `DynamicForm.tsx` — file input rendering + collection
4. `api/public.ts` — `submitMultipart` + JSON-vs-multipart branch
5. Public form page — progress/error UI

## Verification

- `/mirror-check` — in sync
- `cd frontend && npm run typecheck && npm run lint && npm run build`
- `/e2e-smoke` — non-file forms still pass
