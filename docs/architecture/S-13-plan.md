# Architecture Plan — S-13: Submission detail view

VERDICT: APPROVED

## Goal
Let a form owner open a single submission and see every field's answer in a readable, type-aware format, with uploaded files rendered as working, owner-restricted download links.

## Affected modules

| File | Change |
|---|---|
| `backend/test/submissions.detail.test.ts` | New — owner-check integration tests for `GET /forms/:formId/submissions/:id` |
| `frontend/src/api/submissions.ts` | Add `get(formId, submissionId)` call |
| `frontend/src/types/index.ts` | Optionally add `FileReference` type |
| `frontend/src/pages/SubmissionDetailPage.tsx` | New — detail view page |
| `frontend/src/App.tsx` | Register new route `/forms/:id/submissions/:submissionId` |
| `frontend/src/pages/FormSubmissionsPage.tsx` | Link each row to its detail page |

## Key decisions

- **No backend feature changes needed.** `getOne` already returns full `data`; file references already carry `storageKey`/`filename`/`mimeType`/`size`.
- **File downloads are plain `<a href>` links** to `/api/forms/:formId/submissions/:id/files/:storageKey`. The httpOnly cookie flows automatically on same-origin navigation — no blob fetch or token plumbing needed.
- **Choice values → labels**: iterate `form.schema` to build a value→label map per field; fall back to raw value gracefully.
- **File answer normalization**: a file field may store a single object or an array (`maxFiles > 1`); normalize to array before rendering.
- Query keys: `['forms', id]` (existing) + `['submissions', id, submissionId]` (new).

## Risks

- 🔐 Owner scoping already enforced server-side; new tests close the verification gap.
- 🧩 Choice-label mapping: fall back to raw value if option was removed post-submission.
- 🧩 File answer shape: single object or array — normalize to array.

## Implementation order

1. `backend/test/submissions.detail.test.ts` — owner/non-owner/404/401 tests
2. `frontend/src/api/submissions.ts` — `get` method
3. `frontend/src/pages/SubmissionDetailPage.tsx` — new detail page
4. `frontend/src/App.tsx` — route registration
5. `frontend/src/pages/FormSubmissionsPage.tsx` — row links

## Verification

- `cd backend && npm run typecheck && npm run lint && npm test`
- `cd frontend && npm run typecheck && npm run lint && npm run build`
