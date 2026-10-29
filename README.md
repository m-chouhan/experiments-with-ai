# LLD token experiment

Does good low-level design still matter when an AI agent writes the code?
Measure it: same feature, same behaviour, two codebases, two prompts.

## Design

2×2 matrix, each cell run N times with a pinned model (`claude-sonnet-5-5`, Sonnet only):

|                    | careful prompt | vague prompt |
|--------------------|----------------|--------------|
| `projects/designed` | ✓              | ✓            |
| `projects/poor`     | ✓              | ✓            |

- `projects/designed` — tic-tac-toe CLI split into `main.js` (CLI, stdin, scores output) and `src/{board,game,ai,scores}.js`. The board and win check are size-generic internally (`board.length`); the CLI fixes size 3.
- `projects/poor` — identical behaviour, one file, globals, one-letter names, `3` hardcoded throughout (board literal, win check, AI scan, input validation, full-board check).
- **Feature to add:** `--size N` and `--win K` (see `prompts/careful.md`).
- `acceptance/regression.test.js` and `acceptance/golden.test.js` pass on both baselines; `acceptance/feature.test.js` (11 tests) fails on both except "default board stays 3x3", and defines "done". A reference implementation (not committed) passes all three suites, so the tests are satisfiable.
- `acceptance/golden.json` holds 300 seeded random sessions (612 games: wins, draws, incomplete, junk input, AI as X/O, pre-existing/corrupt score files), each with exact expected stdout and final scores file. It proves the two baselines are equivalent, and checks after the feature that 3×3 behaviour is byte-for-byte unchanged. Regenerate with `node harness/record-golden.mjs`.
- Tokens only count for runs that pass the acceptance tests.

## Run

```bash
PROJECT_DIR=projects/designed node --test acceptance/regression.test.js   # sanity check a baseline
node harness/run.mjs --runs 5                                               # full matrix, appends results/results.csv
node harness/run.mjs --runs 1 --only poor:vague                             # single cell
```

Each run is isolated: fresh temp copy of the project (acceptance tests hidden), pinned model, only `Read,Edit,Write,Bash,Glob,Grep`, no user settings/MCP servers (`--setting-sources project,local --strict-mcp-config`).

Metrics per run (`results/results.csv`): pass/fail per suite, wall time, API time, turns, cost, input / output / thinking / cache tokens, tool calls by kind, characters of tool output read, files changed, lines added/removed. `results/runs/<id>/` keeps the full stream-json transcript and the patch.

## Caveats (state them in the write-up)

Small app, one model, one feature, agent runs are noisy (report medians and spread).
