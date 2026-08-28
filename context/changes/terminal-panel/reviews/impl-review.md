<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Terminal panel — Implementation Plan

- **Plan**: `context/changes/terminal-panel/plan.md`
- **Scope**: whole plan (phases 1–4, all Progress items checked)
- **Date**: 2026-08-28
- **Diff basis**: Progress SHAs (`e268c23`, `1ec27ac`, `7113f39`) plus the post-review fix `4200e2a`; phase 2 records no SHAs because it changes no files. Working tree clean apart from untracked `content/`.
- **Verdict**: REWORK REQUIRED
- **Findings**: 1 critical, 1 warning, 2 observations

> Second pass. The first pass (report and triage recorded in `a0fe812`) closed
> all six of its findings; this run re-derives everything from the plan and the
> current tree. Its outcomes are summarised at the bottom — F1 there is the
> direct ancestor of F1 here.

> **Rebased mid-triage.** After the findings above were written, `main` was
> fast-forwarded onto three commits from another agent's styling work
> (`06ae9fd`, `51963b3`, `1057094`), which touch `app/root.tsx`,
> `app/routes/home.tsx` and `app/app.css`. Re-checked on the rebased tree:
> `typecheck` exit 0, `2.2` → `200`, `3.1` → `200`, proxy → `200`, and `4.2`
> still MATCHes — the terminal contract survived the restyle, now routed
> through `app/components/TerminalPane.tsx:21` instead of an inline iframe in
> the route. The previous pass's F5 (`"Inter"` left in `--font-sans`) is
> **closed by that work** — `app/app.css:7` now starts at `ui-sans-serif`.
> No finding below changes as a result.

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | FAIL |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Findings

### F1 — The loopback fix closed the host route; the container network still reaches the writable shell

