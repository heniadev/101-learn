<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Terminal panel — Implementation Plan

- **Plan**: `context/changes/terminal-panel/plan.md`
- **Scope**: whole plan (phases 1–4, all Progress items checked)
- **Date**: 2026-08-28
- **Diff basis**: Progress SHAs (`e268c23`, `1ec27ac`, `7113f39`) — phase 2 records no SHAs because it changes no files; working tree clean apart from untracked `content/`
- **Verdict**: REWORK REQUIRED
- **Findings**: 1 critical, 2 warnings, 3 observations

## Verdicts

| Dimension | Verdict |
| --- | --- |
| Plan Adherence | PASS |
| Scope Discipline | WARNING |
| Safety & Quality | FAIL |
| Architecture | WARNING |
| Pattern Consistency | PASS |
| Success Criteria | WARNING |

## Findings

### F1 — Unauthenticated writable shell is reachable over the network through the published app port

- **Severity**: 🔴 CRITICAL
- **Impact**: 🧠 HIGH
- **Dimension**: Safety & Quality
- **Location**: `vite.config.ts:27-38`, `devcontainer/run.sh:216-226`, `plan.md` → *Critical Implementation Details* / *What We're NOT Doing*
- **Detail**: The plan's security argument is: don't publish ttyd's port, therefore "terminal jest osiągalny wyłącznie przez stronę, więc nie ma czego chronić". The proxy re-creates the exact exposure the plan set out to avoid. `ttyd` is correctly bound to `127.0.0.1` (`scripts/start-terminal.sh:29-33`), but `vite.config.ts` sets `server.host: "0.0.0.0"` and proxies `/terminal` to it with `ws: true`, and `run.sh` publishes the app port with `-p "${port}:${port}"`, which Docker binds on **all** host interfaces. Anything that can reach the host on that port gets a writable, unauthenticated shell — in a container that holds git credentials and API keys (`run.sh:213`, `:235`, `:269`, `:285`), the repository, and a kubeconfig. Measured during this review from the container's non-loopback address `172.21.0.3`: `GET http://172.21.0.3:7888/terminal/` → `200`, and a WebSocket upgrade on `/terminal/ws` → `101 Switching Protocols` with `sec-websocket-protocol: tty`. The `entrypoint.sh` firewall does not help — its rules are `OUTPUT`-chain only (`entrypoint.sh:26-27`), as the plan itself notes. "Reachable only through the page" holds for a human clicking a link; it does not hold for anything speaking HTTP.
- **Fix A ⭐ Recommended** — publish the app port on loopback only: in `devcontainer/run.sh`, change both publish sites (`:218`, `:224`) to `-p "127.0.0.1:${host_port}:${container_port}"`.
  - *Strength*: restores the plan's actual intent (nothing but the operator's own machine reaches the shell) while leaving the demo working — the host browser reaches `localhost` exactly as today. One-line change per site, no application code touched, no new secret to manage.
  - *Tradeoff*: a browser on another machine (a phone on the LAN, a jury laptop) can no longer open the page. The plan already routes that case to a separate decision ("Nie wystawiamy niczego do internetu dla jury"), so it costs nothing that was in scope.
  - *Confidence*: high. The exposure was reproduced end-to-end (HTTP 200 and a WebSocket 101 off loopback), and loopback publishing is the standard Docker remedy.
  - *Blind spot*: I could not test from the host — only from inside the container — so I verified that Vite serves off-loopback and that Docker's publish flag lacks an interface prefix, and inferred host-side reach from that. I also did not check whether any wrapper (an IDE tunnel, a corporate VPN, a reverse proxy) already fronts this port and would keep it reachable regardless.
