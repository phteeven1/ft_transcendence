#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=dev-common.sh
source "$ROOT_DIR/scripts/dev-common.sh"

cd "$ROOT_DIR"
dev_ensure_state_dir
echo $$ >"$DEV_STATE_DIR/dev-local.pid"

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker is not installed."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[error] npm is not installed."
  exit 1
fi

dev_warn_node_version 26

LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transcendence"

echo "[dev] Checking npm dependencies..."
dev_ensure_npm_deps "$ROOT_DIR/packages/database" "prisma" "packages/database"
dev_ensure_npm_deps "$ROOT_DIR/apps/backend" "nest" "apps/backend"
dev_ensure_npm_deps "$ROOT_DIR/apps/frontend" "next" "apps/frontend"

echo "[dev] Starting PostgreSQL in Docker..."
docker compose up -d postgres

echo "[dev] Waiting for PostgreSQL..."
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres -d transcendence >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker compose exec -T postgres pg_isready -U postgres -d transcendence >/dev/null 2>&1; then
  if [ ! -f "apps/backend/.env" ]; then
    echo "[error] File apps/backend/.env not found"
  else
    echo "[error] PostgreSQL is not ready. Check: docker compose logs postgres"
  fi
  exit 1
fi

export DATABASE_URL="$LOCAL_DATABASE_URL"

echo "[dev] Applying database migrations..."
(
  cd packages/database
  DATABASE_URL="$LOCAL_DATABASE_URL" npm run db:migrate:deploy
)

echo "[dev] Generating Prisma Client..."
npm run db:generate

echo "[dev] Stopping leftover frontend/backend processes..."
DEV_STOP_QUIET=true
dev_stop_pid_file "backend"
dev_stop_pid_file "frontend"
dev_stop_port 4000 "Backend (Nest)"
dev_stop_port 3000 "Frontend (Next)"
unset DEV_STOP_QUIET

# Locally only Postgres runs in Docker — other containers would block ports
if command -v docker >/dev/null 2>&1; then
  docker compose stop backend frontend 2>/dev/null || true
fi

BACK_PID=""
FRONT_PID=""
DEV_CLEANUP_DONE=false

cleanup() {
  # EXIT and INT often both fire — extra Ctrl+C would otherwise print this twice
  if [ "$DEV_CLEANUP_DONE" = true ]; then
    return 0
  fi
  DEV_CLEANUP_DONE=true
  trap - INT TERM

  echo ""
  echo "[dev] Stopping frontend/backend..."
  DEV_STOP_QUIET=true
  dev_stop_pid_file "backend"
  dev_stop_pid_file "frontend"
  dev_stop_port 4000 "Backend (Nest)"
  dev_stop_port 3000 "Frontend (Next)"
  unset DEV_STOP_QUIET
  rm -f "$DEV_STATE_DIR/dev-local.pid" "$DEV_STATE_DIR/backend.pid" "$DEV_STATE_DIR/frontend.pid"
  echo "[dev] Node apps stopped. Postgres is still running."
  echo "[dev] Stop everything including the DB: npm run dev:stop"
}
trap cleanup INT TERM

echo "[dev] Starting backend (Nest watch)..."
(
  cd apps/backend
  DATABASE_URL="$LOCAL_DATABASE_URL" npm run start:dev
) &
BACK_PID=$!
echo "$BACK_PID" >"$DEV_STATE_DIR/backend.pid"

echo "[dev] Starting frontend (Next dev)..."
(
  cd apps/frontend
  npm run dev
) &
FRONT_PID=$!
echo "$FRONT_PID" >"$DEV_STATE_DIR/frontend.pid"

echo "[dev] Environment is up:"
echo "      Frontend:  http://localhost:3000"
echo "      Backend:   http://localhost:4000"
echo "      Postgres:  localhost:5432"
echo ""
echo "[dev] Stop:"
echo "      Ctrl+C (once)     — stops frontend/backend (Postgres keeps running)"
echo "      npm run dev:stop  — stop everything including Postgres"
echo ""
echo "[dev] Nest/Next need a few seconds to compile — URLs work after that."

# Do not use `wait -n` — macOS Bash 3.2 has no -n; wait would return immediately and trigger cleanup
sleep 2
for name_pid in "Backend:$BACK_PID" "Frontend:$FRONT_PID"; do
  name="${name_pid%%:*}"
  pid="${name_pid##*:}"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo ""
    echo "[error] $name exited immediately (PID $pid). Check logs above, or: npm run dev:stop && start again."
    cleanup
    exit 1
  fi
done

# Blocks until both processes exit (or Ctrl+C → cleanup via trap)
wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
