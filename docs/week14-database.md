# Week 14 database readiness

GhostAPI is prepared for the production database migration path without committing real database secrets.

## Current state

- Local development still uses SQLite through `node:sqlite`.
- Render can carry a secret `DATABASE_URL` value.
- `GHOSTAPI_DATABASE_DRIVER` declares the intended storage driver.
- `/v1/database/plan` reports database readiness without exposing the real connection string.

## Safe Render environment

```bash
GHOSTAPI_DATABASE_DRIVER=postgres
DATABASE_URL=<Render Postgres connection string>
```

Keep `GHOSTAPI_DATABASE_DRIVER=sqlite` until the Postgres storage adapter is fully wired.

## Migration checklist

1. Keep SQLite as the local fallback.
2. Configure `DATABASE_URL` only in Render or the secret manager.
3. Add the Postgres storage adapter for users, organizations, workflows, runs, and API keys.
4. Run the schema migration against Postgres.
5. Verify `/v1/database/plan`.
6. Enable required API keys after persistence is stable.
