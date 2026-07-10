# Production database readiness

GhostAPI supports Postgres as the durable production database without committing real database secrets.

## Current state

- Local development still uses SQLite through `node:sqlite`.
- Render carries the secret `DATABASE_URL` value.
- `GHOSTAPI_DATABASE_DRIVER=postgres` activates the Postgres adapter.
- Startup creates/verifies Postgres tables for users, organizations, memberships, workflows, workflow versions, runs, and API keys.
- `/v1/database/plan` reports database readiness without exposing the real connection string.
- API keys resolve tenant context, so different users do not have to share the default workspace.

## Safe Render environment

```bash
GHOSTAPI_DATABASE_DRIVER=postgres
DATABASE_URL=<Render Postgres connection string>
```

Keep `GHOSTAPI_DATABASE_DRIVER=sqlite` for local development unless you intentionally want local Postgres.

## Migration checklist

1. Keep SQLite as the local fallback.
2. Configure `DATABASE_URL` only in Render or the secret manager.
3. Set `GHOSTAPI_DATABASE_DRIVER=postgres`.
4. Redeploy Render so startup creates/verifies the Postgres schema.
5. If you need existing local SQLite data, run `npm run migrate:postgres` once from a trusted machine with `DATABASE_URL` set.
6. Verify `/v1/database/plan`.
7. Create a tenant through `POST /v1/accounts`.
8. Enable `GHOSTAPI_REQUIRE_API_KEY=true` after account bootstrap and extension calls are tested.
