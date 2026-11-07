# 002 · Can an LLM play tic-tac-toe?

Wire a real LLM into a tiny console game, watch it play, then build an eval to measure how
well it *actually* plays. A human (X) plays Gemini (O) in the terminal — no UI, no framework.
Write-up: [blog.md](blog.md).

```
game.ts          the rules engine — board, legality, win/draw/forfeit. Pure, no network.
llm.ts           the LLM boundary — prompt, zod schema, structured output, retries + fallback.
play.ts          the console loop — print the board, read a move (human or model), repeat.
eval.ts          the experiment — fixed positions × trials, each move graded by the oracle.
minimax.ts       the oracle — value / bestMoves / grade (optimal · suboptimal · illegal).
record-game.ts   plays one full game vs perfect play and records it for the blog replay.
data/            recorded results the blog widgets read (eval numbers + a full game transcript).
images/          blog figures.
```

## App

Three files, one job each, dependency arrow pointing one way (`play` → `llm` → `game`):

- **`game.ts`** — pure rules. `isLegal` is the single source of truth; an illegal move becomes
  an ordinary terminal game via `forfeit`, so the loop handles win / draw / forfeit uniformly.
- **`llm.ts`** — everything model-specific. A zod `moveSchema` + the Vercel AI SDK's
  `generateText` with `Output.object({ schema })` gives a typed `{ cell, reason }` back (no
  regex parsing). Wrapped in a model fallback chain, `maxRetries: 1`, and a 15s timeout.
- **`play.ts`** — the I/O loop. The one real error (API failure after all fallbacks) is thrown
  once and caught at the edge, kept distinct from an illegal *move*.

## Eval

`eval.ts` + `minimax.ts` turn "seems to play okay" into a number. Tic-tac-toe is tiny, so a
**minimax oracle** gives free, exact ground truth: every move is graded **optimal**,
**suboptimal**, or **illegal**. A **random-legal baseline** (computed exactly as
`|optimal| / |legal|`) is the floor the model has to clear, and positions are sliced by type
so the aggregate can't hide the story.

## Run

Needs Node 24+ (runs TypeScript natively, no build step) and a Gemini key.

```bash
npm install
cp .env.example .env            # then add your GOOGLE_GENERATIVE_AI_API_KEY
npm run play                    # play a game: you are X, the model is O
npm run eval                    # run the position suite and print the graded rates
npm run typecheck               # tsc --noEmit
node record-game.ts             # re-record data/game-transcript.json (the blog replay)
```

## The finding

The model **reacts, it doesn't plan**. On `gemini-3.5-flash-lite`, across 12 positions × 3 trials:

```
                   model   random
overall             50%     28%
win-available       67%     34%     <- grabs an in-hand win ~2/3 of the time
no-immediate-win    33%     22%     <- needs lookahead -> barely above random
```

50% isn't "decent" — random already scores 28%, and the gap nearly closes the moment the model
has to look one move ahead. Structured output guarantees the *shape* of a move, never its
legality or correctness; the model's stated `reason` is a plausible caption, not an explanation.
The full story, with an interactive game replay, is in [blog.md](blog.md).
