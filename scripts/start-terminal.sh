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
# Client options (-t key=value) reach the browser as terminal preferences over
# the websocket, so the terminal wears the app's palette instead of xterm's
# default grey. Same tokens as app/app.css -- if one changes, change both.
#
# disableLeaveAlert matters for the product rule, not for looks: reloading the
# page is how the course resets (FR-080), and the browser's "leave site?"
# prompt would stand in the way of it.
TERMINAL_THEME='{
  "background": "#08090b", "foreground": "#c9d2dc",
  "cursor": "#6ee7a8", "cursorAccent": "#08090b",
  "selectionBackground": "#6ee7a833",
  "black": "#0b0d10", "red": "#f2807c", "green": "#6ee7a8",
  "yellow": "#f2bd72", "blue": "#7cc7ff", "magenta": "#c0b3ff",
  "cyan": "#7ee3d8", "white": "#c9d2dc",
  "brightBlack": "#6b7787", "brightRed": "#ff9d99", "brightGreen": "#8af0bb",
  "brightYellow": "#ffd79b", "brightBlue": "#a5dbff", "brightMagenta": "#d6cdff",
  "brightCyan": "#9df0e6", "brightWhite": "#e7eaef"
}'
# The learner's shell talks to the mock LLM, not the live API, so the demo is
# deterministic and costs nothing (scripts/mock-llm/README.md). Scoped to the
# shells ttyd spawns -- your own agent session in this container is untouched,
# which is what lets you keep working against the real model while the course
# terminal replays. Opt-in, because the mock is useless until it has
# recordings.
TERMINAL_ENV=()
if [ "${TERMINAL_LLM_MOCK:-0}" = "1" ]; then
  MOCK_LLM_URL="${MOCK_LLM_URL:-http://127.0.0.1:${MOCK_LLM_PORT:-7999}}"
  if ! curl -sf -o /dev/null --max-time 2 "${MOCK_LLM_URL}/health"; then
    echo "start-terminal.sh: TERMINAL_LLM_MOCK=1 but no mock at ${MOCK_LLM_URL}." >&2
    echo "Start it with 'npm run mock-llm', or unset TERMINAL_LLM_MOCK to use" >&2
    echo "the live API." >&2
    exit 1
  fi
  TERMINAL_ENV=(env "ANTHROPIC_BASE_URL=${MOCK_LLM_URL}")
  echo "start-terminal.sh: course shells use the mock LLM at ${MOCK_LLM_URL}." >&2
fi

exec ttyd \
  --port "${TERMINAL_PORT}" \
  --interface 127.0.0.1 \
  --writable \
  --cwd "${REPO_DIR}" \
  -t "theme=${TERMINAL_THEME}" \
  -t 'fontFamily=SFMono-Regular, ui-monospace, JetBrains Mono, Menlo, Consolas, monospace' \
  -t fontSize=14 \
  -t cursorBlink=true \
  -t disableLeaveAlert=true \
  -t disableResizeOverlay=true \
  "${TERMINAL_ENV[@]}" \
  bash
