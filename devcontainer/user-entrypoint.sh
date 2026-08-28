#!/usr/bin/env bash
# Runs as the unprivileged target user (dropped into by entrypoint.sh via
# gosu, after the firewall is set up). Wires up the git credentials and the
# commit identity run.sh passed in from devcontainer/creds.yaml (falling back
# to the host's git config for the identity), then hands off to Claude Code.
#
# The two are deliberately separate: the *account* the push authenticates as
# may be a bot, while the *author* of the commits is the person directing the
# work. Only a person can make the Signed-off-by representation.
set -euo pipefail

CREDENTIAL_STORE="${HOME}/.git-credentials"

if [ -n "${GIT_USERNAME:-}" ] && [ -n "${GIT_PASSWORD:-}" ] && [ -n "${GIT_REMOTE:-}" ]; then
  HOST="${GIT_REMOTE#*://}"
  HOST="${HOST%%/*}"

  git config --global credential.helper store

  # Re-approved on every start rather than skipped when an entry already
  # exists: the store lives on the persistent $HOME volume, so a skip-if-
  # exists guard would keep serving a rotated-out token forever. `approve`
  # replaces the entry for this host+username; git's own credential subsystem
  # handles special characters in the password, so nothing is URL-encoded here.
  printf 'protocol=https\nhost=%s\nusername=%s\npassword=%s\n\n' \
    "$HOST" "$GIT_USERNAME" "$GIT_PASSWORD" | git credential approve

  # Entries for *other* hosts are never touched by the line above and outlive
  # whatever put them there — a dead token that fails only at push time, long
  # after the cause. Name them instead of deleting them: they may be the only
  # copy their owner has.
  if [ -f "$CREDENTIAL_STORE" ]; then
    # `|| true`: grep exits 1 when every stored host is the configured one,
    # and pipefail would turn that ordinary "nothing stale" case into an abort.
    STALE_HOSTS="$(sed -E 's#^[^:]+://[^@]*@##; s#/.*$##' "$CREDENTIAL_STORE" \
      | grep -v -x -F "$HOST" | sort -u | tr '\n' ' ' || true)"
    if [ -n "${STALE_HOSTS// /}" ]; then
      echo "Note: ${CREDENTIAL_STORE} also holds credentials for: ${STALE_HOSTS}" >&2
      echo "Nothing here refreshes those — remove the lines if they are dead." >&2
    fi
  fi

  unset GIT_PASSWORD
fi

# The container's $HOME volume starts without a git identity, so commits made
# inside it would fail without this. Skipped when run.sh found no identity in
# creds.yaml or on the host — it already warned about that there.
if [ -n "${AUTHOR_NAME:-}" ] && [ -n "${AUTHOR_EMAIL:-}" ]; then
  git config --global user.name "$AUTHOR_NAME"
  git config --global user.email "$AUTHOR_EMAIL"
fi

exec claude "$@"