- **Fix B** — put credentials on ttyd: add `--credential "${TERMINAL_USER}:${TERMINAL_PASSWORD}"` in `scripts/start-terminal.sh` and fail loudly when unset.
  - *Strength*: removes the problem class rather than the symptom — the shell stays safe even if the app port is later published deliberately (for the jury, for a tunnel, for a deploy).
  - *Tradeoff*: adds a credential to invent, store, and hand to the learner, and puts a basic-auth prompt between the learner and the terminal — friction the plan explicitly wanted to avoid, on a page whose whole point is that the terminal is just *there*.
  - *Confidence*: medium. `--credential` is a documented ttyd 1.7 flag, but I did not run it, and it interacts with the iframe embed (the browser prompts inside the frame) in a way that needs a real look before shipping.
  - *Blind spot*: not verified whether basic-auth survives the Vite proxy's `changeOrigin: true` rewrite, nor how the credential would be delivered without ending up committed.
- **Decision**: APPLIED (Fix A, 2026-08-28) — `run.sh` publikuje oba mapowania na `127.0.0.1`. Świadomy dług: bieżący kontener wstał ze starym `-p`, więc ekspozycja trwa do najbliższego restartu; przed demem restartu nie robimy (deadline 17:00).

### F2 — Two checked automated criteria do not pass as written

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Success Criteria
- **Location**: `plan.md` → Phase 2 criterion 2.2, Phase 4 criterion 4.2; Progress items `2.2`, `4.2`
- **Detail**: Both criteria hardcode port 5173: `curl -s -o /dev/null -w '%{http_code}' http://localhost:5173/`. Phase 4 then made the port dynamic on purpose (`vite.config.ts:15`, resolving `PORT` → `DEVCONTAINER_PORT_MAP` → 5173), and this container runs with `DEVCONTAINER_PORT_MAP=7888:7888`. Re-run during this review: `localhost:5173` → `000` (connection refused), `localhost:7888` → `200`. The behaviour is right and the criteria are stale — but both boxes are checked against commands that return failure, which is the pattern the rubber-stamp audit exists to catch. Criterion 4.2's `grep -q '<iframe'` is likewise only true on the real port.
- **Fix**: rewrite both criteria to derive the port instead of naming it, e.g. `curl -s -o /dev/null -w '%{http_code}' "http://localhost:${DEVCONTAINER_PORT_MAP%%:*}/"`, and re-tick against that.
  - *Strength*: the criterion then tests what phase 4 actually built, and stays true on any instance regardless of how `run.sh` was invoked.
  - *Tradeoff*: the command stops being copy-pasteable outside the container, where `DEVCONTAINER_PORT_MAP` is unset.
  - *Confidence*: high — both outcomes measured directly, on this container.
  - *Blind spot*: I did not check whether the boxes were ticked before or after phase 4 changed the port; if before, they were honest at the time and only the record went stale.
- **Decision**: APPLIED (2026-08-28) — kryteria 2.2 i 4.2 w `plan.md` (linie 254, 378) wyprowadzają port z `${DEVCONTAINER_PORT_MAP%%:*}` zamiast go zaszywać. Sekcja `## Progress` nietknięta (inwariant skilla) — ptaszki i zapisane tam komendy zostają jako historyczny ślad.

### F3 — `strictPort` is unset, so a busy port silently moves the app off the published one

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM
- **Dimension**: Safety & Quality
- **Location**: `vite.config.ts:27-31`
- **Detail**: The plan's stated reason for deriving `server.port` from `DEVCONTAINER_PORT_MAP` is that "nikt nie musi pamiętać o zgodności dwóch liczb". Without `strictPort: true`, Vite's default behaviour breaks that guarantee: when the mapped port is taken it picks the next free one and carries on. Observed live during this review — starting a second dev server printed `Port 7888 is in use, trying another one...` and served on `7889`, a port Docker does not publish. The learner then gets a page that never loads, with a dev server that reports success. This is exactly the "renders and freezes"-class misdiagnosis the plan warned about elsewhere, one layer down.
- **Fix**: add `strictPort: true` alongside `host` and `port` in `vite.config.ts`, so a taken port is a loud startup failure rather than a silent relocation.
  - *Strength*: converts an invisible failure into an immediate, readable one at the only moment anyone is watching — startup. One line, no behaviour change on the happy path.
  - *Tradeoff*: running two dev servers at once (a second instance for comparison) now fails instead of quietly working on another port.
  - *Confidence*: high — the silent fallback was reproduced in this container, and `strictPort` is the documented Vite switch for it.
  - *Blind spot*: not verified how `react-router dev` surfaces a strict-port failure — whether the message is legible or a bare stack trace.
