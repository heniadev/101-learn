# devcontainer

Runs Claude Code inside an isolated Docker container with only this repo mounted
in, so `--dangerously-skip-permissions` (YOLO mode) is a bounded choice instead of
handing the agent your whole machine. The same image is what the course demo runs
in: it carries `ttyd`, the terminal process behind the app's right-hand panel, so
the browser gets a real shell rather than a simulation.

## Usage

```bash
devcontainer/run.sh
```

Any arguments are forwarded to `claude` (e.g. `devcontainer/run.sh -p "..."` for a
headless run).

Set `ANTHROPIC_API_KEY` on the host to pass it through; otherwise Claude Code
prompts you to log in on first run inside the container, and that session is kept
in a named Docker volume (`101-learn-devcontainer-home`) so you don't have to log
in again next time.

Set `CLAUDE_SAFE_MODE=1` to start with normal permission prompts instead of
`--dangerously-skip-permissions`:

```bash
CLAUDE_SAFE_MODE=1 devcontainer/run.sh
```

## Reaching a dev server running inside the container

`run.sh` publishes `5173` (Vite's default) to the same port on the host. Override
with `DEVCONTAINER_PORTS` (space-separated) for a different port or more than one:

```bash
DEVCONTAINER_PORTS="5173 3000" devcontainer/run.sh
```

For a [named instance](#running-concurrent-instances) the *host* port may not
match — `run.sh` probes for a free one and prints what it picked. Either way it
passes the result in as `$DEVCONTAINER_PORT_MAP` (space-separated `container:host`
pairs, e.g. `5173:5174`), because a Docker `-p` mapping cannot be introspected from
inside the container's own network namespace. `vite.config.ts` reads that variable
and binds to the *container* side of the first pair, so the app follows whatever
`run.sh` published rather than assuming 5173.

Two things trip people up here. **The dev server has to bind `0.0.0.0`, not just
`localhost`** — `-p` maps the host port to the container's own interface, so a server
on `127.0.0.1` *inside* the container is reachable only via `docker exec`;
`vite.config.ts` sets `server.host` for this reason, and a second server would need
the same. And **the container's bridge IP (e.g. `172.18.0.2:5173`) is not reachable
from the host directly**, firewall or no firewall: on VM-backed Docker/Rancher
Desktop only the VM sits on that bridge network. Other containers reach it fine;
your machine can't, and `-p` is the way around it.

## The web terminal (ttyd)

The course page embeds a real shell, so `ttyd` has to exist in the image for the
demo to work at all. Baked in at build time with a pinned version and a
per-architecture sha256 (upstream publishes no checksums file), for the same reason
as the Playwright libraries beside it: the runtime user is non-root and sudo-less
and can never install it later, and the demo stays fully offline.

`npm run terminal` (`scripts/start-terminal.sh`) starts it. Two flags are
load-bearing:

- **`--interface 127.0.0.1` binds it to loopback only.** `ttyd --writable` is an
  unauthenticated shell in a container that holds the entire repo — anyone who can
  open the socket gets that shell. Traffic reaches it only via the app's proxy.
- **`--writable` must be passed explicitly.** Without it the terminal renders
  correctly and then silently ignores every keystroke — easy to misdiagnose as a
  proxy problem.

Vite proxies `/terminal` to `127.0.0.1:$TERMINAL_PORT` (default 7681) with
`ws: true`, since ttyd upgrades to a WebSocket after the initial page load;
HTTP-only proxying yields a terminal that paints once and freezes. That port is
deliberately **never** in `DEVCONTAINER_PORTS` and never published to the host —
publishing it would put an unauthenticated shell on `localhost`, bypassing the app
entirely. If you need it directly, `docker exec` in.

## node_modules lives in its own volume

`run.sh` mounts a named volume (`NODE_MODULES_VOLUME`) over
`/workspace/node_modules`. Not a performance tweak: the workspace bind mount is
network-backed, and symlinks under `node_modules/.bin` are unreadable there
("Operation not permitted"), which breaks every `npm run *`. A local volume has no
such restriction. So the checkout's own `node_modules` is *shadowed* while the
container runs — hidden, not deleted, back untouched on the host afterwards — and a
fresh volume starts **empty**, making `npm install` the one setup step after an
instance's first start.

The Dockerfile pre-creates `/workspace/node_modules` mode `0777`, and Docker seeds a
new volume from the image content at that path. The container drops to an arbitrary
*host* UID, so there is no build-time owner to `chown` to — 0777 is the only
permission that works for every UID. `/home/agent` is 0777 for the same reason.

## Local database

`run.sh` brings up a local Postgres (`devcontainer/docker-compose.yml`) before the
devcontainer itself and blocks on its healthcheck (`--wait`), so nothing races a
not-yet-ready database. It joins the same user-defined network
(`101-learn-devcontainer-net`), reachable at `postgres:5432`, and `DATABASE_URL` is
set to that automatically. Credentials are fixed, non-secret local-dev defaults
(`app`/`app`) — a throwaway database with nothing to protect. No app code reads
`DATABASE_URL` yet; the sidecar is there for when some does.

- **The outbound firewall would otherwise block this.** The sidecar's IP is RFC1918,
  exactly what the [firewall](#network-firewall) default-denies. `run.sh` resolves
  the container's actual IP after starting it and punches a `/32` + port 5432
  exception through `ALLOWED_HOSTS` — currently the only entry in that list.
  Re-resolved every run, not cached, since compose can reassign the IP on recreation.
- **To reset it**, `docker compose -f devcontainer/docker-compose.yml down -v` drops
  the named volume (`101-learn-devcontainer-pgdata`); the next `run.sh` starts empty.

A [named instance](#running-concurrent-instances) gets its own logical database on
this same server instead of the default `101-learn_dev` — nothing to configure.

## Running concurrent instances

By default `run.sh` uses fixed port/database/volume names. Set
`DEVCONTAINER_INSTANCE=<name>` to opt into a second (or third, ...) instance running
**concurrently** alongside it against the same shared workspace — every instance
mounts the main repo checkout, not whichever worktree invoked `run.sh`; the agent
picks a worktree once inside:

```bash
DEVCONTAINER_INSTANCE=feature-x devcontainer/run.sh
```

`<name>` must match `^[a-z][a-z0-9-]*$`. Not cosmetic: the name is reused as a
Docker volume name, a `--name`, *and* a double-quoted Postgres identifier, and that
pattern is the only thing keeping the `CREATE DATABASE`/`DROP DATABASE` calls
injection-free — see the SAFETY INVARIANT comment at the validation site in
`run.sh`, and its twin in `cleanup.sh`.

A named instance gets its own auto-detected host port, Postgres database, `$HOME`
volume (so its Claude Code login is independent), and `node_modules` volume, and is
registered under `.instances/<name>/` at the main repo root (gitignored) so
`cleanup.sh` can find it later. The bare instance is never registered — nothing to
list or clean up.

```bash
devcontainer/cleanup.sh                 # list registered named instances
devcontainer/cleanup.sh feature-x       # remove one (prompts for confirmation)
devcontainer/cleanup.sh feature-x --yes # remove one, skip confirmation
```

Removal drops the instance's Postgres database, both its volumes, and its registry
entry; safe once its container has stopped. The bare instance's
`101-learn-devcontainer-node-modules` volume is deliberately out of reach here —
remove it by hand for a clean reinstall.

## Git credentials and commit identity

Two separate things, deliberately: the account a push authenticates as, and the
person the commits are attributed to.

Both come from `devcontainer/creds.yaml` — gitignored, never baked into the
image, passed in as env vars at `docker run` time only. `run.sh` reads the
`git:` block (`remote`, `username`, `password`) and `user-entrypoint.sh` hands
it to `git credential approve` after privileges are dropped, so git's own
credential subsystem stores it and no password is ever URL-encoded by hand. The
credential is keyed by **host**, so it also covers other repositories on the
same host as `remote:`.

The re-approval happens on **every start**, not only when the store is empty.
The store lives on the persistent `$HOME` volume, so a skip-if-exists guard
would keep serving a rotated-out token forever — a failure that surfaces at
push time, long after its cause. For the same reason, `user-entrypoint.sh`
prints any *other* hosts it finds in the store at startup: nothing refreshes
those, and they are usually leftovers. It names them rather than deleting them,
because that store may be the only copy of a token its owner has.

Commit identity comes from creds.yaml's `author:` block when present, and from
the host's own `git config --get user.name` / `user.email` otherwise. The
`$HOME` volume starts with no git identity, so without one of the two every
commit inside fails with "Please tell me who you are". Finding neither is a
**warning, not a failure** — `run.sh` prints the two commands that fix it and
starts anyway, because the course terminal has to come up with or without git.

No creds.yaml at all is also fine: everything except pushing works.

## The GitHub CLI (gh)

`gh` is in the image because publishing the course mockup to GitHub Pages needs
an API call, not just a git push — enabling Pages on a repository cannot be
done through git at all. It is baked in at build time for the same reason as
ttyd: the runtime user is sudo-less and Debian bookworm has no `gh` package, so
it can never be installed later.

Nothing authenticates it for you: `gh` reads its own config or `GH_TOKEN`, not
git's credential store, so the creds.yaml plumbing above does not reach it. Set
`GH_TOKEN` in the shell, or run `gh auth login` once — its config lands on the
`$HOME` volume and survives the next start.

## Network firewall

*Outbound* traffic the container initiates toward private/VPN address space is
blocked; normal internet access stays open, and so does anything *answering* a
connection someone else started (e.g. a browser hitting a published dev server).
This is a *different shape* of firewall than Anthropic's reference (default-deny
everything, allowlist domains) — it is default-allow, deny-listing only new
outbound connections toward the ranges that would let the agent reach your LAN or
VPN:

- `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` — RFC1918 private ranges
- `169.254.0.0/16` — link-local
- `100.64.0.0/10` — CGNAT / shared address space (what Tailscale and similar VPNs
  commonly use — *not* RFC1918, easy to miss)

Hosts actually needed get a narrow `ALLOWED_HOSTS` exception for the exact `ip` or
`ip:port`, never the surrounding range. Exactly one today: the Postgres sidecar.

Three implementation notes worth knowing if you touch this:

- **Direction matters, and the destination address alone cannot tell you
  direction.** The first version dropped *all* `OUTPUT` packets to those ranges —
  which silently ate reply traffic for connections *others* initiated, since
  replies leave through `OUTPUT` too. The fix is connection tracking:
  `ESTABLISHED,RELATED` is accepted unconditionally regardless of destination (it
  is a reply, not a new outbound connection), and only `NEW` connections are
  filtered.
- **DNS still has to work.** The container runs on a dedicated user-defined network
  instead of the default bridge, so it gets Docker's embedded resolver on loopback
  (127.0.0.11) rather than whatever DNS server the default bridge would hand it —
  sometimes itself a private-range address. Loopback is accepted before any other
  rule for this reason.
- **Root only runs long enough to set the firewall up.** `iptables` needs
  `NET_ADMIN`/`NET_RAW`, dropping privileges cleanly needs `SETUID`/`SETGID` — all
  four added back on top of `--cap-drop=ALL`. `entrypoint.sh` runs as root, sets the
  rules, then `exec gosu`s into `user-entrypoint.sh` as your host UID/GID (`--user`
  at `docker run` time cannot be used, since the firewall must be up *before*
  privileges drop). It re-asserts `HOME=/home/agent` across that hand-off
(`entrypoint.sh:56`), because
  gosu resets `$HOME` to `/` for a UID with no `/etc/passwd` entry — the normal case
  here — which would scatter git/npm/claude config outside the persisted volume.

## Anthropic's devcontainer guidance vs. this implementation

Anthropic's recommendation for when `--dangerously-skip-permissions` is acceptable
boils down to a handful of conditions (see
[code.claude.com/docs/en/devcontainer](https://code.claude.com/docs/en/devcontainer)).
How this setup maps to it:

| Anthropic guideline | This implementation | Status |
| --- | --- | --- |
| Agent runs as a non-root user | Root only to configure the firewall, then `gosu` drops to your host UID/GID; `run.sh` refuses to run at all if the host user is UID 0 | ✅ Met — root-then-drop instead of `--user`, required so the firewall comes first; same end property |
| Restricted network access (their reference ships a default-deny `init-firewall.sh` with a domain allowlist) | Default-*allow* internet, default-*deny* private/VPN space via `iptables` — see above | ✅ Met, different shape: simpler to keep correct (no domain/CDN churn), but it does not stop the agent reaching arbitrary *public* hosts |
| Only the trusted repo + needed files are visible — no `~/.ssh`, no cloud credentials, no production databases | Repo root bind-mounted, plus two named volumes (`$HOME`, `node_modules`); nothing else from the host filesystem | ⚠️ Met with one caveat — `devcontainer/creds.yaml` lives inside that bind mount, so the push token is readable in the container by design (see above); host SSH keys and cloud credentials are not |
| Dropped/minimal Linux capabilities | `--cap-drop=ALL` plus exactly four back — `NET_ADMIN`/`NET_RAW` (firewall), `SETUID`/`SETGID` (`gosu`) — with `--security-opt no-new-privileges` and `--pids-limit 512` | ✅ Met |
| VS Code Dev Containers integration (`devcontainer.json`) | Standalone bash script, no editor integration | ❌ Out of scope — built as "a shell script that launches Claude Code in a rootless container" |
| Session/config persistence across runs | Named volume at the container's `$HOME`, survives `--rm` | ✅ Met |
| — | Our addition: an unauthenticated `ttyd` shell inside the container for the course demo, bound to loopback, reachable only through the app's proxy, its port never published | ⚠️ Deviation — tolerable only because of those constraints. Publish that port and anyone on `localhost` has a shell in the workspace |
| `--dangerously-skip-permissions` only inside an isolated environment meeting the above | Default behavior of `run.sh` (opt out with `CLAUDE_SAFE_MODE=1`) | ✅ Met — bounded by filesystem isolation *and* isolation from local/VPN resources; not bounded against arbitrary public hosts |

Two things worth internalizing:

- **Not a Docker-rootless-daemon setup.** Nothing here requires or configures
  `dockerd-rootless` on the host. "Rootless" means the *container's own user* is
  non-root, the property that actually matters for containing an agent.
- **Still shares the kernel with your host**, like any container. Isolation, not a
  hard boundary against a determined kernel exploit — and the firewall closes off
  your LAN/VPN, not the public internet. It raises the cost of a mistake; it does
  not zero it out.