- **Severity**: 🔴 CRITICAL
- **Impact**: 🧠 HIGH
- **Dimension**: Safety & Quality
- **Location**: `devcontainer/entrypoint.sh:26-45`, `devcontainer/run.sh:9`, `:154`, `vite.config.ts:30`, `plan.md:81-85` (*What We're NOT Doing*)
- **Detail**: The previous pass fixed the host vector — `run.sh` now publishes with `-p 127.0.0.1:…` (`:224`, `:230`). That closes one of two routes. Vite still binds `0.0.0.0` (`vite.config.ts:30`), and it has to: `docker-proxy` connects to the container's bridge address, not its loopback. The firewall in `entrypoint.sh` cannot compensate — every one of its rules is in the `OUTPUT` chain (`:26`, `:27`, `:38`, `:40`, `:45`); there is no `INPUT` rule at all. So any container on the bridge network can still `GET http://<container-ip>:<app-port>/terminal/` and get an unauthenticated, writable shell carrying the git credential, the API key, the repository and a kubeconfig.

  This bites hardest in instance mode: `run.sh:9` hardcodes a single network name and `:154` joins **every** named instance to it, so an agent in instance A has a shell inside instance B with B's credentials — the isolation that named instances imply does not hold. The Postgres sidecar sits on the same network.

  The plan's exclusion does not neutralise the charge, because it is conditional: *"Jedno wynika z drugiego: terminal jest osiągalny wyłącznie przez stronę, więc nie ma czego chronić"* (`plan.md:82-83`). The premise is false — the terminal is reachable by anything that speaks HTTP on that network, not only through the page — so the conclusion drawn from it does not stand. This is a flaw in the plan's reasoning, not only in the code.
- **Fix A ⭐ Recommended** — add an `INPUT` rule in `devcontainer/entrypoint.sh`: accept NEW/tcp on the app port only from the bridge gateway address (which is what `docker-proxy` traverses), drop the rest; keep `ESTABLISHED,RELATED` and `lo` accepted as the `OUTPUT` chain already does.
  - *Strength*: closes the remaining route at the layer that already owns network policy in this image, without touching the app or adding a credential. It restores the plan's actual intent — the terminal reachable through the published port and nothing else — and it keeps working if someone later re-publishes the port deliberately.
  - *Tradeoff*: the container can no longer be reached from a sibling container at all, which would break any future workflow that legitimately wants that (a test runner hitting the app from another container). It also puts real iptables logic in a startup path where a mistake locks you out of your own dev server.
  - *Confidence*: medium-high. The `OUTPUT`-only shape of the firewall is verified by direct reading, the shared network is verified at `run.sh:9,154`, and off-loopback reachability was measured (`http://172.21.0.3:7888/terminal/` → `200`). The gateway-only allowance is the standard shape but I did not build and run it.
  - *Blind spot*: **I could not test from a second container — no `docker` CLI inside this one.** The cross-container reach is inferred from three verified facts (Vite on `0.0.0.0`, no `INPUT` rules, one shared network), not observed end-to-end. I also did not check whether Docker's own `DOCKER-USER`/`FORWARD` rules on the host already restrict inter-container traffic on this network, which would reduce the severity; on a default user-defined bridge they do not, but this host was not inspected.
- **Fix B** — put credentials on ttyd: `--credential` in `scripts/start-terminal.sh:29-33`, failing loudly when unset.
  - *Strength*: removes the problem class instead of one route — the shell stays protected regardless of which network path reaches it, including any future deliberate exposure.
  - *Tradeoff*: a credential to invent, store and hand over, plus a basic-auth prompt inside the iframe — friction on the one surface whose whole point is that the terminal is simply there. The plan explicitly did not want this.
  - *Confidence*: medium. `--credential` is a documented ttyd 1.7 flag and the binary is pinned at 1.7.7 (`Dockerfile:26`), but I did not run it.
  - *Blind spot*: not verified whether basic-auth survives the proxy's `changeOrigin: true` (`vite.config.ts:38`), nor how the credential would reach the container without being committed.
- **Decision**: REJECTED (2026-08-28) — poza portem 7888 nic nie jest wystawiane z kontenera; to port prywatny w obrębie kontenera/poda, a model docelowy to efemeryczne pody kasowane po szkoleniu, więc sąsiedztwo w sieci mostka jest artefaktem lokalnego devcontainera, nie kształtem produkcji. Warunek ważności tego rozstrzygnięcia — gdyby w tym samym podzie/sieci stanęło kiedyś coś niezaufanego, przesłanka wraca do rozpatrzenia.

### F2 — The proxy→ttyd boundary has no error handling, and nothing starts or supervises ttyd

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Safety & Quality
- **Location**: `vite.config.ts:32-42`, `package.json:6-10`, `scripts/start-terminal.sh:35`
- **Detail**: The `/terminal` proxy declares no `configure` hook and no `proxy.on('error')`. When ttyd is not running, `http-proxy` raises `ECONNREFUSED`, Vite logs it server-side and returns a 500 into the iframe — the learner sees a blank right half with no explanation. This is the product's only surface, so a silent failure costs more here than anywhere else. The plan itself warns about exactly this misdiagnosis class ("terminal, który się rysuje i zamiera", `plan.md:120-121`) one layer up.

  The second half is the default path: `npm run dev` (`package.json:7`) does not start ttyd — that needs a separate `npm run terminal` (`:9`) nobody is reminded about, and `start-terminal.sh` ends in `exec ttyd` (`:35`) with no supervisor. If ttyd dies mid-session the panel dies with it, silently. The manual two-command start is the plan's deliberate choice and is not itself a finding; the absence of any signal when the second command was forgotten is.
- **Fix**: add an `error` handler on the proxy that returns a readable page ("the terminal process is not running — start it with `npm run terminal`") instead of a bare 500.
  - *Strength*: converts the one failure a learner will actually hit into a self-service instruction, at the exact place they are looking. Contained to `vite.config.ts`, no new process management, no change to the plan's two-command model.
  - *Tradeoff*: it treats the symptom — a forgotten or crashed ttyd still leaves a dead panel, just an explained one. A `dev:all` script that starts both would prevent it instead, but that reopens a startup-model decision the plan settled deliberately.
  - *Confidence*: high on the diagnosis — the missing handler is plain in `vite.config.ts:32-42` and Vite's default for a refused upstream is well established. Medium on the exact rendering: I did not stop ttyd and watch the iframe.
  - *Blind spot*: not verified how the WebSocket path fails when ttyd dies *after* the page loads — an `error` handler on the HTTP path may not cover the upgrade, so the mid-session death case may still be silent.
- **Decision**: APPLIED (2026-08-28) — `configure` + `proxy.on("error")` w `vite.config.ts` oddaje `503` z czytelnym komunikatem („Terminal nie działa. Uruchom `npm run terminal`") zamiast gołego 500. **Blind spot z propozycji domknięty pomiarem**: ubity ttyd → `503` z tym tekstem; ttyd wznowiony → proxy `200`, strona `200`, upgrade WS `101`. Ścieżka WebSocketowa nie ma obiektu odpowiedzi HTTP, więc handler wychodzi wcześniej (`writeHead` guard) — śmierć ttyd *po* załadowaniu strony nadal jest cicha; dwukomendowy model startu z planu zostaje nietknięty.

### F3 — Secrets are passed as `docker run` argv values (pre-existing, not introduced here)

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: `devcontainer/run.sh:238`, `:269`
- **Detail**: `RUN_ARGS+=(-e "ANTHROPIC_API_KEY=…")` and the `GIT_PASSWORD` equivalent put the **values** on the `docker run` command line, so they are visible to any local user via `/proc/<pid>/cmdline` for the process's lifetime and stay in `docker inspect` → `Config.Env` for the container's. The comment at `:246-250` presents this as the safe option ("never baked into the image"), which is true of the image but not of the host. `creds.yaml` itself is correctly `0600` — the protection exists on disk and is lost at the invocation boundary. Cheaper shape: `-e ANTHROPIC_API_KEY` (inherit without a value in argv) or `--env-file`.

  **Charged to nothing in this plan**: `git show e268c23 -- devcontainer/run.sh` confirms this change added only the `node_modules` volume block; these lines predate it. Recorded because `run.sh` is in the changed set and because the plan's own security argument leans on these very credentials being present in the shell's environment (`plan.md:114-115`). No secret value appears in this report.
- **Fix**: switch both sites to value-less `-e` inheritance, in a change of its own.
- **Decision**: SKIPPED (2026-08-28) — dług zastany, nie obciąża tego planu (`git show e268c23 -- devcontainer/run.sh` potwierdza, że zmiana dodała tam wyłącznie blok wolumenu `node_modules`). Zostaje w raporcie jako obserwacja, bez kolejki follow-up.

### F4 — `find_free_host_port` has no upper bound and a wide TOCTOU window (pre-existing)

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Safety & Quality
- **Location**: `devcontainer/run.sh:198-206`, used at `:223`
- **Detail**: The probe loop increments a candidate port with nothing stopping it at 65535; it does terminate (bash refuses `/dev/tcp/…/65536`) but then returns an invalid port, surfacing later as an opaque `docker run` error. Separately, tens of seconds pass between the probe (`:202`) and the actual `docker run` (`:322`) — image build, `compose up --wait`, database creation — so two concurrent `run.sh` invocations can pick the same "free" port; the second fails loudly with `port is already allocated`, which is why this stays an observation. Worth knowing: the probe tests loopback only, which is now exactly consistent with the `-p 127.0.0.1:…` publishing from the previous pass — the two must change together. Pre-existing, same provenance check as F3.
- **Fix**: bound the loop (e.g. 100 attempts from the starting port) and `exit 1` with a clear message when exhausted.
- **Decision**: SKIPPED (2026-08-28) — dług zastany, ta sama weryfikacja pochodzenia co F3. Awaria jest głośna (`port is already allocated`), więc koszt zwłoki jest niski. Zostaje jako obserwacja, bez kolejki follow-up.

## Automated Verification (re-run during review)

Both servers were started for this review (`npm run terminal`, `npm run dev`); the container runs with `DEVCONTAINER_PORT_MAP=7888:7888`, so `${DEVCONTAINER_PORT_MAP%%:*}` = 7888.

| Phase | Command | Result |
| --- | --- | --- |
| 1.1 | `bash -n devcontainer/run.sh` | exit 0 ✅ |
| 1.1 | `bash -n devcontainer/cleanup.sh` | exit 0 ✅ |
| 2.1 / 4.1 | `npm run typecheck` | exit 0 ✅ |
| 2.2 | `curl … "http://localhost:${DEVCONTAINER_PORT_MAP%%:*}/"` | `200` ✅ — passes as written since the previous pass rewrote it; the old literal `localhost:5173` still returns `000`, confirming the rewrite was necessary |
| 3.1 | `curl … http://localhost:7681/` | `200` ✅ |
| 4.2 | `curl … "http://localhost:${DEVCONTAINER_PORT_MAP%%:*}/" \| grep -q '<iframe'` | MATCH ✅ — `<iframe src="/terminal/" title="Course terminal" class="h-full w-full border-0" scrolling="no">` |
| extra | `bash -n scripts/start-terminal.sh` | exit 0 ✅ |
| extra | `curl … http://localhost:7888/terminal/` | `200` ✅ — proxy and prefix strip work |
| extra | WebSocket upgrade on `/terminal/ws` | `101 Switching Protocols`, `sec-websocket-accept` present, `sec-websocket-protocol: tty` ✅ |
| extra | `curl … http://172.21.0.3:7888/terminal/` (container's own non-loopback address) | `200` ⚠️ — evidence for F1 |

## Manual Verification

Rubber-stamp audit of the checked manual boxes:

- **1.2** (phase-1 files committed before restart) — ✅ `e268c23`. The criterion names `package.json`, which phase 1 deliberately left alone (the contingency was correctly not triggered); true for the files actually in scope.
- **2.3 / 2.5** (restarted on a new instance; `DEVCONTAINER_PORT_MAP` set and pointing at the app port) — ✅ `DEVCONTAINER_PORT_MAP=7888:7888` in this session, `/workspace/node_modules` populated from the named volume (140 entries), dev server binds 7888 from it.
- **2.4** (`nano` and `ttyd` on PATH) — ✅ `/usr/bin/nano`, `/usr/local/bin/ttyd`.
- **3.2 / 3.3 / 3.4** (typing, `git status`, `vim`/`nano` in the standalone terminal) — ✅ supported, not re-driven by hand: ttyd serves `200` with `--writable` (`start-terminal.sh:32`) and `--cwd` at the repo root (`:33`), and `change.md` records a WebSocket probe exercising keyboard input, `git status`, `vim` and `nano` over the same path the frame uses.
- **4.3** (two panels, right one filled by the terminal) — ✅ `home.tsx:23-38` shows two `w-1/2 shrink-0` sections in a `flex h-screen overflow-hidden` container with a full-size iframe; `change.md` records browser measurements (2×640 px at 1280, `tput cols`=78, no horizontal scroll).
- **4.4 / 4.5** (typing and editing inside the embedded terminal) — ✅ same evidence chain, through the proxy: the `101` upgrade on `/terminal/ws` was reproduced in this pass.
- **4.6** (`TERMINAL_URL` redirects the panel) — ✅ **re-verified directly this pass**: a second dev server started with `TERMINAL_URL=http://example.invalid/tty/` rendered `<iframe src="http://example.invalid/tty/" …>`; that instance was stopped afterwards.

No box was found checked without evidence.

## Previous pass — resolved (recorded in `a0fe812`)

| # | Finding | Decision |
| --- | --- | --- |
| F1 | Unauthenticated writable shell reachable through the published app port | APPLIED (Fix A — `-p 127.0.0.1:…`). **Superseded by F1 above**: it closed the host route, not the bridge-network route |
| F2 | Criteria 2.2 / 4.2 hardcoded port 5173 | APPLIED — both now derive the port; verified passing this pass |
| F3 | `strictPort` unset | REJECTED — conflated the container port (a fixed contract) with the host port, where `find_free_host_port` absorbs collisions |
| F4 | Phase-1 commit mislabelled, carries an unplanned README edit | ACCEPTED / NOTED — history left alone |
| F5 | `"Inter"` still first in `--font-sans` with no font loaded | SKIPPED — another agent owns styling |
| F6 | `mockup/` landed outside any change folder | SKIPPED — another agent owns it |

Carried into this pass: the acknowledged debt on the old F1 stands — **this container was started with the old `-p`, so the host-side exposure persists until the next restart**, and the F1 above adds a route that a restart alone will not close.
