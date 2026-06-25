---
description: Build and start the full stack (db + api + web) with Docker Compose, then seed demo data.
allowed-tools: Bash
---

Bring up the full local stack via Docker Compose.

1. Confirm Docker is available (`docker compose version`); if not, tell the user
   and stop.
2. A `JWT_SECRET` (≥32 chars) is required by the api service. If `$JWT_SECRET` is
   not already set in the environment, export a local dev value for this run
   (note to the user that production must use a real secret).
3. From the repo root: `docker compose up --build -d`.
4. Wait for health: poll `http://localhost:4000/health` until it returns
   `status: ok` (give up after ~60s and show `docker compose logs api`).
5. Seed demo data: `docker compose exec -T api npm run db:seed`.

Then report the URLs and credentials:
- App: http://localhost:8080
- API: http://localhost:4000  · Docs (dev): http://localhost:4000/docs
- Demo login: `demo@example.com` / `password123`

Remind the user they can tear down with `docker compose down -v` (the `-v` also
drops the database volume).
