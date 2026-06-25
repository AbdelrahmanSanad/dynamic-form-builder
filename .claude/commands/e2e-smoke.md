---
description: Run the full end-to-end API smoke test (register → create → publish → public submit → review) against the running stack.
argument-hint: "[base-url]  (default http://localhost:8080/api)"
allowed-tools: Bash
---

Run an end-to-end smoke test of the public-submission flow against a running
stack. Base URL: `$1` if provided, otherwise `http://localhost:8080/api` (the
nginx → api production path; the cookie stays first-party there).

Preconditions: the stack is up. If `curl -s <host>/health` (or `:4000/health`)
fails, tell the user to run `/dev-up` first and stop.

Execute, using a cookie jar and a unique email per run, and report each step's
result. The flow MUST cover, in order:

1. `GET /health` → `status: ok`.
2. `POST /auth/register` (random email) → 201, captures the auth cookie.
3. `GET /auth/me` with the cookie → same user.
4. `POST /forms` with a small schema (text + email + a select) → capture `id`.
5. `POST /forms/:id/publish` → status `PUBLISHED`, capture `slug`.
6. `GET /public/forms/:slug` (no cookie) → returns the public form.
7. `POST /public/forms/:slug/submissions` with valid data **plus an extra
   unexpected key** → 201, and confirm the extra key was **stripped** in step 9.
8. `POST /public/forms/:slug/submissions` with invalid data (bad option / missing
   required) → **422**.
9. `GET /forms/:id/submissions` with the cookie → contains the valid submission,
   without the stripped key.
10. `GET /forms` with **no** cookie → **401**.

Print a checklist of the 10 assertions with ✅/❌ and the observed HTTP codes.
This is the primary regression guard — call out any deviation loudly.
