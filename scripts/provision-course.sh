#!/usr/bin/env bash
# Recreates /course -- the directory the learner's shell starts in.
#
# WHY THIS EXISTS AND WHY IT IS FUSSY: the demo terminal replays recorded
# answers, and the mock keys each answer on the whole conversation
# (scripts/mock-llm/server.mjs, keyFor). Tool results are part of that
# conversation, and the very first thing /101-init does is
#
#   ls -la /course/ && echo ---CONTEXT--- ; ls -la /course/context/ ...
#
# whose output went into the recording verbatim:
#
#   Exit code 2
#   total 12
#   drwxr-xr-x 3 root root 4096 .
#   drwxr-xr-x 1 root root 4096 ..
#   drwxr-xr-x 4 root root 4096 .claude
#
# The mock's normaliser strips dates, times and client-minted ids -- it does
# NOT strip the path, the owner, the mode, the link count or `total 12`. So
# every one of those has to come back exactly, or the answer to step 1 is a
# 400 and the demo stops on its first command. In particular:
#
#   * the path must be /course, not a copy somewhere else;
#   * owner must be root:root, mode 755;
#   * /course must hold EXACTLY .claude and nothing else (link count 3,
#     `total 12`) -- no git repo, no context/, no stray dotfile;
#   * .claude must hold exactly two subdirectories (link count 4), which is
#     what the repo's own .claude/ has: skills/ and worktrees/.
#
# Run as root (the parent is /), then start the terminal:
#
#   sudo scripts/provision-course.sh
#   TERMINAL_LLM_MOCK=1 npm run terminal
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COURSE_DIR="${COURSE_DIR:-/course}"
TOOLKIT="${REPO_DIR}/.claude"

if [ "$(id -u)" -ne 0 ]; then
  echo "provision-course.sh: needs root -- ${COURSE_DIR}'s parent is owned by root." >&2
  echo "Re-run as: sudo scripts/provision-course.sh" >&2
  exit 1
fi

if [ ! -d "${TOOLKIT}/skills" ]; then
  echo "provision-course.sh: no toolkit at ${TOOLKIT}/skills." >&2
  echo "The 101 toolkit lives in its own repo and is gitignored here; restore" >&2
  echo "it into ${TOOLKIT} before provisioning." >&2
  exit 1
fi

# Refuse to clobber a walked-through /course silently: the learner's context/
# and docs/ are the visible proof the course worked, and someone may still
# want to look at them. Resetting between rehearsals is what --force is for.
if [ -d "${COURSE_DIR}" ]; then
  leftovers="$(find "${COURSE_DIR}" -mindepth 1 -maxdepth 1 ! -name .claude -print -quit)"
  if [ -n "${leftovers}" ] && [ "${1:-}" != "--force" ]; then
    echo "provision-course.sh: ${COURSE_DIR} already holds more than .claude" >&2
    echo "(e.g. ${leftovers}) -- a previous walk, probably." >&2
    echo "Re-run with --force to reset it to a fresh start." >&2
    exit 1
  fi
  rm -rf "${COURSE_DIR}"
fi

install -d -m 755 -o root -g root "${COURSE_DIR}"
cp -a "${TOOLKIT}" "${COURSE_DIR}/.claude"
chown -R root:root "${COURSE_DIR}"
chmod 755 "${COURSE_DIR}" "${COURSE_DIR}/.claude"

# Show what the agent's own first command will see, so a mismatch is caught
# here rather than as a 400 on stage. Compare against the block quoted above.
echo "provision-course.sh: ${COURSE_DIR} ready. What step 1 will see:"
ls -la "${COURSE_DIR}/"
echo
entries="$(find "${COURSE_DIR}" -mindepth 1 -maxdepth 1 | wc -l)"
subdirs="$(find "${COURSE_DIR}/.claude" -mindepth 1 -maxdepth 1 -type d | wc -l)"
[ "${entries}" -eq 1 ] || echo "WARNING: expected exactly 1 entry, found ${entries}." >&2
[ "${subdirs}" -eq 2 ] || echo "WARNING: expected .claude to hold 2 subdirectories, found ${subdirs}." >&2
