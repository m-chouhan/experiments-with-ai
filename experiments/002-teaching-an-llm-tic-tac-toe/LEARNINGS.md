# Learnings — teaching an LLM tic-tac-toe

Notes captured from building this experiment. The blog write-up is parked; this
is the raw material for it.

The app is a minimal human-vs-LLM tic-tac-toe played in the terminal: you are
X, Gemini is O. It runs directly on Node 24's native TypeScript (no build step).
Three files: `game.ts` (rules), `llm.ts` (the opponent), `play.ts` (the loop).

---

## 1. Well-formed ≠ legal (the headline)

The most LLM-specific lesson. The model returns a perfectly-parsed, schema-valid
move — a number 0–8 with a reason — that is still an **illegal** play, because it
names a cell that is already taken. Structured output guarantees the *shape* of
the answer, never its *correctness* against the rules.

So we don't hide it or silently retry. We measure it: compute legality on our
side and surface it (`llm.ts`).

```ts
return { cell: output.cell, reason: output.reason, illegal: !isLegal(game, output.cell) };
```

In the game an illegal move ends the game as a forfeit, printed plainly. That
illegal-move rate is the experiment's real signal about how well the model
"understands" the board.

**Takeaway:** validate an LLM's output against your domain rules even when it
parsed cleanly. The schema checks the envelope; you check the contents.

---

## 2. Getting typed data out of an LLM

Rather than ask for prose and scrape a number out of it, we tell the SDK the
exact shape we want and get a parsed object back. Three pieces, one mechanism:

- **zod** — a runtime schema. You describe the data's shape once, in code, and
  get both TypeScript types *and* runtime validation from it.

  ```ts
  const moveSchema = z.object({
      cell: z.number().int().min(0).max(8),
      reason: z.string(),
  });
  ```

- **`generateText`** — the Vercel AI SDK's one-shot call. You hand it a model, a
  system prompt, and the user prompt.

- **`Output.object({ schema })`** — the bridge: it passes the zod schema to the
  model as the required output format and parses/validates the reply, so
  `output` comes back typed as `{ cell: number; reason: string }`.

  ```ts
  const { output } = await generateText({
      model: google(modelId),
      system: SYSTEM,
      prompt: promptFor(game),
      output: Output.object({ schema: moveSchema }),
      // ...
  });
  ```

**Takeaway:** define the schema once with zod; let the SDK make the model
conform to it. No regexes, no "parse the 3rd word" fragility. (But see §1 — valid
shape is not valid move.)

---

## 3. A resilient LLM call is more than the call

The naive version — one `await` to one model — fails the turn the first time a
model is overloaded (a common, transient "high demand" error) or hangs. The
resilience lives *around* the call (`llm.ts`):

- **Model fallback chain** — try models in order; on failure, fall through to
  the next instead of failing the turn.

  ```ts
  const MODELS = ['gemini-flash-latest', 'gemini-3.5-flash-lite'];
  ```

- **`maxRetries: 1`** — the SDK retries twice by default and *bills every
  attempt*, which also makes an overloaded model slow to give up. One retry,
  then move on.

- **`AbortSignal.timeout(15_000)`** — under load a model can hang rather than
  error. A hard per-attempt deadline turns a stall into a fast failover.

The loop returns on the first success and only throws if *every* model fails:

```ts
for (const modelId of MODELS) {
    try { return /* ...first success... */; }
    catch (error) { lastError = error; }
}
throw lastError;
```

**Takeaway:** treat the API call as unreliable by default. Budget for retries
(and their cost), deadlines, and a fallback — these are the difference between a
demo and something you can actually sit and play.

---

## 4. API key hygiene

Getting and handling the key, kept boring on purpose:

1. Create a key in Google AI Studio.
2. Put it in a local `.env` as `GOOGLE_GENERATIVE_AI_API_KEY=...`.
3. Commit a `.env.example` template (placeholder value) so the next person
   knows what to set; **gitignore the real `.env`**.
4. Load it with Node's built-in `process.loadEnvFile()` — no `dotenv`
   dependency. A missing file is fine; the key may already be in the env.

