#!/bin/bash
# setup-school-machine.sh
# Run once per fresh 42 school machine. Next time on same machine
# npm run build
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
REQUIRED_NODE_VERSION="22"

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
# 4. Make sure nvm exists and Node ${REQUIRED_NODE_VERSION} is active
# ---------------------------------------------------------------------------
# School machines default to an ancient system Node (seen: v12.22.9), which
# predates optional chaining (?.) and breaks postinstall scripts of modern
# packages (e.g. unrs-resolver) with a SyntaxError. Home persists across
# school machines, but we cannot assume:
#   - nvm is installed at all on this machine's home dir
#   - nvm's init lines are present/sourced in .bashrc (they may be missing,
#     or this may be a non-interactive/non-login shell that skips .bashrc)
# So we install nvm if missing, and always source it directly by path
# rather than relying on .bashrc having done it for us.
echo "==> Checking for nvm"

export NVM_DIR="${HOME}/.nvm"

if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
  echo "==> nvm not found at ${NVM_DIR} — installing nvm"
  # Official install script only appends init lines to a shell profile;
  # it does not download Node itself. Safe to re-run (idempotent).
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi

if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
  echo "!! nvm install appears to have failed — ${NVM_DIR}/nvm.sh still missing."
  echo "!! Check network access and try installing manually: https://github.com/nvm-sh/nvm"
  exit 1
fi

# shellcheck disable=SC1091
\. "${NVM_DIR}/nvm.sh"

if ! nvm list "${REQUIRED_NODE_VERSION}" >/dev/null 2>&1; then
  echo "==> Node ${REQUIRED_NODE_VERSION} not installed yet, installing via nvm"
  nvm install "${REQUIRED_NODE_VERSION}"
fi

nvm use "${REQUIRED_NODE_VERSION}"
echo "==> Active Node version: $(node -v)"

if ! grep -q 'NVM_DIR' "${HOME}/.bashrc" 2>/dev/null; then
  echo "==> Adding nvm init lines to ~/.bashrc for future interactive shells"
  {
    echo ''
    echo '# Added by setup-school-machine.sh'
    echo 'export NVM_DIR="$HOME/.nvm"'
    echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'
  } >> "${HOME}/.bashrc"
fi

# ---------------------------------------------------------------------------
# 5. Point npm's cache at /goinfre too (also fills /home otherwise)
# ---------------------------------------------------------------------------
echo "==> Configuring npm cache -> ${GOINFRE_NPM_CACHE}"
mkdir -p "${GOINFRE_NPM_CACHE}"
# No --global here: --global writes to npm's system-wide /etc/npmrc, which
# needs root. Without it, npm writes to the user-level ~/.npmrc instead,
# which is what we want and needs no special permissions.
npm config set cache "${GOINFRE_NPM_CACHE}"

# ---------------------------------------------------------------------------
# 6. Install dependencies per app
# ---------------------------------------------------------------------------
# Root package.json has no "workspaces" field, so a root-level npm install
# does NOT install apps/backend or apps/frontend dependencies. Each app
# needs its own install, run under Node ${REQUIRED_NODE_VERSION}.
#
# This script lives in <repo-root>/scripts/, so the repo root is one level
# up from the script's own directory — not the script's directory itself.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

for APP_DIR in "${REPO_ROOT}/apps/backend" "${REPO_ROOT}/apps/frontend"; do
  if [ -f "${APP_DIR}/package.json" ]; then
    echo "==> npm install in ${APP_DIR}"
    (cd "${APP_DIR}" && npm install)
  else
    echo "!! Skipping ${APP_DIR} (no package.json found)"
  fi
done

# ---------------------------------------------------------------------------
# 7. Report disk status
# ---------------------------------------------------------------------------
echo ""
echo "==> Disk usage summary:"
df -h / /home/"${LOGIN}" /goinfre 2>/dev/null

# Run from the actual repo root, not wherever this script was invoked from.
(cd "${REPO_ROOT}" && npm run build)
