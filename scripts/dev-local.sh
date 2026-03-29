#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "[error] docker ist nicht installiert."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[error] npm ist nicht installiert."
  exit 1
fi

echo "[dev] Starte PostgreSQL in Docker..."
docker compose up -d postgres

# Backend lokal: Verbindung auf localhost statt Container-Hostname.
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transcendence"
export JWT_SECRET="supersecret"

BACK_PID=""
FRONT_PID=""

cleanup() {
  echo ""
  echo "[dev] Beende Frontend/Backend..."
  if [ -n "$BACK_PID" ]; then kill "$BACK_PID" 2>/dev/null || true; fi
  if [ -n "$FRONT_PID" ]; then kill "$FRONT_PID" 2>/dev/null || true; fi
  wait 2>/dev/null || true

  echo "[dev] Stoppe PostgreSQL-Container..."
  docker compose stop postgres >/dev/null 2>&1 || true

  echo "[dev] Fertig."
}
trap cleanup INT TERM EXIT

echo "[dev] Starte Backend (Nest watch)..."
(
  cd apps/backend
  npm run start:dev
) &
BACK_PID=$!

echo "[dev] Starte Frontend (Next dev)..."
(
  cd apps/frontend
  npm run dev
) &
FRONT_PID=$!

echo "[dev] Umgebung laeuft:"
echo "      Frontend:  http://localhost:3000"
echo "      Backend:   http://localhost:4000"
echo "      Postgres:  localhost:5432"
echo ""
echo "[dev] Mit Ctrl+C beenden."

wait -n "$BACK_PID" "$FRONT_PID"