```ts
try { process.loadEnvFile(); } catch { /* no .env; carry on */ }
```

**Takeaway:** `.env` (ignored) + `.env.example` (committed) is the whole pattern.
The secret never touches git; the SDK reads the key from the environment by its
conventional name, so no key-handling code is needed beyond loading the file.

---

## 5. App architecture in a nutshell

Three modules, each with one job, with the dependency arrow pointing one way
(`play` → `llm` → `game`; `game` depends on nothing):

- **`game.ts` — pure rules engine.** No UI, no network, no randomness. Just the
  board and its rules. `isLegal` is the *single source of truth* for legality;
  `play` and both callers route through it. Easy to reason about and trivially
  testable.
- **`llm.ts` — the LLM boundary.** Everything model-specific — prompt building,
  the SDK call, the schema, the fallback — lives here and nowhere else.
- **`play.ts` — the I/O loop.** Reads input, prints the board, drives the turns.

Two design decisions worth their own mention:

- **Forfeit as a terminal game state.** An illegal LLM move doesn't throw or set
  a special flag — it produces an ordinary terminal `Game` (via `forfeit`, which
  lives in `game.ts` with the other state transitions). So the game loop
  (`while (!game.over)`) and the result announcer handle win / draw / forfeit
  uniformly, with no special case. (Ousterhout: *define errors out of
  existence*.)
- **The one real error at the boundary.** The genuine failure — the API call
  failing after all fallbacks — is kept as an explicit `throw`, caught exactly
  once at the program's edge (`main().catch`), not inside the loop. This keeps a
  *failed call* cleanly distinct from an *illegal move*, which matters for
  measuring the model (§1).

```ts
while (!game.over) {
    render(game);
    game = game.turn === HUMAN
        ? play(game, await humanMove(rl, game))
        : await llmTurn(game);
}
```

**Takeaway:** push all the model-specific mess to one boundary module, keep a
pure core that knows nothing about LLMs, and decide deliberately which
conditions are *states* (handle by design) vs. *errors* (throw once, at the
edge).

---

## 6. A first eval: grading play against an oracle

An **eval** is just a repeatable measurement of model behaviour: fixed inputs,
run them through the model, score the outputs against something you trust. It
turns a vibe ("seems to play okay") into a number you can compare across models
and prompts. Our first cut lives in `eval.ts` + `minimax.ts`.

**The approach — position suite + oracle.** Rather than play whole games (noisy,
many API calls), we use a small suite of fixed board **positions**, each chosen
to test one idea. For each, we ask the model for its move and **grade** it. The
grader is a **minimax oracle** (`minimax.ts`): because tic-tac-toe is tiny, we
can compute, for any position, the exact game-theoretic value of every move with
perfect play. That gives ground truth — no second LLM, no hand-labelling.

**How a move is graded** (three buckets, easy to explain):

- `value(game, mark)` returns `+1 / 0 / -1` (win / draw / loss) for a position
  with optimal play, by ordinary minimax recursion over the rules engine.
- `bestMoves(game)` = every move that achieves the best value the side to move
  can force. *Any* of these is **optimal** — "optimal" is a set, not one cell.
- `grade(game, cell)` → **illegal** (not a playable cell), **optimal** (achieves
  the best value), or **suboptimal** (legal but gives up value).

**Scope — start dead-simple, then add one knob at a time.** First cut was one
model, one prompt, one pass over four positions, printed to the console. Then,
deliberately and in order: a **random-legal baseline** (§7), **K trials** per
position (the model is stochastic, so report a *rate*), and a **12-position
suite sliced by type**. Still no model × prompt matrix, no JSONL — those are the
next knobs.

