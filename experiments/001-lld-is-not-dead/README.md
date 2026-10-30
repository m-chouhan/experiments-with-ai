# 001 · Is LLD dead?

Same behaviour, two code designs. Give an AI agent the same change requests on each and
measure time, tokens and correctness. Write-up: [blog.md](blog.md).

```
harness/     runs a study: fresh repo per trial, sandboxed agent, hidden tests, results
studies/     one folder per study: its good and bad variants, tasks, hidden tests
analysis/    static design metrics and step-level metrics from transcripts
results/     every run's numbers and transcripts, by round (v1–v5)
```

Each study has `study.mjs` (variants, tasks, how they run), `variants/good` and `variants/bad`
(the code the agent gets), and `tasks/<id>.md` + `tasks/<id>.test.*` (the prompt and its hidden tests).

## Study 1: parking

A parking-lot CLI (`studies/parking/variants/*/README.md` is the spec the agent sees): park,
leave and quote with bikes, cars and trucks across small, medium and large spots.

- `variants/bad` — how a fresher writes it: one file, if/else per vehicle type, spot lists
  per size, hardcoded rates, fee logic copy-pasted into `leave` and `quote`.
- `variants/good` — how an experienced engineer writes it: one file of the same length,
  vehicles, spots and commands as data tables, and three small classes (`ParkingLot` allocates spots,
  `Pricing` computes fees, `Cli` parses commands).

Two changes, applied in order on the same repo:

1. `change1` — electric vehicles and charging spots.
2. `change2` — monthly passes and an 8-hour fee cap.

`baseline.test.js` has Given/When/Then scenarios both variants pass; `equivalence.test.js`
checks 500 random sessions give identical output on both.

```bash
PROJECT_DIR=studies/parking/variants/bad node --test studies/parking/baseline.test.js
```

Rounds v1–v5 called these variants `junior` (bad) and `mature` (good); their results and
branches keep those names.

## Study 2: semver

`variants/good` is [node-semver](https://github.com/npm/node-semver) 7.8.5 (ISC). `variants/bad`
has the same public API, behaviour and test suite, rewritten against John Ousterhout's design
principles: duplicated knowledge, leaked internals, long conjoined functions
(`studies/semver/degradations.md`). `node analysis/measure.mjs semver good bad` compares them with
complexity, Sonar, duplication and dependency metrics; `studies/semver/equivalence.test.mjs` checks
both give identical results on fixtures plus seeded random input.

Four independent tasks, each started from the baseline:

1. `t1-uppercase-v` — accept `V1.2.3`.
2. `t2-prerelease-tags` — option letting tagged prereleases match ranges.
3. `t3-natural-prerelease` — option ordering `rc9` before `rc10`.
4. `t4-compatible-release` — the `~=` range operator (a control: similar work in both variants).

Reference solutions for both variants are in `studies/semver/reference/`. Each trial also reruns
the original upstream suite against the agent's code.

```bash
PROJECT_DIR=studies/semver/variants/bad node --test studies/semver/tasks/t2-prerelease-tags.test.mjs
```

## Run

```bash
node harness/run.mjs --study parking --model haiku --runs 3   # both variants, change1 then change2, 3 times
node harness/run.mjs --study semver --model sonnet --task t2-prerelease-tags   # one task, both variants
node harness/run.mjs --study semver --dry-run                 # print the planned trials, run nothing
```

| File | Job |
|---|---|
| `harness/run.mjs` | Flags, plan the trials, run them, summary table |
| `harness/workspace.mjs` | Fresh git repo per trial, commit, diff, keep as a branch |
| `harness/agent.mjs` | Launch Claude Code inside the sandbox |
| `harness/transcript.mjs` | Read Claude's stream into metrics and a readable step log |
| `harness/grade.mjs` | Hidden tests and the upstream suite |

Each trial gets a fresh git repo seeded from one variant; the harness commits after each task
and fetches the result into this repo as a branch under `001-lld-is-not-dead/<model>/<study>/`.
Claude runs under macOS `sandbox-exec`: it cannot read this repo (so never sees the tests) or
write outside its working folder, and neither its folder name nor its git log says which variant
it has. Pinned model, Claude Code's own system prompt and tools `Read,Edit,Write,Bash,Glob,Grep`
(as a real agent runs), no user settings or MCP servers.

## Results

- `results/<timestamp>.json` — per trial: wall time, turns, tool calls, tokens (input,
  output, thinking, cache), cost, diff size, hidden-test results.
- `results/transcripts/<model>/<study>/<variant>-<run>/<task>.md` — readable step log: the model's
  thinking, what it said, each tool call and its result. Raw stream in `.jsonl` alongside.
- `results/v1/` — first round, run against the original mature baseline (see its README).
- `results/v2/` — Haiku ×3 on the fixed mature baseline, still with Claude Code's default prompt and tools.
- `results/v3/` — Haiku ×3 on parking with a one-line system prompt and three minimal tools (`read_file`, `write_file`, `run_command`) instead of Claude Code's defaults.
- `results/v4/` — semver, Haiku: T2 and T4 ×2 per variant, plus a single T2 pilot (`pilot/`).
- `results/v5/` — parking rerun, Haiku with Claude Code defaults ×2 per variant; no difference in tokens or steps (`node analysis/trajectory.mjs results/v5/transcripts`).
- `analysis/reports/` — duplication and dependency HTML reports and CodeCharta maps for semver good and bad.

Results JSON before v6 uses `pair` and `version` for what is now `study` and `variant`.
