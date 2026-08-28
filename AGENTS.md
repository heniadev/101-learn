# Repository Guidelines

## Hard rules (hackathon mode)

- **Deadline is 2026-08-28 17:00.** Every decision optimizes for a working
  demo at 17:00, not for maintainability. Say so out loud when you trade
  quality away.
- **Demo-first:** if a feature is not visible in the 60-second run-through,
  it does not get built today. Ask before adding anything off the demo path.
- **The agent in the terminal is rigged.** It replays pre-programmed
  answers from a script file. Never wire a real model call into it.
- **Never touch `context/`** — it is the project memory. `devcontainer/`
  is existing infrastructure; do not rewrite it, only extend.
- **No `git add -A`.** Stage files by name. Commit per working increment.

## Project

Browser-based interactive learner (Katacoda-style): left panel shows 1–3
paragraphs plus navigation buttons, right panel is a live terminal with a
rigged agent, `git`, and ordinary editors. The demo scenario walks the
101 toolkit path — realistically the first three steps from
`.claude/skills/HOWTO.md` (`/101-init` → `/101-shape` → `/101-prd`).

## Working agreement

- Team is one person. Prefer parallel subagents for any independent work
  (research, scaffolding, content authoring) instead of serial steps.
- Prefer `/101-goal-implement` (unattended) over `/101-implement` for
  planned phases; manual checks still come back for a human tick.
- Read `context/foundation/` before planning anything. The files are the
  memory, not the conversation.
- Assumptions that block work get written down as `[GAP: …]` and carried
  forward — never guessed silently.

## Communication

- **Short sentences. Point first.** No wall of text — the reader is on a
  clock and will ask if something is unclear.
- **Lead with the answer or the decision.** Reasoning only if asked, or if
  it changes what the reader does next.
- **Obvious actions: monkey language.** "Fixed X." "Port not published."
  "Done, 3 files." Full prose is for real trade-offs only.
- No preamble, no recap of what was just asked, no summary of a summary.
- Options: name them, one line each. Do not narrate the ones not taken.

## Structure

- `.claude/skills/` — the 101 toolkit (read-only reference; `HOWTO.md` is
  the map).
- `context/foundation/` — long-lived docs (shape-notes, PRD, roadmap).
- `context/changes/<id>/` — work in progress; archived when done.
- `devcontainer/` — Docker harness the demo runs inside.

## Refresh

This file was written under time pressure. Re-run `/101-agents-md` after
the hackathon to bring it up to the toolkit's own standard.
