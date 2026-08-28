#!/usr/bin/env bash
# Starts ttyd, the terminal process behind the course's right-hand panel.
# ttyd 1.7.x flags used below: --port, --interface, --writable, --cwd.
set -euo pipefail

# Port comes from the environment; 7681 is ttyd's own default.
TERMINAL_PORT="${TERMINAL_PORT:-7681}"

# Repo working directory resolved from the script's own location
# (scripts/..), not from wherever the script happened to be invoked.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if ! command -v ttyd >/dev/null 2>&1; then
  echo "start-terminal.sh: 'ttyd' was not found in PATH." >&2
  echo "The terminal binary ships with the devcontainer image: rebuild it" >&2
  echo "(devcontainer/Dockerfile), restart the container, and try again." >&2
  exit 1
fi

# --interface 127.0.0.1 binds ttyd to loopback ONLY, never to all interfaces.
# This is a security requirement: ttyd in writable mode is an unauthenticated
# root-capable shell, and the container holds git credentials and API keys in
# its environment. Traffic reaches it only via the app server's proxy, never
# directly.
#
# --writable must be passed explicitly. Without it the terminal renders fine
# but silently ignores all keyboard input — an easy-to-misdiagnose failure.
exec ttyd \
  --port "${TERMINAL_PORT}" \
  --interface 127.0.0.1 \
  --writable \
  --cwd "${REPO_DIR}" \
  bash
