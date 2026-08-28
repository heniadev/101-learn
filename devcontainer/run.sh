#!/usr/bin/env bash
# Launch Claude Code inside an isolated Docker container with this repo
# mounted as the workspace. See devcontainer/README.md for the security
# properties and limitations of this setup.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="101-learn-devcontainer"
NETWORK_NAME="101-learn-devcontainer-net"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required but not found on PATH." >&2
  exit 1
fi

# Always resolve to the *main* repo checkout, never whichever worktree this
# script happens to be invoked from — every concurrent instance mounts the
# same shared workspace; the agent decides which worktree (under
# .worktrees/) to actually work in once inside the container. Anchored on
# --git-common-dir (shared across all linked worktrees of one repo), not
# --show-toplevel (which returns the *invoking* worktree's own path).
GIT_COMMON_DIR="$(git -C "$SCRIPT_DIR" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
if [ -z "$GIT_COMMON_DIR" ]; then
  # git predates 2.31 (no --path-format flag) — a relative result from
  # `git -C "$SCRIPT_DIR" ...` is relative to $SCRIPT_DIR, not the caller's
  # cwd, so resolve it manually from there.
  RAW_COMMON_DIR="$(git -C "$SCRIPT_DIR" rev-parse --git-common-dir 2>/dev/null || true)"
  if [ -n "$RAW_COMMON_DIR" ]; then
    GIT_COMMON_DIR="$(cd "$SCRIPT_DIR" && cd "$RAW_COMMON_DIR" && pwd)"
  fi
fi

if [ -n "$GIT_COMMON_DIR" ]; then
  REPO_ROOT="$(dirname "$GIT_COMMON_DIR")"
else
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
fi

