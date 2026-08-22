#!/bin/bash
# setup-school-machine.sh
# Run once per fresh 42 school machine, before `docker compose up --build`.
# Fixes: rootless Docker filling up the tiny /home partition (ENOSPC),
# and redirects npm's cache off /home too.
#
# Usage:
#   chmod +x setup-school-machine.sh
#   ./setup-school-machine.sh

set -e

LOGIN="$(whoami)"
GOINFRE_DOCKER="/goinfre/${LOGIN}/docker"
GOINFRE_NPM_CACHE="/goinfre/${LOGIN}/npm-cache"
DAEMON_JSON="${HOME}/.config/docker/daemon.json"

echo "==> Setting up Docker + npm for user: ${LOGIN}"

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
# 4. Point npm's cache at /goinfre too (also fills /home otherwise)
# ---------------------------------------------------------------------------
echo "==> Configuring npm cache -> ${GOINFRE_NPM_CACHE}"
mkdir -p "${GOINFRE_NPM_CACHE}"
# No --global here: --global writes to npm's system-wide /etc/npmrc, which
# needs root. Without it, npm writes to the user-level ~/.npmrc instead,
# which is what we want and needs no special permissions.
npm config set cache "${GOINFRE_NPM_CACHE}"

# ---------------------------------------------------------------------------
# 5. Report disk status
# ---------------------------------------------------------------------------
echo ""
echo "==> Disk usage summary:"
df -h / /home/"${LOGIN}" /goinfre 2>/dev/null

echo ""
echo "==> Done. You can now run: docker compose up --build"
echo "==> Note: nginx must map its HOST port as 8080:80 (not 80:80) in"
echo "==> docker-compose.yml, since rootless Docker can't bind port 80."