- **Decision**: REJECTED (2026-08-28) — znalezisko myli port kontenerowy z portem na hoście. Port w kontenerze jest stałym kontraktem (zawsze ten sam, tu 7888); kolizje pochłania mapowanie po stronie hosta — `run.sh:223` szuka wolnego portu hosta i zapisuje parę jako `container:host` (`run.sh:226`), więc devcontainer może wystawić np. `-p 7889:7888`. Kolizja *wewnątrz* kontenera oznacza, że dev server już tam działa, a odsunięcie się drugiej instancji jest zachowaniem pożądanym, nie awarią. `strictPort` nie jest standardem, do którego plan się zobowiązał.

### F4 — Phase-1 commit is mislabelled and carries an unplanned README edit

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: commit `e268c23` ("remove 3rd party credit :)"), `README.md:1-10`
- **Detail**: `e268c23` is the Progress SHA for both phase-1 items and contains the whole phase-1 contract — `nano`, the pinned `ttyd` download, `/workspace/node_modules` at 0777, the `run.sh` volume, the `cleanup.sh` removal. Its subject describes none of that, and it does not follow the change's `<type>(<change-id>): …` convention used by the sibling chore commits. It also rewrites `README.md`, a file no phase names. The README edit is harmless prose, but it means the commit anchoring the phase cannot be found by its message and does not describe its own contents.
- **Fix**: leave the history alone and note the mapping in the plan's Progress line, or amend the subject to `feat(terminal-panel): devcontainer image and scripts for the terminal` if the commit has not been shared.
- **Decision**: ACCEPTED / NOTED (2026-08-28) — historii nie ruszamy. Mapowanie `e268c23` → obie pozycje fazy 1 jest udokumentowane w tym raporcie i to wystarcza za ślad; edycja `README.md` w tym commicie jest nieszkodliwą prozą.

### F5 — `Inter` is still the first declared font family after the Google Fonts links were dropped

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Architecture
- **Location**: `app/app.css:4`, `app/root.tsx:13`
- **Detail**: Phase 4 change #4 removed the three `fonts.googleapis.com` / `fonts.gstatic.com` entries so first render stops waiting on the network — correctly done, `links` now returns `[]`. But `--font-sans` still lists `"Inter"` ahead of `ui-sans-serif, system-ui`, and nothing loads that face any more. The plan's intent ("strona zostaje przy krojach systemowych") is met only because the browser silently falls through to the next family. It works, and it leaves a name in the theme that no longer means anything — the next reader has to test to find out whether Inter is expected to be there.
- **Fix**: drop `"Inter", ` from the `--font-sans` declaration so the theme states what actually renders.
- **Decision**: SKIPPED (2026-08-28) — stylowaniem zajmuje się teraz inny agent; `--font-sans` zostaje nietknięty, żeby nie kolidować z tamtą pracą. Fallback działa, znalezisko jest kosmetyczne.

### F6 — Substantial post-close work landed with no change record, including a simulated terminal

- **Severity**: 📝 OBSERVATION
- **Impact**: 🏃 LOW
- **Dimension**: Scope Discipline
- **Location**: commits `c7a1ae5`, `812aa97`, `17fd68b`, `764a43f`, `76f97c6`, `6ed4661`, `0a71eff`, `ba0137a`; `mockup/index.html`, `mockup/kapst.jpeg`
- **Detail**: After `6b56eca` ("chore(terminal-panel): close plan"), eight commits added `mockup/` — a 793-line static page plus a 1.2 MB JPEG — and grew it with a fake shell (`Give the terminal a browsable filesystem`, `Tell the learner the shell commands exist`, `Wire up command history on the arrow keys`). None carry a change-id prefix and no change folder covers them, so they sit outside every plan in `context/changes/`. Two things worth naming: this is a *simulated* terminal, which is the one thing this change's own premise rules out ("prawdziwy terminal — nie symulacja"), and a 1.2 MB binary is now permanent history. Neither is charged against this plan — the Progress SHAs do not include them — but a reader of this review would otherwise have to discover them alone.
- **Fix**: open a change for the mockup (`/101-new`) and record what it is for, so the simulated terminal is not later mistaken for the product; decide separately whether `kapst.jpeg` belongs in git or in the image pipeline.
- **Decision**: SKIPPED (2026-08-28) — `mockup/` prowadzi inny agent; nie otwieramy change folderu ani nie ruszamy `kapst.jpeg` z tej strony. Znalezisko zostaje w raporcie jako ostrzeżenie, że symulowany terminal w `mockup/` nie jest produktem tej zmiany.

