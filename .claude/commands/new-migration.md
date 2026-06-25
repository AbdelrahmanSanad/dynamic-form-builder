---
description: Create and apply a Prisma migration for a schema change, using the repo's safe recipe.
argument-hint: "<migration-name> [what is changing]"
allowed-tools: Read, Edit, Bash, Grep, Glob
---

Create a Prisma migration named `$1`. Change: `$ARGUMENTS`.

Prefer delegating to the **db-migrator** agent, which owns this recipe. If doing
it inline, follow exactly:

1. Edit `backend/prisma/schema.prisma`. Any new required column on a non-empty
   table needs a default or a backfill plan — call that out.
2. Generate the migration:
   - If a dev DB is reachable: `cd backend && npm run prisma:migrate -- --name $1`.
   - If no DB is reachable, generate SQL via diff (no shadow DB needed):
     ```
     cd backend
     TS=$(date +%Y%m%d%H%M%S)
     mkdir -p prisma/migrations/${TS}_$1
     npx prisma migrate diff \
       --from-migrations prisma/migrations \
       --to-schema-datamodel prisma/schema.prisma \
       --script > prisma/migrations/${TS}_$1/migration.sql
     ```
     Confirm `prisma/migrations/migration_lock.toml` exists
     (`provider = "postgresql"`).
3. Apply against a running DB and regenerate the client:
   `npx prisma migrate deploy` then `npm run prisma:generate`.
4. Update affected service mappers / Zod DTOs, then run `npm run typecheck`.

Remember: the `prisma` CLI must stay in **dependencies** (the runtime image runs
`migrate deploy` on boot). Never edit an already-applied migration — add a new
one. Report the migration name, an SQL summary, and any required backfill.
