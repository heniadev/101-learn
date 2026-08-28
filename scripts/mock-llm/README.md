# Mock LLM — deterministic answers for the course terminal

The terminal runs a real `claude`. Left alone it talks to the live API, which
means the demo is billed, rate-limited, and free to answer differently than it
did in rehearsal. This proxy removes all three: `claude` talks to it instead,
and every answer is one that was recorded earlier and reviewed.

Recordings are the **raw SSE byte stream** from the real API, stored verbatim
with their arrival timing. Replay writes those bytes back at the pace they
arrived. Nothing here parses the model's semantics, so a change to the event
schema cannot break replay — and the audience sees exactly what was recorded,
typing out at a natural speed rather than landing in one frame.

## Running it

```bash
npm run mock-llm              # replay (default) — the demo mode
npm run mock-llm:record       # forward upstream and save every answer
npm run mock-llm:auto         # replay what is known, record what is not
```

The server listens on `127.0.0.1:7999` and never binds a public interface. It
is not published from the container: only processes inside reach it.

Point a shell at it with:

```bash
export ANTHROPIC_BASE_URL=http://127.0.0.1:7999
```

`scripts/start-terminal.sh` does this for the course terminal automatically
when `TERMINAL_LLM_MOCK=1` is set, so the learner's shell is mocked while your
own agent session is not.

## Filling the mock while you work on the skills

The point is that you do not write recordings by hand — you capture the real
thing once, while doing the work you were going to do anyway.

1. Start the proxy in record mode: `npm run mock-llm:record`.
2. In another shell, point `claude` at it and work normally:
   ```bash
   ANTHROPIC_BASE_URL=http://127.0.0.1:7999 claude
   ```
   Every turn is forwarded to the real API, returned to you unchanged, and
   saved to `recordings/`.
3. Read what you captured. `recordings/` holds one file per prompt, named
   `<digest>.<slug>.sse`; the first line is a JSON header carrying the model,
   the prompt and the timestamp. **Delete any answer you would not want on
   stage** — a bad take is removed by deleting its file, not by editing it.
4. Re-run the same prompts in replay mode and watch them come back identically.

For a rehearsal that must not hit the network at all, use `replay`. A prompt
with no recording then fails **loudly** with HTTP 400 and a message naming the
exact prompt to capture — never a silent fallback to a live call nobody
expected during a demo.

Use `auto` while building the course: known prompts replay instantly and for
free, new ones record themselves as you hit them.

## How a request is matched

By the model and **the whole conversation** — every message flattened to text
(tool calls and tool results included), normalised and hashed.

Keying on the last user message alone was tried first and does not work: an
agent turn that follows a tool call carries no text block at all, so every one
of those collapsed into a single "empty" key, one recorded answer came back for
all of them, and the agent looped on it. What distinguishes those turns is the
tool results above them, so the key has to span the history.

That only works because the normaliser removes everything the client mints per
run before hashing: `<system-reminder>` blocks (which carry the date, the
session id and the project's CLAUDE.md), tool-use / message / request /
session ids, uuids, long hex strings, dates and times. What is left is the
part the learner and the repository actually determine.

Two consequences worth knowing, both load-bearing for the demo:

- **The whole path is one key chain.** Diverge once — a different sentence, a
  different option in a chooser — and every later turn misses too, because the
  divergence stays in the history. A learner cannot wander off the script and
  wander back.
- **Anything not normalised away is part of the key**, including absolute
  paths, file owners, modes and link counts that appear inside tool results.
  This is why the course terminal must start in the same directory the
  recording was made in; see `scripts/provision-course.sh`.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `MOCK_LLM_MODE` | `replay` | `record` \| `replay` \| `auto` |
| `MOCK_LLM_PORT` | `7999` | Listening port, loopback only |
| `MOCK_LLM_RECORDINGS` | `./recordings` | Where recordings live |
| `MOCK_LLM_UPSTREAM` | `https://api.anthropic.com` | Real API, used when recording |
| `MOCK_LLM_REPLAY_SPEED` | `1` | `2` replays twice as fast; `0` is treated as `1` |

Recording needs `ANTHROPIC_API_KEY` in the environment; replay needs nothing.
