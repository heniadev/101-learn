#!/usr/bin/env bash
# Runs as the unprivileged target user (dropped into by entrypoint.sh via
# gosu, after the firewall is set up). Wires up git credentials (if provided
# via env by run.sh, sourced from creds.yaml) using `git credential approve`,
# which lets git's own credential subsystem handle any special characters in
# the password correctly — no manual URL-encoding needed. Also logs `tea`
# (Gitea's CLI) into the same account, for issues/PRs/releases beyond plain
# git push/pull. Then hands off to Claude Code.
#
# Note the deliberate split between two identities: the *account* the agent
# pushes with (GIT_USERNAME, a dedicated bot account) and the *author* of the
# commits it writes (AUTHOR_NAME/AUTHOR_EMAIL, the human directing the work).
# They are not the same thing. A Signed-off-by trailer is a Developer
# Certificate of Origin statement and only a person can make it, so commits
# are authored and signed off by the human; the agent is credited in a
# Co-authored-by trailer instead. See .githooks/prepare-commit-msg.
set -euo pipefail

if [ -n "${GIT_USERNAME:-}" ] && [ -n "${GIT_PASSWORD:-}" ] && [ -n "${GIT_REMOTE:-}" ]; then
  SCHEME="${GIT_REMOTE%%://*}"
  HOST="${GIT_REMOTE#*://}"
  HOST="${HOST%%/*}"

  git config --global credential.helper store

  # The bot account, recorded for the Co-authored-by trailer only — never as
  # the commit author (see the identity note at the top of this file).
  AGENT_IDENT="${GIT_USERNAME} <${GIT_EMAIL:-${GIT_USERNAME}@${HOST}}>"

  printf 'protocol=https\nhost=%s\nusername=%s\npassword=%s\n\n' \
    "$HOST" "$GIT_USERNAME" "$GIT_PASSWORD" | git credential approve

  # --git-credentials is intentionally omitted: git's own credential store is
  # already wired up above (username/password directly), and tea creating a
  # second, token-based credential entry for the same host would just be
  # redundant. tea's login is for its own API use (issues/PRs/releases).
  #
  # $HOME persists across container runs (named volume), so tea's own login
  # config does too. Delete-then-add on every start rather than skip-if-
  # exists: creds.yaml may have changed (rotated password) since the login
  # was first created, and a skip-if-exists guard would silently keep using
  # the stale one forever. `delete` errors (exit 1) when there's nothing to
  # delete yet (first run) — `|| true` makes that a no-op instead of
  # aborting under set -e.
  tea logins delete devcontainer >/dev/null 2>&1 || true
  tea login add --name devcontainer --url "${SCHEME}://${HOST}" \
    --user "$GIT_USERNAME" --password "$GIT_PASSWORD" >/dev/null
  tea login default devcontainer >/dev/null

  unset GIT_PASSWORD
fi

# Commit identity. The author is the human who directs the work and can make
# the DCO representation; falling back to the bot account is a degraded mode,
# so say so rather than failing silently into bot-signed commits.
if [ -n "${AUTHOR_NAME:-}" ] && [ -n "${AUTHOR_EMAIL:-}" ]; then
  git config --global user.name "$AUTHOR_NAME"
  git config --global user.email "$AUTHOR_EMAIL"
  if [ -n "${AGENT_IDENT:-}" ]; then
    git config --global 101-learn.agent "$AGENT_IDENT"
  fi
elif [ -n "${GIT_USERNAME:-}" ]; then
  git config --global user.name "$GIT_USERNAME"
  git config --global user.email "${GIT_EMAIL:-${GIT_USERNAME}@${HOST:-localhost}}"
  git config --global --unset 101-learn.agent 2>/dev/null || true
  echo "creds.yaml has no author: block — commits will be authored AND signed" >&2
  echo "off as '${GIT_USERNAME}', which is a bot and cannot make the DCO" >&2
  echo "representation. See devcontainer/README.md 'Commit identity'." >&2
fi

# Enforce the repo's hooks across main + every worktree. All worktrees share
# /workspace/.git, and a *relative* core.hooksPath resolves against each
# worktree's own root, so the committed .githooks/ shim is honored uniformly
# (main and every .worktrees/*). Written to the persisted /home/agent/.gitconfig,
# so it survives container restarts and needs no per-worktree setup.
# Set unconditionally (independent of git creds being provided).
git config --global core.hooksPath .githooks

# Ignore the mechanical baseline reformat in `git blame` (relative path resolves
# per-worktree, same as core.hooksPath). Otherwise 400c652 masks real authorship.
git config --global blame.ignoreRevsFile .git-blame-ignore-revs

exec claude "$@"
