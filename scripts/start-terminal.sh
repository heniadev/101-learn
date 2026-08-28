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

# Where the learner's shell starts. This is NOT cosmetic when the mock LLM is
# in play: the mock keys a recorded answer on the whole conversation, and the
# conversation carries absolute paths inside tool results (`ls -la /course/`,
# "File created successfully at: /course/..."). The recordings in
# scripts/mock-llm/recordings/ were captured with the shell in /course, so a
# shell started anywhere else misses every key from the second turn on.
#
# Default stays REPO_DIR, so a container without /course behaves exactly as
# before. /course is picked up automatically when it exists, because the demo
# should not depend on remembering a flag.
if [ -n "${TERMINAL_CWD:-}" ]; then
  START_DIR="${TERMINAL_CWD}"
elif [ -d /course ]; then
  START_DIR=/course
else
  START_DIR="${REPO_DIR}"
fi

if [ ! -d "${START_DIR}" ]; then
  echo "start-terminal.sh: TERMINAL_CWD='${START_DIR}' is not a directory." >&2
  exit 1
fi

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
  # Pin the models to the ones the recordings were made with, read out of the
  # recordings themselves rather than written down here -- a constant in this
  # file would be one more thing that can silently drift away from the tape.
  #
  # It matters because the model is part of the replay key. The client picks a
  # model on its own and does not always pick the one that was recorded: it
  # reaches for claude-opus-5[1m] for some internal work, and "[1m]" alone is
  # enough to hash to a key nobody recorded. The small/fast model is pinned for
  # the same reason -- the conversation title was recorded on haiku and the
  # client now asks opus for it.
  REC_DIR="${MOCK_LLM_RECORDINGS:-${REPO_DIR}/scripts/mock-llm/recordings}"
  read -r MAIN_MODEL SMALL_MODEL <<<"$(node -e '
    const fs = require("fs");
    const dir = process.argv[1];
    const count = {};
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".sse"))) {
      try {
        const h = JSON.parse(fs.readFileSync(dir + "/" + f, "utf8").split("\n")[0]);
        if (h.model) count[h.model] = (count[h.model] || 0) + 1;
      } catch {}
    }
    const byUse = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([m]) => m);
    const small = byUse.find((m) => /haiku/.test(m)) ?? "";
    const main = byUse.find((m) => !/haiku/.test(m)) ?? "";
    process.stdout.write(main + " " + small);
  ' "${REC_DIR}" 2>/dev/null)" || true

  TERMINAL_ENV=(env "ANTHROPIC_BASE_URL=${MOCK_LLM_URL}")
  if [ -n "${MAIN_MODEL:-}" ]; then
    TERMINAL_ENV+=("ANTHROPIC_MODEL=${MAIN_MODEL}")
  fi
  if [ -n "${SMALL_MODEL:-}" ]; then
    TERMINAL_ENV+=("ANTHROPIC_SMALL_FAST_MODEL=${SMALL_MODEL}")
  fi
  echo "start-terminal.sh: course shells use the mock LLM at ${MOCK_LLM_URL}." >&2
  echo "start-terminal.sh: models pinned to '${MAIN_MODEL:-?}' / '${SMALL_MODEL:-?}' (from recordings)." >&2
fi

echo "start-terminal.sh: course shells start in ${START_DIR}." >&2

exec ttyd \
  --port "${TERMINAL_PORT}" \
  --interface 127.0.0.1 \
  --writable \
  --cwd "${START_DIR}" \
  -t "theme=${TERMINAL_THEME}" \
  -t 'fontFamily=SFMono-Regular, ui-monospace, JetBrains Mono, Menlo, Consolas, monospace' \
  -t fontSize=14 \
  -t cursorBlink=true \
  -t disableLeaveAlert=true \
  -t disableResizeOverlay=true \
  "${TERMINAL_ENV[@]}" \
  bash --rcfile "${REPO_DIR}/scripts/course-shell.bashrc"
