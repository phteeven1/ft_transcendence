# Frontend API layer

The full architecture (database, backend, frontend, dev workflow) is documented in the repo root:

**[DATABASE_SETUP.md](../../DATABASE_SETUP.md)** — especially [§5 Frontend API layer](../../DATABASE_SETUP.md#5-frontend-api-layer-dumb-ui).

Quick rule: pages call `usersApi`, `groupsApi`, etc. from `@/lib/api` — never `fetch('http://localhost:4000/...')` in `app/`.
