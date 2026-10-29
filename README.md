# Is LLD dead?

Same small app, same behaviour, two code styles. Give an AI agent the same two change
requests on each and measure time, tokens and correctness.

## The app

A parking-lot CLI (`projects/*/README.md` is the spec the agent sees): park, leave and
quote with bikes, cars and trucks across small, medium and large spots.

- `projects/junior` — how a fresher writes it: one file, if/else per vehicle type, spot lists
  per size, hardcoded rates, fee logic copy-pasted into `leave` and `quote`.
- `projects/mature` — how an experienced engineer writes it: one file of the same length,
  vehicles and spots as data, and three small classes (`ParkingLot` allocates spots,
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

## Run

```bash
node harness/run.mjs            # both versions, change 1 then change 2
```

Each version gets a fresh git repo; the harness commits after each change and fetches the
result into this repo as branch `exp/junior` / `exp/mature`. Per change it records wall time,
turns, tokens, cost, diff size and test results in `results/<timestamp>.json`.

Pinned model `claude-sonnet-5-5`, tools `Read,Edit,Write,Bash,Glob,Grep`, no user settings
or MCP servers. `archive/tictactoe-pilot/` holds the earlier tic-tac-toe pilot.