## Automated Verification (re-run during review)

| Phase | Command | Result |
| --- | --- | --- |
| 1.1 | `bash -n devcontainer/run.sh` | exit 0 ✅ |
| 1.1 | `bash -n devcontainer/cleanup.sh` | exit 0 ✅ |
| 2.1 | `npm run typecheck` | exit 0 ✅ |
| 2.2 | `curl … http://localhost:5173/` | `000` ❌ — app listens on 7888 (`DEVCONTAINER_PORT_MAP=7888:7888`); same command against `localhost:7888` → `200` ✅. See F2 |
| 3.1 | `npm run terminal` then `curl … http://localhost:7681/` | `200` ✅ |
| 4.1 | `npm run typecheck` | exit 0 ✅ |
| 4.2 | `curl … http://localhost:5173/ \| grep -q '<iframe'` | no match ❌ — on `localhost:7888` the response contains `<iframe src="/terminal/" title="Course terminal" …>` ✅. See F2 |
| extra | `curl … http://localhost:7888/terminal/` | `200`, ttyd's own page — proxy and prefix strip work ✅ |
| extra | WebSocket upgrade on `/terminal/ws` | `101 Switching Protocols`, `sec-websocket-protocol: tty` — `ws: true` works ✅ |
| extra | `bash -n scripts/start-terminal.sh` | exit 0 ✅ |

## Manual Verification

Rubber-stamp audit of the checked manual boxes, against evidence visible in the changes and re-checked here:

- **1.2** (phase-1 files committed before restart) — ✅ evidenced by `e268c23`. Note the criterion names `package.json`, which phase 1 deliberately did not touch (the contingency was correctly not triggered); the box is true for the files that were in scope.
- **2.3** (session restarted on a new instance), **2.5** (`DEVCONTAINER_PORT_MAP` set and pointing at the app port) — ✅ `DEVCONTAINER_PORT_MAP=7888:7888` in this session's environment, and the dev server binds 7888 from it.
- **2.4** (`nano` and `ttyd` on PATH) — ✅ `/usr/bin/nano`, `/usr/local/bin/ttyd`.
- **3.2 / 3.3 / 3.4** (typing, `git status`, `vim`/`nano` in the standalone terminal) — ✅ not directly re-driven here, but supported: `ttyd` serves `200` with `--writable`, `--cwd /workspace`, and `change.md` records a WebSocket probe exercising keyboard input, `git status`, `vim` and `nano` through the same path the frame uses. Evidence is present, not assumed.
- **4.3** (two panels, right one filled by the terminal) — ✅ markup shows two `w-1/2 shrink-0` sections inside `flex h-screen overflow-hidden` with a full-size `iframe`; `change.md` records browser measurements (2×640 px at 1280, `tput cols`=78, no horizontal scroll).
- **4.4 / 4.5** (typing and editing inside the embedded terminal) — ✅ same evidence chain as 3.2–3.4, through the proxy: the upgrade to WebSocket was reproduced here on `/terminal/ws`.
- **4.6** (`TERMINAL_URL` redirects the panel) — ✅ **re-verified directly**: with `TERMINAL_URL=http://example.invalid/tty/`, the home route renders `<iframe src="http://example.invalid/tty/" …>`.

No box was found checked without evidence. The manual record in `change.md` is unusually well-supported — machine evidence behind each human sign-off — and the known cosmetic deviation (`I have no name!@…` prompt, from gosu dropping to a host UID absent from `/etc/passwd`) is disclosed there rather than hidden.
