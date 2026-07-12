# Devops Minor — Health check

**Points:** 1 · **Category:** Devops

## Summary

Dicteé exposes a **`GET /health`** endpoint on the NestJS backend and a **`/status`** page on the frontend that displays the live response. The health check probes PostgreSQL via Prisma (`SELECT 1`) and returns `503` when the database is unreachable.

## Endpoints

| URL | Role |
|-----|------|
| `GET http://localhost:4000/health` | JSON health payload (API / Docker / monitoring) |
| `http://localhost:3000/status` | Human-readable status page |

## Response shape

```json
{
  "status": "ok",
  "timestamp": "2026-07-12T10:50:00.000Z",
  "uptime": 120,
  "version": "0.0.1",
  "checks": {
    "database": {
      "status": "up",
      "latencyMs": 4
    }
  }
}
```

- **200** when `status` is `"ok"`
- **503** when the database check fails (`status` is `"error"`)

Redis is provisioned in Docker but not used by application code yet, so it is not included in checks.

## Demo steps

1. With Docker running (`docker-compose up`), open **`/status`** in the browser
2. Show overall status **Healthy**, database **Up**, and latency in ms
3. Curl the API directly: `curl http://localhost:4000/health`
4. Optional: stop Postgres container and refresh `/status` — status becomes **Degraded** and API returns **503**
5. Show `docker-compose.yml` backend **healthcheck** hitting `/health`

## Implementation files

| Layer | Path |
|-------|------|
| Backend endpoint | `apps/backend/src/app.controller.ts`, `app.service.ts` |
| Types | `apps/backend/src/health.types.ts` |
| Frontend page | `apps/frontend/app/status/` |
| API client | `apps/frontend/lib/api/health/` |
| Docker | `docker-compose.yml` (backend healthcheck) |

## Eval talking points

- “Health endpoint is suitable for **load balancers** and **Docker healthchecks**.”
- “We verify **real database connectivity**, not just that the Node process is running.”
- “The **status page** is translated (en/de/fr) and linked from the footer.”
