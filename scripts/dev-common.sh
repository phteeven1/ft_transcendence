#!/usr/bin/env bash
# Shared helpers for dev-local.sh and dev-stop.sh

dev_root_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd
}

DEV_STATE_DIR="$(dev_root_dir)/.dev"

dev_ensure_state_dir() {
  mkdir -p "$DEV_STATE_DIR"
}

# Kill whatever listens on a TCP port (Next, Nest, etc.)
dev_stop_port() {
  local port="$1"
  local label="${2:-port $port}"
  local pids

  if ! command -v lsof >/dev/null 2>&1; then
    echo "[warn] lsof nicht gefunden — kann $label nicht per Port beenden."
    return 0
  fi

  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -z "$pids" ]; then
    if [ "${DEV_STOP_QUIET:-false}" != true ]; then
      echo "[stop] $label: nichts aktiv"
    fi
    return 0
  fi

  echo "[stop] $label (Port $port)..."
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  sleep 1
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
  fi
  echo "[stop] $label: beendet"
}

dev_stop_pid_file() {
  local name="$1"
  local file="$DEV_STATE_DIR/$name.pid"

  if [ ! -f "$file" ]; then
    return 0
  fi

  local pid
  pid=$(cat "$file" 2>/dev/null || true)
  rm -f "$file"

  if [ -z "$pid" ] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi

  echo "[stop] Prozess $name (PID $pid)..."
  # Prozessgruppe beenden (Kindprozesse von npm/nest/next)
  local pgid
  pgid=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ' || true)
  if [ -n "$pgid" ] && [ "$pgid" != "0" ]; then
    kill -TERM -- "-$pgid" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  else
    kill -TERM "$pid" 2>/dev/null || true
  fi
  sleep 1
  if kill -0 "$pid" 2>/dev/null; then
    kill -KILL "$pid" 2>/dev/null || true
  fi
}

dev_stop_node_apps() {
  dev_stop_pid_file "dev-local"
  dev_stop_pid_file "backend"
  dev_stop_pid_file "frontend"
  dev_stop_port 4000 "Backend (Nest)"
  dev_stop_port 3000 "Frontend (Next)"
}

dev_stop_docker_services() {
  local down_all="${1:-false}"
  local remove_volumes="${2:-false}"

  if ! command -v docker >/dev/null 2>&1; then
    echo "[warn] docker nicht installiert."
    return 0
  fi

  cd "$(dev_root_dir)"

  if [ "$down_all" = true ]; then
    echo "[stop] Docker Compose: alle Services herunterfahren..."
    if [ "$remove_volumes" = true ]; then
      docker compose down -v --remove-orphans
      echo "[stop] Container und Volumes entfernt."
    else
      docker compose down --remove-orphans
      echo "[stop] Alle Container gestoppt."
    fi
  else
    echo "[stop] Docker: postgres + redis stoppen..."
    docker compose stop postgres redis 2>/dev/null || true
    echo "[stop] postgres/redis gestoppt (Frontend/Backend-Container unberührt)."
  fi
}
