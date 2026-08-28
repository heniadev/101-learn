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
with no recording then fails **loudly** with HTTP 409 and a message naming the
exact prompt to capture — never a silent fallback to a live call nobody
expected during a demo.

Use `auto` while building the course: known prompts replay instantly and for
free, new ones record themselves as you hit them.

## How a request is matched

By the model and **the last user message**, normalised (trimmed, whitespace
collapsed, lowercased) and hashed.

Keying on the whole conversation would miss on every replay: Claude Code
threads its own ids, timestamps and tool results through the history, so two
turns that look identical to a human never hash the same. The last user
message is the part the learner actually controls, which is what makes the
demo path reproducible.

The consequence worth knowing: **the same prompt always gets the same answer,
regardless of what came before it.** For a scripted three-step path that is
exactly right. For free exploration it is not — a learner who wanders off the
script gets an answer from the wrong context, or a 409. That is the trade this
design makes deliberately.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `MOCK_LLM_MODE` | `replay` | `record` \| `replay` \| `auto` |
| `MOCK_LLM_PORT` | `7999` | Listening port, loopback only |
| `MOCK_LLM_RECORDINGS` | `./recordings` | Where recordings live |
| `MOCK_LLM_UPSTREAM` | `https://api.anthropic.com` | Real API, used when recording |
| `MOCK_LLM_REPLAY_SPEED` | `1` | `2` replays twice as fast; `0` is treated as `1` |

Recording needs `ANTHROPIC_API_KEY` in the environment; replay needs nothing.
