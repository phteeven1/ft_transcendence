#!/usr/bin/env bash
# Sauberes Herunterfahren der lokalen Entwicklungsumgebung.
#
# Nutzung:
#   ./scripts/dev-stop.sh              # Nest, Next, Postgres/Redis stoppen
#   ./scripts/dev-stop.sh --keep-db  # Nur Node-Apps, Docker-DB bleibt an
#   ./scripts/dev-stop.sh --all        # docker compose down (alle Container)
#   ./scripts/dev-stop.sh --purge      # down -v (löscht DB-Daten!)

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
dev-stop.sh — lokale Dev-Umgebung beenden

  ./scripts/dev-stop.sh
      Stoppt Frontend (3000), Backend (4000), postgres

  ./scripts/dev-stop.sh --keep-db
      Nur Frontend/Backend; Postgres/Redis laufen weiter

  ./scripts/dev-stop.sh --all
      docker compose down (alle Services inkl. ggf. Frontend/Backend-Container)

  ./scripts/dev-stop.sh --purge
      Wie --all, löscht zusätzlich Volumes (Datenbank-Daten weg!)

Alternativ: npm run dev:stop
EOF
      exit 0
      ;;
    *)
      echo "[error] Unbekannte Option: $arg (siehe --help)"
      exit 1
      ;;
  esac
done

echo "[stop] Beende lokale Entwicklungsumgebung..."
echo ""

dev_stop_node_apps

if [ "$KEEP_DB" = false ]; then
  echo ""
  dev_stop_docker_services "$DOWN_ALL" "$PURGE"
fi

rm -f "$DEV_STATE_DIR/dev-local.pid" "$DEV_STATE_DIR/backend.pid" "$DEV_STATE_DIR/frontend.pid" 2>/dev/null || true

echo ""
echo "[stop] Fertig."
