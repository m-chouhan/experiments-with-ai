# Is LLD dead?

Same small app, same behaviour, two code styles. Give an AI agent the same two change
requests on each and measure time, tokens and correctness.

## The app

A parking-lot CLI (`projects/*/README.md` is the spec the agent sees): park, leave and
quote with bikes, cars and trucks across small, medium and large spots.

- `projects/junior` — how a fresher writes it: one file, if/else per vehicle type, spot lists
  per size, hardcoded rates, fee logic copy-pasted into `leave` and `quote`.
- `projects/mature` — how an experienced engineer writes it: one file of the same length,
  vehicles, spots and commands as data tables, and three small classes (`ParkingLot` allocates spots,
  `Pricing` computes fees, `Cli` parses commands).

## The changes (applied in order)

1. `prompts/change1.md` — electric vehicles and charging spots.
2. `prompts/change2.md` — monthly passes and an 8-hour fee cap.

## Tests

- `tests/baseline/` — Given/When/Then scenarios both versions pass, plus a 500-session
  random check that both produce identical output.
- `tests/target/` — scenarios for each change. The agent never sees any tests: it works in
  a fresh repo containing only the project.

```bash
PROJECT_DIR=projects/junior node --test tests/baseline/*.test.js
```

## Second pair: semver

`projects/good` is [node-semver](https://github.com/npm/node-semver) 7.8.5 (ISC). `projects/bad`
has the same public API, behaviour and test suite, rewritten against John Ousterhout's design
principles: duplicated knowledge, leaked internals, long conjoined functions
(`analysis/semver-degradations.md`). `node analysis/measure.mjs good bad` compares them with
complexity, Sonar, duplication and dependency metrics; `tests/semver/equivalence.test.mjs` checks
both give identical results on fixtures plus seeded random input.

Four independent tasks (`prompts/semver/`), each started from the baseline:

1. `t1-uppercase-v` — accept `V1.2.3`.
2. `t2-prerelease-tags` — option letting tagged prereleases match ranges.
3. `t3-natural-prerelease` — option ordering `rc9` before `rc10`.
4. `t4-compatible-release` — the `~=` range operator (a control: similar work in both versions).

Hidden tests are `tests/semver/<task>.test.mjs`; reference solutions for both versions are in
`tests/semver/reference/`. Each run also reruns the original upstream suite against the agent's code.

```bash
PROJECT_DIR=projects/bad node --test tests/semver/t2-prerelease-tags.test.mjs
```

## Run

```bash
node harness/run.mjs --model haiku --runs 3   # parking: both versions, change 1 then change 2, 3 times
node harness/run.mjs --pair semver --model sonnet --task t2-prerelease-tags   # one semver task, both versions
```

Each version gets a fresh git repo; the harness commits after each change and fetches the
result into this repo as a branch under `exp/<model>/<pair>/`. Claude runs under macOS
`sandbox-exec`: it cannot read this repo (so never sees the tests) or write outside its
working folder. Pinned model, Claude Code's own system prompt and tools
`Read,Edit,Write,Bash,Glob,Grep` (as a real agent runs), no user settings or MCP servers.

Results:
- `results/<timestamp>.json` — per change: wall time, turns, tool calls, tokens (input,
  output, thinking, cache), cost, diff size, hidden-test results.
- `results/transcripts/<model>/<pair>/<version>-<run>/<task>.md` — readable step log: the model's
  thinking, what it said, each tool call and its result. Raw stream in `.jsonl` alongside.
- `results/final-diffs/` — baseline → after change 2, per run.
- `results/v1/` — first round, run against the original mature baseline (see its README).
- `results/v2/` — Haiku ×3 on the fixed mature baseline, still with Claude Code's default prompt and tools.
- `results/v3/` — Haiku ×3 on parking with a one-line system prompt and three minimal tools (`read_file`, `write_file`, `run_command`) instead of Claude Code's defaults.
- `results/v4/` — semver, Haiku: T2 and T4 ×2 per version, plus a single T2 pilot (`pilot/`).
- `results/v5/` — parking rerun, Haiku with Claude Code defaults ×2 per version; no difference in tokens or steps (`node analysis/trajectory.mjs results/v5/transcripts`).
- `analysis/reports/` — duplication and dependency HTML reports and CodeCharta maps for good and bad.

`archive/tictactoe-pilot/` holds the earlier tic-tac-toe pilot.
