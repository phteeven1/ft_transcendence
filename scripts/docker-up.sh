#!/usr/bin/env bash
# Start the HTTPS Docker stack and advertise every LAN address of this machine.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ips=()

add_ip() {
  local ip="${1:-}"
  [[ -z "$ip" || "$ip" == "127.0.0.1" ]] && return 0
  local existing
  for existing in "${ips[@]+"${ips[@]}"}"; do
    [[ "$existing" == "$ip" ]] && return 0
  done
  ips+=("$ip")
}

if [[ "$(uname -s)" == "Darwin" ]]; then
  for iface in en0 en1 en2 en3; do
    add_ip "$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
  done
else
  if command -v hostname >/dev/null 2>&1; then
    for ip in $(hostname -I 2>/dev/null || true); do
      add_ip "$ip"
    done
  fi
  if command -v ip >/dev/null 2>&1; then
    while read -r ip; do
      add_ip "$ip"
    done < <(ip -4 -o addr show scope global | awk '{print $4}' | cut -d/ -f1)
  fi
fi

PUBLIC_HOST="${PUBLIC_HOST:-${ips[0]:-localhost}}"
CERT_SAN="localhost,127.0.0.1"
for ip in "${ips[@]+"${ips[@]}"}"; do
  CERT_SAN="${CERT_SAN},${ip}"
done

host_short="$(hostname -s 2>/dev/null || hostname | cut -d. -f1)"
if [[ -n "$host_short" && "$host_short" != "localhost" ]]; then
  CERT_SAN="${CERT_SAN},${host_short}.local"
fi

export PUBLIC_HOST CERT_SAN

echo "[docker] Dicteé HTTPS (same LAN / Wi-Fi as this machine):"
echo "         https://localhost"
for ip in "${ips[@]+"${ips[@]}"}"; do
  echo "         https://${ip}"
done
if [[ -n "$host_short" && "$host_short" != "localhost" ]]; then
  echo "         https://${host_short}.local"
fi
echo ""

exec docker compose up "$@"
