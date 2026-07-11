#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=dev-common.sh
source "$ROOT_DIR/scripts/dev-common.sh"

cd "$ROOT_DIR"
dev_ensure_state_dir
echo $$ >"$DEV_STATE_DIR/dev-local.pid"

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker ist nicht installiert."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[error] npm ist nicht installiert."
  exit 1
fi

dev_warn_node_version 22

LOCAL_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transcendence"

echo "[dev] Pruefe npm-Abhaengigkeiten..."
dev_ensure_npm_deps "$ROOT_DIR/packages/database" "prisma" "packages/database"
dev_ensure_npm_deps "$ROOT_DIR/apps/backend" "nest" "apps/backend"
dev_ensure_npm_deps "$ROOT_DIR/apps/frontend" "next" "apps/frontend"

echo "[dev] Starte PostgreSQL in Docker..."
docker compose up -d postgres

echo "[dev] Warte auf PostgreSQL..."
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres -d transcendence >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
if ! docker compose exec -T postgres pg_isready -U postgres -d transcendence >/dev/null 2>&1; then
  echo "[error] PostgreSQL ist nicht bereit. Pruefe: docker compose logs postgres"
  exit 1
fi

export DATABASE_URL="$LOCAL_DATABASE_URL"
export JWT_SECRET="${JWT_SECRET:-supersecret}"

echo "[dev] Wende Datenbank-Migrationen an..."
(
  cd packages/database
  DATABASE_URL="$LOCAL_DATABASE_URL" npm run db:migrate:deploy
)

echo "[dev] Generiere Prisma Client..."
npm run db:generate

echo "[dev] Raeume alte Frontend/Backend-Prozesse auf..."
DEV_STOP_QUIET=true
dev_stop_pid_file "backend"
dev_stop_pid_file "frontend"
dev_stop_port 4000 "Backend (Nest)"
dev_stop_port 3000 "Frontend (Next)"
unset DEV_STOP_QUIET

# Lokal nur Postgres in Docker — andere Container wuerden Ports blockieren
if command -v docker >/dev/null 2>&1; then
  docker compose stop backend frontend redis 2>/dev/null || true
fi

BACK_PID=""
FRONT_PID=""
DEV_CLEANUP_DONE=false

cleanup() {
  # EXIT + INT feuern oft beide — und mehrfaches Ctrl+C sonst 3× dieselbe Meldung
  if [ "$DEV_CLEANUP_DONE" = true ]; then
    return 0
  fi
  DEV_CLEANUP_DONE=true
  trap - INT TERM

  echo ""
  echo "[dev] Beende Frontend/Backend..."
  DEV_STOP_QUIET=true
  dev_stop_pid_file "backend"
  dev_stop_pid_file "frontend"
  dev_stop_port 4000 "Backend (Nest)"
  dev_stop_port 3000 "Frontend (Next)"
  unset DEV_STOP_QUIET
  rm -f "$DEV_STATE_DIR/dev-local.pid" "$DEV_STATE_DIR/backend.pid" "$DEV_STATE_DIR/frontend.pid"
  echo "[dev] Node-Apps gestoppt. Postgres laeuft noch."
  echo "[dev] Alles inkl. DB: npm run dev:stop"
}
trap cleanup INT TERM

echo "[dev] Starte Backend (Nest watch)..."
(
  cd apps/backend
  DATABASE_URL="$LOCAL_DATABASE_URL" JWT_SECRET="$JWT_SECRET" npm run start:dev
) &
BACK_PID=$!
echo "$BACK_PID" >"$DEV_STATE_DIR/backend.pid"

echo "[dev] Starte Frontend (Next dev)..."
(
  cd apps/frontend
  npm run dev
) &
FRONT_PID=$!
echo "$FRONT_PID" >"$DEV_STATE_DIR/frontend.pid"

echo "[dev] Umgebung laeuft:"
echo "      Frontend:  http://localhost:3000"
echo "      Backend:   http://localhost:4000"
echo "      Postgres:  localhost:5432"
echo ""
echo "[dev] Beenden:"
echo "      Ctrl+C (einmal)  — stoppt Frontend/Backend (Postgres laeuft weiter)"
echo "      npm run dev:stop — alles inkl. Postgres/Redis sauber stoppen"
echo ""
echo "[dev] Nest/Next brauchen einige Sekunden zum Kompilieren — erst dann sind die URLs erreichbar."

# Wichtig: kein `wait -n` — auf macOS (Bash 3.2) gibt es -n nicht; wait endet sofort → cleanup lief los
sleep 2
for name_pid in "Backend:$BACK_PID" "Frontend:$FRONT_PID"; do
  name="${name_pid%%:*}"
  pid="${name_pid##*:}"
  if ! kill -0 "$pid" 2>/dev/null; then
    echo ""
    echo "[error] $name ist sofort beendet (PID $pid). Logs oben pruefen oder: npm run dev:stop && erneut starten."
    cleanup
    exit 1
  fi
done

# Blockiert bis beide Prozesse enden (oder Ctrl+C → cleanup via trap)
wait "$BACK_PID" "$FRONT_PID" 2>/dev/null || true
