# Architecture Plan — S-11 File upload: backend

VERDICT: APPROVED

_Produced by the Architecture Gate (`architect` agent) on 2026-06-24. Frozen for
this Story; the gate will reuse this plan if S-11 is re-run._

## Goal (restated)

Add a server-side `file` question type: accept uploaded files via multipart on
public submission, store bytes safely through a swappable `StorageService` (local
disk), persist only a reference object `{ storageKey, filename, mimeType, size }`
in the existing `Submission.data` JSONB, validate type/size/required server-side,
and add an owner-only streaming download endpoint. No frontend, no DB migration.

## Affected modules & dependencies

- `backend/src/modules/forms/form-fields.ts` — add `file` to `FIELD_TYPES`;
  extend `formFieldSchema` with per-field `accept` (allowed MIME types),
  `maxSizeBytes`, `maxFiles`; add a `buildSubmissionSchema` arm validating a file
  answer as the reference object (or array). The reference is stored, not bytes.
- New `backend/src/modules/storage/storage.service.ts` (+ `storage.types.ts`) —
  `StorageService` interface (`save`, `createReadStream`, `stat`, `delete`) with a
  `LocalDiskStorageService` impl under the configured uploads dir.
- `backend/src/modules/submissions/submissions.service.ts` — multipart-aware
  create path: collect text fields + saved file references, then run the existing
  `buildSubmissionSchema(...).parse(...)`. Keep the JSON `createForSlug` intact.
- `backend/src/modules/public/public.routes.ts` / `public.schemas.ts` — make
  `POST /forms/:slug/submissions` accept `multipart/form-data` as well as JSON.
- `backend/src/modules/submissions/submissions.routes.ts` / `submissions.schemas.ts`
  — add `GET /forms/:formId/submissions/:id/files/:storageKey` owner-only download.
- `backend/src/plugins/multipart.ts` — register `@fastify/multipart` with limits.
- `backend/src/app.ts` — register multipart plugin; construct/inject storage.
- `backend/src/config/env.ts` + `backend/.env.example` — `UPLOAD_DIR`,
  `UPLOAD_MAX_FILE_SIZE_BYTES`, `UPLOAD_MAX_FILES_PER_REQUEST`.
- `backend/test/` — file-field validation + reference-shape tests.
- Depends on **S-07 (DONE)**, **S-09 (DONE)** — OK to proceed.
- Frontend mirror (`frontend/src/lib/form-fields.ts`) is **intentionally deferred
  to S-12**; `/mirror-check` will report the `file` type out of sync this Story —
  expected, call it out, do not "fix" here.

## Key decisions (simplest production-ready)

- Reference object in `Submission.data`, files on disk — no new table/migration;
  matches the spec and existing JSONB pattern.
- `storageKey = nanoid()` (dep already present); on-disk name derived solely from
  the key. Client filename stored only as metadata, never used to build a path →
  prevents path traversal.
- `StorageService` interface + `LocalDiskStorageService` impl — the minimum
  abstraction for S-18's S3 swap. No DI framework, no S3 SDK now (gold-plating).
- Multipart route does its own body assembly, not the Zod body type-provider
  (`@fastify/multipart` consumes the stream first). `buildSubmissionSchema`
  remains the single authoritative validator. Branch on content-type.
- Stream files to disk and stream on download (`reply.send(createReadStream)`) —
  bounded memory/event loop.
- Download authZ reuses `requireOwnedForm`; verify the `storageKey` is referenced
  by the submission before streaming.

## Risks & mitigations

- 🔐 Path traversal — on-disk name is `nanoid` only; download validates the
  `storageKey` belongs to the target submission (unknown/foreign → 404).
- 🔐 Owner-scoped download — route under authenticated `submissionRoutes` +
  `requireOwnedForm`; non-owner → 403/404.
- 🔐 Type/size — per-field `accept`/`maxSizeBytes` enforced server-side, plus a
  global multipart `fileSize` backstop; oversize truncation (`file.truncated`)
  rejected with 422 and the partial file deleted.
- 🔐 Public surface — keep the existing `{ max: 20, timeWindow: '1 minute' }`
  rate limit; multipart per-request file/size limits bound abuse.
- 📈 Ephemeral filesystem (Docker/deploy) — local disk won't survive restarts;
  acknowledged and handed to S-18 (object store via `StorageService`). Make
  `UPLOAD_DIR` configurable + created at startup; note in `.env.example`.
- 📈 Streaming not buffering — avoid `file.toBuffer()` for large files; prefer the
  `limits.fileSize` truncation signal.
- 🧩 Over-engineering — no new table, no S3 SDK, no DI container.

## Implementation plan (hand to agents)

1. [backend-dev] Upload config in `config/env.ts` (`UPLOAD_DIR` default
   `./uploads`, `UPLOAD_MAX_FILE_SIZE_BYTES` default `5242880`,
   `UPLOAD_MAX_FILES_PER_REQUEST` default `10`) + `.env.example`.
2. [backend-dev] `multipart` plugin registering `@fastify/multipart` (add dep)
   with `limits: { fileSize, files }` from env; register in `app.ts`.
3. [backend-dev] `storage` module: `StorageService` interface +
   `LocalDiskStorageService` (`save`/`createReadStream`/`stat`/`delete`), key =
   `nanoid`, ensure dir exists.
4. [backend-dev] Field model: add `file` to `FIELD_TYPES`, add
   `accept`/`maxSizeBytes`/`maxFiles` to `formFieldSchema`, and a
   `buildSubmissionSchema` arm validating the reference object (single or array;
   required → ≥1).
5. [backend-dev] Submission intake: multipart-aware create in
   `SubmissionsService` (stream to storage, validate per field, delete partial on
   reject → 422, build references, merge with text fields, run
   `buildSubmissionSchema(...).parse(...)`); branch in `public.routes.ts` on
   content-type.
6. [backend-dev] Owner-only `GET /forms/:formId/submissions/:id/files/:storageKey`
   — assert ownership, confirm the key is referenced by the submission, stream
   with `Content-Type` + `Content-Disposition: attachment`; unknown key → 404.
7. [tests] required-missing → 422; disallowed MIME → 422; oversize → 422; valid →
   reference shape stored; array (`maxFiles`) case; download authZ + unknown key.
8. Verification: `cd backend && npm run typecheck && npm run lint && npm test`;
   `/e2e-smoke` (public flow touched); `/mirror-check` — expected out of sync
   (`file` type frontend mirror is S-12).

## Defaults chosen (in lieu of blocking)

- Max size **5 MB/file**; per-request cap **10**; both env-overridable.
- Allowed MIME types **per-field** via `accept`; if omitted, accept any type
  within the size limit.
- Single vs multiple via optional `maxFiles` (default 1 → object; >1 → array).
- Storage at configurable `UPLOAD_DIR` (default `./uploads`, not committed); S-18
  swaps the impl for object storage.

VERDICT: APPROVED
