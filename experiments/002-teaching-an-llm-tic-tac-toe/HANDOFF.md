# Handoff — Chapter 002: Teaching an LLM to play Tic-Tac-Toe

> Written 2026-11-03 to let a fresh session pick up from here. The slug
> `002-teaching-an-llm-tic-tac-toe` is a suggestion, not locked — rename the folder
> if a better title emerges.

## The goal

Build a **simple console (no UI) tic-tac-toe app with an LLM opponent**, here in this
repo as Chapter 002. Sequence:

1. **Now:** a clean console app where a human (or a baseline bot) plays tic-tac-toe
   against an LLM. Forget the UI entirely. This is roadmap "v1 — it plays".
2. **Later:** take the solid console build and **integrate it back into the
   my-portfolio web app** (which already has a tic-tac-toe module — see below).
3. **Later:** **document the learnings** as a write-up (`blog.md`) in the same
   story-driven style as Chapter 001, aimed at devs who aren't yet comfortable
   integrating LLMs into their stack. **The blog is explicitly parked for now** —
   capture learnings as you go, but don't write the post yet.

### Why here and not in the portfolio

The portfolio repo stays **private**. This repo (`lld-token-experiment`, published as
*"Experiments with AI"*) is the public home for AI explorations, one self-contained
chapter per experiment. So Chapter 002 lives here, and the eventual write-up is crafted
from this repo's point of view — exactly like Chapter 001 (`001-lld-is-not-dead`).

## The plan this fits into (source of truth)

Notion page **"🤖 AI engineer roadmap"** (Research Journal), Milestone 1: *Tic Tac Toe
vs LLM*. URL: https://app.notion.com/p/3cf0d9b9719280d5b9bec8f78f2a5073

- **v1 — "It plays":** board + backend, LLM returns its move as JSON, code validates
  and handles illegal/bad moves. **← we are doing the console form of this.**
- **v2 — "It's measured":** headless mode playing ~100 games vs a **random bot** and a
  **minimax bot**, tracking win/draw/loss, **illegal-move rate**, latency, cost per game,
  across 2–3 models. **Parked** (this is the eval harness; build after v1).
- **v3 — "It's smarter":** experiments — plain vs "think step by step" vs "generate 5
  candidates, pick the best" vs a legal-moves tool/hint. **Parked.**

The roadmap's intended write-up title: *"I made an LLM play Tic Tac Toe. Here's what it
taught me about how LLMs think."* (one blog; a sibling neural-net chapter is planned
separately). Decided teaching frames: **structured output**, **"LLMs are not planners"**,
**tokenization is why LLMs struggle with grids**, **evals = numbers, not vibes**.

## Reference implementation to port (already built in my-portfolio)

The portfolio already has a working LLM tic-tac-toe integration. **Read these files** —
the console app should port/adapt this logic, decoupled from Express/React into plain
Node. Paths are under the my-portfolio repo:

| File | What it gives you |
|---|---|
| `frontend/src/modules/tictactoe/game.js` | Pure rules engine: `newGame`, `play(game, cell)`, `legalMoves`, `wouldWin`, `otherMark`, `isDraw`, winner detection via a `LINES` table. No UI/network in it — port almost verbatim. |
| `backend/src/tictactoe/prompt.js` | `SYSTEM` prompt, the **Zod `moveSchema` = `{ cell: int 0–8, reason: string }`**, board-rendered-as-grid, optional "Legal cells: …" hint, `promptFor({board, turn, legalMoves})`. |
| `backend/src/ai/index.js` | The AI call: Vercel AI SDK `generateText` + **`Output.object({ schema })`** for structured output, Gemini via `@ai-sdk/google`, a **fallback model chain** (`gemini-flash-latest`, `gemini-3.1-flash-lite`, `gemini-2.5-flash-lite`), `THINKING_LEVELS` = `['low','medium','high']`, `AiQuota`/`AiUnavailable` errors, 429 handling, `RETRIES_PER_MODEL`. Returns `{ output, usage, model }` with token counts. |
| `frontend/src/modules/tictactoe/opponents.js` | The `llm` opponent: the `hintLegalMoves` arm, and **illegal-move detection**: `illegal: !openCells.includes(answer.cell)`. |
| `backend/src/tictactoe/router.js` | HTTP contract + validation + per-move token logging — the integration-time reference for step 2. |

This session worked in a portfolio **worktree** at
`/Users/mahendrachouhan/projects/my-portfolio/.claude/worktrees/ai-explore-ttt`
(branch `ai-explore-ttt`, created off `main`). **No changes were committed to it** — it
was only used to explore. It's reserved for the step-2 integration; remove it if you'd
rather start that fresh (`git worktree remove`).

## Suggested console structure (mirror Chapter 001's conventions)

Node ESM `.mjs`, each experiment folder self-contained with its own `package.json` and
deps. Deps needed: `ai`, `@ai-sdk/google`, `zod`. A sketch:

```
experiments/002-teaching-an-llm-tic-tac-toe/
  README.md          # how to run it
  package.json       # own deps
  game.mjs           # pure rules engine (port of game.js)
  minimax.mjs        # perfect baseline opponent — reusable in v2, cheap to build now
  llm.mjs            # prompt + Zod schema + AI SDK call (port of prompt.js + ai/index.js)
  play.mjs           # the console game loop: print board, read input / call LLM, repeat
  blog.md            # the write-up — PARKED, create later
```

Env: Gemini key via `GOOGLE_GENERATIVE_AI_API_KEY` (keep it in a **gitignored `.env`**,
never commit it). The user has a key; a Gemini key also sits in the Notion "Tokens /
Passwords" page if needed.

## Open decisions to make while building

1. **Illegal moves — surface, don't hide.** The LLM confidently plays taken cells; that
   is the most interesting thing to show in the eventual write-up. Recommendation:
   **log/surface well-formed-but-illegal moves** (don't silently retry them), but **do**
   retry *transient* junk (malformed JSON, 503). The portfolio UI already makes this
   split; keep it in the console app.
2. **Who plays whom in v1:** at minimum human-vs-LLM in the console. Consider building
   **minimax now** as the baseline opponent (it's an hour of work, it's the "LLMs aren't
   planners" foil, and v2's harness needs it anyway).
3. Keep the code honest to the teaching beats above so the write-up has real material.

## Explicitly parked / out of scope now

- Writing the blog post (capture learnings only).
- Any UI.
- The v2 eval harness and v3 experiments.
- Integrating back into the portfolio web app.

## Pointers / skills for the next session

- **`run`** skill — to launch and test the console app.
- **`publish-blog`** skill — later, to port `blog.md` onto mchouhan.co.in/blogs.
- **`code-review`** — before integration.
- Style for the eventual write-up: memory `feedback_blog_writing_voice`, and the two
  published posts in my-portfolio: `frontend/blog/src/pages/lld-is-not-dead/index.mdx`
  and `.../lets-build-gpt-from-scratch-01/index.mdx` (story-first, code interleaved with
  its real output, "🐇 Rabbit hole" asides, close with "What's next" + code link).
- Notion: "AI engineer roadmap" (the plan), "Content Pillars" under TechWithMahendra
  (this pairs with a planned YouTube video).
- Chapter 001 (`experiments/001-lld-is-not-dead/`) is the structural template: README +
  `blog.md` + code; update the root `README.md` table with a row for 002 when ready.
