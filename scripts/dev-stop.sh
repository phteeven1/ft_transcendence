#!/usr/bin/env bash
# Stop the local development environment.
#
# Usage:
#   ./scripts/dev-stop.sh              # stop Nest, Next, Postgres
#   ./scripts/dev-stop.sh --keep-db    # Node apps only; Docker DB stays up
#   ./scripts/dev-stop.sh --all        # docker compose down (all containers)
#   ./scripts/dev-stop.sh --purge      # down -v (deletes DB data)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=dev-common.sh
source "$ROOT_DIR/scripts/dev-common.sh"

KEEP_DB=false
DOWN_ALL=false
PURGE=false

for arg in "$@"; do
  case "$arg" in
    --keep-db) KEEP_DB=true ;;
    --all) DOWN_ALL=true ;;
    --purge) DOWN_ALL=true; PURGE=true ;;
    -h | --help)
      cat <<'EOF'
dev-stop.sh — stop the local dev environment

  ./scripts/dev-stop.sh
      Stop frontend (3000), backend (4000), postgres

  ./scripts/dev-stop.sh --keep-db
      Frontend/backend only; Postgres keeps running

  ./scripts/dev-stop.sh --all
      docker compose down (all services, including any frontend/backend containers)

  ./scripts/dev-stop.sh --purge
      Same as --all, also removes volumes (database data is gone)

Alternatively: npm run dev:stop
EOF
      exit 0
      ;;
    *)
      echo "[error] Unknown option: $arg (see --help)"
      exit 1
      ;;
  esac
done

echo "[stop] Stopping local development environment..."
echo ""

dev_stop_node_apps

if [ "$KEEP_DB" = false ]; then
  echo ""
  dev_stop_docker_services "$DOWN_ALL" "$PURGE"
fi

rm -f "$DEV_STATE_DIR/dev-local.pid" "$DEV_STATE_DIR/backend.pid" "$DEV_STATE_DIR/frontend.pid" 2>/dev/null || true

echo ""
echo "[stop] Done."