**Gotcha that taught the method — vet positions offline first.** My first four
positions were duds. One was already *lost* for X (O had a hidden fork), so
every move scored `-1` and the oracle called them all "optimal" → a meaningless
`4/4`. The oracle was right; the *positions* were bad. The fix is a rule now
baked into the workflow: **a good eval position has an optimal set that is a
strict subset of the legal moves** (otherwise there's nothing to distinguish).
We verify that with the free, offline oracle *before* spending any API calls —
and generate candidates programmatically (random playouts, kept only if
discriminating) rather than hand-picking and hoping.

**Qualitative findings — the failures, not the score, are the point:**

- On a must-block position the model played a legal but **losing** move,
  justified by a **hallucinated** win ("complete the winning diagonal for X" —
  there was no such diagonal), ignoring the opponent's actual threat. §1
  sharpened: a well-formed, legal move can still be tactically lost, and the
  stated reason can be confident fiction.
- **Reasons are unreliable even when the move is right:** on a winning position
  the model played the correct cell but described it as "block… and win next"
  when it had won outright. Don't read the rationale as an explanation.
- **Failures are deterministic misconceptions, not noise.** Six of twelve
  positions came back 0/3 with the *same* wrong move all three trials. Sampling
  K times confirmed the model isn't unlucky — it has a stable, wrong idea.
- **The eval exposed a hidden fragility:** `gemini-flash-latest` times out on
  essentially every structured-output call (15s + retry); the eval only runs
  pinned to `gemini-3.5-flash-lite`. The game had been masking this behind its
  model fallback chain (§3).

---

## 7. Grading the score: a number means nothing without a baseline

A raw score (our first run read `3/4 optimal`) is almost meaningless on its own:
the sample is tiny, the model is stochastic, and — most importantly — there's
nothing to compare against. The fix is a **baseline**: the simplest policy that
isn't the model.

**Random-legal, computed exactly.** A player that picks uniformly among legal
moves is optimal with probability `|optimal cells| / |legal cells|` — so we get
the baseline's rate *exactly, with no sampling*, straight from the oracle. It's
the floor the model has to clear to show it's doing more than guessing.

**The n=12 result (3 trials each, averaged over positions):**

```
                   model   random
overall             50%     28%
win-available       67%     34%     <- takes an in-hand win ~2/3 of the time
no-immediate-win    33%     22%     <- needs lookahead -> barely above random
```

Two things only the baseline + the slice reveal:

- **"50%" is unimpressive, not decent** — random already scores 28%, and the gap
  shrinks to almost nothing on positions that require looking ahead. The model
  *reacts* (grabs a visible win) far better than it *plans*.
- **Aggregate hides everything; slice by category.** The honest read isn't "50%"
  — it's "67% when a win is on the board, 33% when it has to think." Slicing is
  where the finding lives.

**Caveat we'd state in any write-up:** n=12 is small, so the overall `50 vs 28`
isn't statistically tight. The robust signal is the *per-type pattern*, which
held across every run (n=4, and two n=12 runs).

**How the industry grades such systems (evolving, but conventions exist):**
compare against baselines and *track the trend across versions* rather than
chasing an absolute pass mark; report rates with repeats, not single tallies;
**slice by category**; use held-out sets guarded against contamination; and do
**error analysis** — the failures matter more than the mean. Common metrics by
task shape: accuracy / exact-match, `pass@k` (code), precision/recall/F1,
win-rate + Elo (pairwise), and LLM-as-judge calibrated against humans.

---

## 8. Two engineering learnings from scaling the eval

- **Rate limits are part of eval design.** 60 unpaced calls blew straight
  through Gemini's free tier (15 requests/minute) and failed half the trials on
  quota errors. Fix: **pace the calls** (a fixed delay between requests) to stay
  under the limit, and don't over-sample — the model is near-deterministic, so 3
  trials carry the same signal as 5 at half the cost.
- **The harness needs the same scrutiny as the thing it measures.** A position
  whose every trial timed out was being scored `0%` and folded into the average
  — fabricated data pulling the number down. No-data cases must be **excluded**,
  not counted as zero. Measuring instruments can be buggy too.

---

## Parked for next: wider matrix + observability

- **Widen the matrix:** several models × a couple of prompt variants over the
  same (bigger) suite, to turn the eval from "how does this model do" into "which
  model / prompt does best."
- **Record per-call data to JSONL** for later analysis — also where the
  observability signals live, for free: latency per attempt, which model
  answered (fallback depth), retry / timeout / failure counts, token usage
  (`generateText` returns `usage`), and the illegal / suboptimal rate. Open
  question: console vs. JSONL vs. a real tracing tool.
