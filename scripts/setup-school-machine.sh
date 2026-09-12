#!/bin/bash
# setup-school-machine.sh
# Run once per fresh 42 school machine. Next time on the same machine:
#   npm run build
#   or: bash scripts/docker-up.sh --build
# Fixes: rootless Docker filling up the tiny /home partition (ENOSPC).
# If a usable npm is on PATH (not school Node 12), also redirects npm's
# cache to /goinfre so later `npm run dev:local` does not fill /home.
#
# Usage:
#   chmod +x setup-school-machine.sh
#   ./setup-school-machine.sh

set -e

LOGIN="$(whoami)"
GOINFRE_DOCKER="/goinfre/${LOGIN}/docker"
GOINFRE_NPM_CACHE="/goinfre/${LOGIN}/npm-cache"
DAEMON_JSON="${HOME}/.config/docker/daemon.json"
SCHOOL_NODE_MAJOR="12"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "==> Setting up Docker for user: ${LOGIN}"

# ---------------------------------------------------------------------------
# 1. Sanity check: is /goinfre actually mounted and writable?
# ---------------------------------------------------------------------------
if [ ! -d "/goinfre/${LOGIN}" ]; then
    echo "!! /goinfre/${LOGIN} does not exist. Is /goinfre mounted on this machine?"
    df -h | grep goinfre || echo "!! No /goinfre mount found at all. Stopping."
    exit 1
fi

# ---------------------------------------------------------------------------
# 2. Point Docker's data-root at /goinfre (rootless Docker)
# ---------------------------------------------------------------------------
echo "==> Configuring Docker data-root -> ${GOINFRE_DOCKER}"
mkdir -p "${GOINFRE_DOCKER}"

# ~/.config/docker may already exist as a symlink into /goinfre on some
# machine images. Handle both that case and a plain fresh directory.
mkdir -p "$(dirname "${DAEMON_JSON}")" 2>/dev/null || true

if [ -L "${HOME}/.config/docker" ]; then
    TARGET="$(readlink -f "${HOME}/.config/docker")"
    echo "==> ~/.config/docker is a symlink -> ${TARGET}"
    mkdir -p "${TARGET}"
fi

cat > "${DAEMON_JSON}" <<EOF
{
  "data-root": "${GOINFRE_DOCKER}"
}
EOF
echo "==> Wrote ${DAEMON_JSON}"

# ---------------------------------------------------------------------------
# 3. Restart rootless Docker so the new data-root takes effect
# ---------------------------------------------------------------------------
echo "==> Restarting rootless Docker service"
systemctl --user stop docker 2>/dev/null || true
systemctl --user start docker

sleep 2
ACTUAL_ROOT="$(docker info 2>/dev/null | grep 'Docker Root Dir' | awk '{print $NF}')"
echo "==> Docker Root Dir is now: ${ACTUAL_ROOT}"

if [ "${ACTUAL_ROOT}" != "${GOINFRE_DOCKER}" ]; then
    echo "!! WARNING: Docker Root Dir does not match expected path."
    echo "!! Expected: ${GOINFRE_DOCKER}"
    echo "!! Got:      ${ACTUAL_ROOT}"
    echo "!! Check ${DAEMON_JSON} and 'systemctl --user status docker'."
fi

# ---------------------------------------------------------------------------
# 4. Point npm's cache at /goinfre when a usable npm is present
# ---------------------------------------------------------------------------
# No --global: that writes to /etc/npmrc (needs root). User-level ~/.npmrc
# is enough. Skip school Node 12 — it cannot run this repo, and we do not
# install nvm here. Host Node is only for `npm run dev:local`.
if command -v npm >/dev/null 2>&1; then
    NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || true)"
    if [ -n "${NODE_MAJOR}" ] && [ "${NODE_MAJOR}" != "${SCHOOL_NODE_MAJOR}" ]; then
        echo "==> Configuring npm cache -> ${GOINFRE_NPM_CACHE}"
        mkdir -p "${GOINFRE_NPM_CACHE}"
        npm config set cache "${GOINFRE_NPM_CACHE}"
    else
        echo "==> Skipping npm cache (need Node newer than ${SCHOOL_NODE_MAJOR} for dev:local)"
    fi
else
    echo "==> Skipping npm cache (npm not on PATH; Docker stack does not need it)"
fi

# ---------------------------------------------------------------------------
# 5. Report disk status, then start the HTTPS stack
# ---------------------------------------------------------------------------
echo ""
echo "==> Disk usage summary:"
df -h / /home/"${LOGIN}" /goinfre 2>/dev/null

echo "==> Starting HTTPS stack (same as npm run build)"
bash "${REPO_ROOT}/scripts/docker-up.sh" --build
