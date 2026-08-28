#!/usr/bin/env bash
# Root-level entrypoint: sets up the network firewall (needs NET_ADMIN/
# NET_RAW, so it has to run before privileges are dropped), then hands off
# to user-entrypoint.sh as the unprivileged target user via gosu. Never runs
# anything from the repo or from Claude Code as root.
set -euo pipefail

# Default-allow internet, default-deny *outbound* private/VPN address space.
# This blocks the agent from *initiating* connections to your LAN/VPN, but
# must not block the container answering connections others initiate to it
# (e.g. your host hitting a dev server published from the container) — those
# replies also traverse OUTPUT, just for a connection someone else started.
# conntrack tells the two apart: ESTABLISHED/RELATED is reply/continuation
# traffic for a connection already tracked (allowed unconditionally, so dev
# servers stay reachable regardless of which private range the client is on)
# and only NEW connections — the container acting as *client* — get filtered
# by destination.
BLOCKED_RANGES=(
  10.0.0.0/8        # RFC1918
  172.16.0.0/12     # RFC1918
  192.168.0.0/16    # RFC1918
  169.254.0.0/16    # link-local
  100.64.0.0/10     # CGNAT / shared address space (Tailscale and similar VPNs)
)

iptables -A OUTPUT -o lo -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Explicit, narrow exceptions for specific private-range hosts actually
# needed (currently just the local Postgres sidecar) — set via ALLOWED_HOSTS,
# which run.sh fills in. Format: space-separated "ip" or "ip:port" entries.
# These punch a hole for exactly the named host (and port, if given), not the
# surrounding range — everything else in that range stays blocked.
for entry in ${ALLOWED_HOSTS:-}; do
  host="${entry%%:*}"
  if [[ "$entry" == *:* ]]; then
    port="${entry##*:}"
    iptables -A OUTPUT -p tcp -d "${host}/32" --dport "$port" -j ACCEPT
  else
    iptables -A OUTPUT -d "${host}/32" -j ACCEPT
  fi
done

for range in "${BLOCKED_RANGES[@]}"; do
  iptables -A OUTPUT -m conntrack --ctstate NEW -d "$range" -j DROP
done

: "${TARGET_UID:?TARGET_UID must be set by run.sh}"
: "${TARGET_GID:?TARGET_GID must be set by run.sh}"

# Give the target UID a name. Without an /etc/passwd entry every lookup of
# it fails, and anything rendering a user name -- bash's `\u` in PS1 first
# and foremost -- prints "I have no name!". The learner sees that on every
# prompt line in the course terminal, so the shell looks broken before they
# type anything. The UID is the host's, unknown at build time, which is why
# the image cannot carry this entry and it has to be written at startup.
# Home stays /home/agent: that is where the persisted volume is mounted.
if ! getent passwd "$TARGET_UID" >/dev/null; then
  echo "student:x:${TARGET_UID}:${TARGET_GID}::/home/agent:/bin/bash" >> /etc/passwd
fi

# /course is where the course terminal starts and where the learner's own
# context/ gets created by /101-init. It has to exist before privileges are
# dropped, because its parent is / and the unprivileged user cannot create it
# -- and it has to be OWNED by that user, or the very first course command
# fails on permissions rather than on anything the learner did.
#
# Only the path matters to the replay key; owner, mode, link count and mtime
# are normalised away (scripts/mock-llm/server.mjs, keyForText), so handing
# the directory to the learner does not cost a recording match.
#
# Recreated empty on every container start, on purpose: a leftover context/
# from a previous walk makes /101-init report a skeleton that already exists,
# which is not the demo. COURSE_TOOLKIT points at the 101 toolkit to seed;
# with nothing there, /course is still created and the skills are simply
# absent, which start-terminal.sh's own checks will surface.
COURSE_DIR="${COURSE_DIR:-/course}"
COURSE_TOOLKIT="${COURSE_TOOLKIT:-/workspace/.claude}"
rm -rf "${COURSE_DIR}"
install -d -m 755 -o "${TARGET_UID}" -g "${TARGET_GID}" "${COURSE_DIR}"
if [ -d "${COURSE_TOOLKIT}/skills" ]; then
  cp -a "${COURSE_TOOLKIT}" "${COURSE_DIR}/.claude"
  chown -R "${TARGET_UID}:${TARGET_GID}" "${COURSE_DIR}/.claude"
  chmod -R u=rwX,go=rX "${COURSE_DIR}/.claude"
else
  echo "entrypoint.sh: no toolkit at ${COURSE_TOOLKIT}/skills; ${COURSE_DIR} left empty." >&2
fi

# gosu looks up the target UID in /etc/passwd to set $HOME the way `su`
# would; when that UID has no entry there (the normal case — it's your host
# UID, not a user baked into the image), it resets HOME to `/` instead of
# leaving the image's HOME alone. Re-assert it explicitly for the process
# gosu execs, so git/npm/claude config all land in the persisted volume.
exec gosu "${TARGET_UID}:${TARGET_GID}" env HOME=/home/agent /usr/local/bin/user-entrypoint.sh "$@"