# Concurrent-instance support is strictly opt-in — a bare invocation with
# DEVCONTAINER_INSTANCE unset must behave exactly as it did before this
# existed: literal resource names, no registry entry, no extra ceremony.
# Setting DEVCONTAINER_INSTANCE=<name> opts into a distinct, independently
# addressable instance instead (its own port/database/$HOME volume),
# registered here so devcontainer/cleanup.sh can list/remove it later. The
# registry lives under the shared REPO_ROOT resolved above, not $SCRIPT_DIR,
# so it's the same location regardless of which worktree's copy of this
# script is invoked.
INSTANCE_NAME="${DEVCONTAINER_INSTANCE:-}"
if [ -n "$INSTANCE_NAME" ]; then
  # Reused as a Docker volume name, a `docker run --name`, and a
  # double-quoted Postgres identifier — keep it simple and safe for all three.
  # SAFETY INVARIANT: this pattern is the *only* thing preventing SQL
  # injection into the psql calls below (no quotes/semicolons allowed) — if
  # this regex is ever loosened, the SELECT/CREATE DATABASE/DROP DATABASE
  # calls that interpolate INSTANCE_NAME (this file and cleanup.sh) need a
  # second look, since they have no other defense-in-depth.
  if ! [[ "$INSTANCE_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
    echo "DEVCONTAINER_INSTANCE must match ^[a-z][a-z0-9-]*\$ (lowercase letters, digits, hyphens, starting with a letter) — got '${INSTANCE_NAME}'." >&2
    exit 1
  fi

  INSTANCE_DIR="${REPO_ROOT}/.instances/${INSTANCE_NAME}"
  mkdir -p "$INSTANCE_DIR"
  [ -f "${INSTANCE_DIR}/created-at" ] || date -u +"%Y-%m-%dT%H:%M:%SZ" > "${INSTANCE_DIR}/created-at"
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "${INSTANCE_DIR}/last-used"
  echo "Instance mode: '${INSTANCE_NAME}' (registry: ${INSTANCE_DIR})" >&2
fi

# Per-instance $HOME volume, so a named instance's Claude Code session/
# config/caches persist independently of the legacy/bare instance's. The
# legacy/bare path keeps the literal volume name unchanged.
if [ -n "$INSTANCE_NAME" ]; then
  HOME_VOLUME="101-learn-devcontainer-home-${INSTANCE_NAME}"
else
  HOME_VOLUME="101-learn-devcontainer-home"
fi

# node_modules lives in its own named volume rather than in the bind-mounted
# repo: the workspace mount is network-backed, and symlinks under
# node_modules/.bin are unreadable there ("Operation not permitted"), which
# breaks every `npm run *`. A local volume has no such restriction. Derived
# by the same per-instance pattern as HOME_VOLUME above so the two read as
# siblings — each named instance gets its own dependency tree, and the
# legacy/bare path keeps a literal volume name.
if [ -n "$INSTANCE_NAME" ]; then
  NODE_MODULES_VOLUME="101-learn-devcontainer-node-modules-${INSTANCE_NAME}"
else
  NODE_MODULES_VOLUME="101-learn-devcontainer-node-modules"
fi

HOST_UID="$(id -u)"
HOST_GID="$(id -g)"

if [ "$HOST_UID" -eq 0 ]; then
  echo "Refusing to run as host root — that defeats the point of a rootless devcontainer." >&2
  exit 1
fi

echo "Building devcontainer image..." >&2
docker build -t "$IMAGE_NAME" "$SCRIPT_DIR" >&2

# A user-defined network gives the container Docker's embedded DNS resolver
# (127.0.0.11, i.e. loopback) instead of whatever DNS server the default
# bridge network would hand it — which is sometimes a private-range address.
# That matters here specifically because the firewall below blocks private
# ranges as destinations; DNS needs to keep working regardless.
docker network inspect "$NETWORK_NAME" >/dev/null 2>&1 || docker network create "$NETWORK_NAME" >&2

# Local Postgres for testing/dev before commits (devcontainer/docker-compose.yml).
# Joins the network created above (declared `external: true` in the compose
# file) so the devcontainer can reach it by service name via Docker's
# embedded DNS. `--wait` blocks until its healthcheck passes, so nothing
# downstream races against a not-yet-ready database.
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required but not found." >&2
  exit 1
fi
echo "Starting local Postgres (devcontainer/docker-compose.yml)..." >&2
docker compose -f "$COMPOSE_FILE" up -d --wait postgres >&2

# In instance mode, each named instance gets its own logical database inside
# this one shared Postgres server/container/volume — Postgres has no native
# `CREATE DATABASE IF NOT EXISTS`, so existence has to be checked first. The
# legacy/bare path keeps using the default database docker-compose.yml
# already creates via POSTGRES_DB (101-learn_dev), unchanged.
if [ -n "$INSTANCE_NAME" ]; then
  DATABASE_NAME="$INSTANCE_NAME"
  # SQL-safety here depends entirely on INSTANCE_NAME already having passed
  # the ^[a-z][a-z0-9-]*$ check above (no quotes/semicolons possible) — see
  # the SAFETY INVARIANT note at that validation site.
  DB_EXISTS="$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U app -d 101-learn_dev -tAc "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}'")"
  if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating Postgres database '${DATABASE_NAME}' for this instance..." >&2
    docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U app -d 101-learn_dev -c "CREATE DATABASE \"${DATABASE_NAME}\"" >&2
  fi
else
  DATABASE_NAME="101-learn_dev"
fi

# The devcontainer's own outbound firewall (entrypoint.sh) blocks *new*
# connections to RFC1918 address space by default — which includes this
# sidecar's IP, since it lives on the same user-defined bridge network as
# the devcontainer. Punch a narrow /32 exception for it (see ALLOWED_HOSTS_LIST,
# consumed by entrypoint.sh). Resolved fresh every run rather than hardcoded,
# since compose can reassign the container's IP on recreation (e.g. after
# `down -v`).
POSTGRES_CONTAINER_ID="$(docker compose -f "$COMPOSE_FILE" ps -q postgres)"
POSTGRES_IP="$(docker inspect -f "{{(index .NetworkSettings.Networks \"${NETWORK_NAME}\").IPAddress}}" "$POSTGRES_CONTAINER_ID")"
ALLOWED_HOSTS_LIST=("${POSTGRES_IP}:5432")

RUN_ARGS=(
  --rm -it
  --network "$NETWORK_NAME"
  --cap-drop=ALL
  --cap-add=NET_ADMIN
  --cap-add=NET_RAW
  --cap-add=SETUID
  --cap-add=SETGID
  --security-opt no-new-privileges
  --pids-limit 512
  -e "TARGET_UID=${HOST_UID}"
  -e "TARGET_GID=${HOST_GID}"
  -e "DATABASE_URL=postgresql://app:app@postgres:5432/${DATABASE_NAME}"
  -v "${REPO_ROOT}:/workspace"
  -v "${HOME_VOLUME}:/home/agent"
  # Mounted *over* /workspace inside the bind-mounted repo, so the checkout's
  # own node_modules (if any) is shadowed — hidden while the container runs,
  # not deleted, and back untouched on the host afterwards. A fresh volume
  # starts EMPTY, so dependencies have to be installed once (`npm install`)
  # after an instance's first start. The image pre-creates /workspace/node_modules
  # with mode 0777, and Docker seeds a new volume from that mount point's
  # image content — so the empty volume inherits world-writable permissions
  # and stays writable for whatever arbitrary UID the entrypoint runs as.
  -v "${NODE_MODULES_VOLUME}:/workspace/node_modules"
  -w /workspace
)

# Named instances get an explicit container name (this is also what makes
# the name known *before* `docker run`, needed for the -v/-e args above).
# The legacy/bare path passes no --name at all (Docker auto-assigns one;
# irrelevant since --rm removes the container on exit).
if [ -n "$INSTANCE_NAME" ]; then
  RUN_ARGS+=(--name "101-learn-devcontainer-${INSTANCE_NAME}")
fi

# Publish dev-server ports to the host. Needed regardless of the firewall —
# even with zero iptables rules, this Docker setup doesn't route the host
# directly into the container's bridge network (common for Docker Desktop /
# Rancher Desktop VM-backed setups on macOS); `-p` is what makes
# `localhost:<port>` on the host work. Space-separated; override with
# DEVCONTAINER_PORTS (default matches `npm run dev`'s Vite port).
#
# In instance mode, the *host* port may need to differ from the app's real
# listening port inside the container (another instance could already hold
# the default) — probe for a free one starting at the same number. The
# legacy/bare path keeps today's exact 1:1 host:container mapping.
find_free_host_port() {
  local candidate="$1"
  # Success means something's already listening there (connection succeeds);
  # failure (e.g. connection refused) means the port is free to publish on.
  while (echo >"/dev/tcp/127.0.0.1/${candidate}") 2>/dev/null; do
    candidate=$((candidate + 1))
  done
  echo "$candidate"
}

# Recorded as we go and passed into the container below (DEVCONTAINER_PORT_MAP)
# so an agent running *inside* the container — which has no way to introspect
# a `-p host:container` mapping from its own network namespace — can still
# answer "which host port am I actually reachable on" by reading one env var,
# in either mode.
#
# Published on 127.0.0.1 only, never on all host interfaces. The app proxies
# /terminal to ttyd (vite.config.ts), and ttyd runs in writable mode -- so a
# port bound to 0.0.0.0 hands an unauthenticated shell, in a container holding
# git credentials and API keys, to anything that can reach this machine.
# Binding the loopback keeps the host browser working and nothing else.
PORT_MAP=""

if [ -n "$INSTANCE_NAME" ]; then
  for container_port in ${DEVCONTAINER_PORTS:-5173}; do
    host_port="$(find_free_host_port "$container_port")"
    RUN_ARGS+=(-p "127.0.0.1:${host_port}:${container_port}")
    echo "Publishing container port ${container_port} on host port ${host_port}." >&2
    PORT_MAP="${PORT_MAP}${PORT_MAP:+ }${container_port}:${host_port}"
  done
else
  for port in ${DEVCONTAINER_PORTS:-5173}; do
    RUN_ARGS+=(-p "127.0.0.1:${port}:${port}")
    PORT_MAP="${PORT_MAP}${PORT_MAP:+ }${port}:${port}"
  done
fi

RUN_ARGS+=(-e "DEVCONTAINER_PORT_MAP=${PORT_MAP}")

if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  RUN_ARGS+=(-e "ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}")
else
  echo "Heads-up: ANTHROPIC_API_KEY is not set on the host." >&2
  echo "Claude Code will prompt you to log in inside the container instead" >&2
  echo "(that session persists in the '${HOME_VOLUME}' volume for next time)." >&2
fi

# Git credentials for pushing from inside the container, sourced from
# devcontainer/creds.yaml (gitignored, never baked into the image — passed as
# env vars at `docker run` time only). Re-read on every start on purpose: the
# credential store lives on the $HOME volume and would otherwise keep serving
# a rotated-out token forever. Flat line-based parsing, because the schema is
# fixed and flat.
CREDS_FILE="$SCRIPT_DIR/creds.yaml"
GIT_REMOTE=""
GIT_USERNAME=""
GIT_PASSWORD=""
AUTHOR_NAME=""
AUTHOR_EMAIL=""
if [ -f "$CREDS_FILE" ]; then
  GIT_REMOTE="$(sed -n 's/^[[:space:]]*remote:[[:space:]]*//p' "$CREDS_FILE" | head -n1)"
  GIT_USERNAME="$(sed -n 's/^[[:space:]]*username:[[:space:]]*//p' "$CREDS_FILE" | head -n1)"
  GIT_PASSWORD="$(sed -n 's/^[[:space:]]*password:[[:space:]]*//p' "$CREDS_FILE" | head -n1)"
  AUTHOR_NAME="$(sed -n 's/^[[:space:]]*fullname:[[:space:]]*//p' "$CREDS_FILE" | head -n1)"
  AUTHOR_EMAIL="$(sed -n 's/^[[:space:]]*email:[[:space:]]*//p' "$CREDS_FILE" | head -n1)"
fi

if [ -n "$GIT_REMOTE" ] && [ -n "$GIT_USERNAME" ] && [ -n "$GIT_PASSWORD" ]; then
  RUN_ARGS+=(
    -e "GIT_REMOTE=${GIT_REMOTE}"
    -e "GIT_USERNAME=${GIT_USERNAME}"
    -e "GIT_PASSWORD=${GIT_PASSWORD}"
  )
  echo "Git credentials loaded from creds.yaml for ${GIT_REMOTE} (user: ${GIT_USERNAME})." >&2
elif [ -f "$CREDS_FILE" ]; then
  echo "creds.yaml found but missing git remote/username/password — pushing" >&2
  echo "from inside the container will not work." >&2
else
  echo "No devcontainer/creds.yaml — pushing from inside the container will" >&2
  echo "not work (everything else does). See devcontainer/README.md." >&2
fi

# Commit identity: creds.yaml's author block when present, otherwise the host's
# own git config. The container gets a fresh $HOME volume with no identity of
# its own, so without one of the two every `git commit` inside it fails with
# "Please tell me who you are". The author is deliberately separate from the
# account above — the push account may be a bot, the author never is.
if [ -z "$AUTHOR_NAME" ] || [ -z "$AUTHOR_EMAIL" ]; then
  AUTHOR_NAME="$(git config --get user.name 2>/dev/null || true)"
  AUTHOR_EMAIL="$(git config --get user.email 2>/dev/null || true)"
  IDENTITY_SOURCE="host git config"
else
  IDENTITY_SOURCE="creds.yaml"
fi
if [ -n "$AUTHOR_NAME" ] && [ -n "$AUTHOR_EMAIL" ]; then
  RUN_ARGS+=(
    -e "AUTHOR_NAME=${AUTHOR_NAME}"
    -e "AUTHOR_EMAIL=${AUTHOR_EMAIL}"
  )
  echo "Commit identity from ${IDENTITY_SOURCE}: ${AUTHOR_NAME} <${AUTHOR_EMAIL}>." >&2
else
  echo "Warning: no commit identity in creds.yaml or the host's git config —" >&2
  echo "commits inside the container will fail until you set one:" >&2
  echo "  git config --global user.name 'Your Name'" >&2
  echo "  git config --global user.email 'you@example.com'" >&2
fi

# Firewall exception list (see ALLOWED_HOSTS_LIST above) — currently just the
# Postgres sidecar. Space-separated, matching entrypoint.sh's
# `for entry in ${ALLOWED_HOSTS:-}` word-splitting parse.
RUN_ARGS+=(-e "ALLOWED_HOSTS=${ALLOWED_HOSTS_LIST[*]}")

CLAUDE_ARGS=()
if [ -n "${CLAUDE_SAFE_MODE:-}" ]; then
  echo "CLAUDE_SAFE_MODE set — starting with normal permission prompts (no --dangerously-skip-permissions)." >&2
else
  echo "Starting in YOLO mode (--dangerously-skip-permissions). Considered safe here because:" >&2
  echo "  - non-root target user (${HOST_UID}:${HOST_GID}) inside the container (root only runs the firewall setup, then drops privileges via gosu)" >&2
  echo "  - only this repo is mounted — nothing from ~/.ssh, cloud credentials, or other projects" >&2
  echo "  - outbound traffic to private/VPN address space is firewalled off (RFC1918, link-local, CGNAT) — internet access stays open" >&2
  echo "  - set CLAUDE_SAFE_MODE=1 to fall back to normal permission prompts instead" >&2
  CLAUDE_ARGS+=(--dangerously-skip-permissions)
fi

exec docker run "${RUN_ARGS[@]}" "$IMAGE_NAME" "${CLAUDE_ARGS[@]}" "$@"
