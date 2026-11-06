# I Made an LLM Play Tic-Tac-Toe. Here is what I learned!

*Hello again! After the last experiment I wanted something smaller and more hands-on: wire a real LLM into a tiny app, end to end, and actually watch it play. Tic-tac-toe felt perfect — everyone knows the rules, the whole game fits on a napkin, and a child can play it perfectly. So surely a model trained on half the internet can too, right? Well. This post is about what happened when I checked, and what it taught me about how these models actually "think".*

---

## What I built

A dead-simple console game: you are **X**, Gemini is **O**, you both type moves into the terminal. No UI, no web app, no framework. 

The whole thing is three files, each with one job:

- `game.ts` — the rules engine. The board, whose turn it is, who won. Pure functions, no network, no randomness.
- `llm.ts` — the LLM boundary. Everything model-specific lives here: the prompt, the API call, the schema, the retry logic.
- `play.ts` — the loop. Print the board, read a move (from you or from the model), repeat until someone wins.

That's it. If you want to integrate an LLM into something you're building and you've never done it, this is about the smallest honest example I could come up with. Let me walk through the parts that actually taught me something.

---

## What is an LLM?

Look at the previous blog for more details, but an LLM is essentially a sophisticated token predictor — you give it a "prompt," and it predicts what comes next. You give it a "query", it predicts what's the most natural response to that.

The simplest way to picture it is a function: text in, text out.

```ts
string query  = "what is the time right now?"
string answer = llm(query)   // -> "time is 10:10" or something...
```

Notice the return type: `string`. That one detail is the whole of Lesson 1.

## Lesson 1: getting *typed data* out of an LLM

Now look at what our game actually needs. The "query" is the board. The "answer" we want is a move — a number from 0 to 8. So really we want to write this:

```ts
Move move = llm(board)   // <- not a string. a move.
```

But `llm()` only knows how to return a `string`. So the question is: **how do we turn** `string -> string` **into** `string -> Move`**?**

**What could be a naive approach?**

It could be simply parsing the string to extract valuable information from its response.

```ts
const cell = parseInt(answer.match(/\d/)?.[0] ?? "")   // bla bla bla
```

But this is brittle — the model wraps the number in a sentence, says "top-left" instead of `0`, and the parser falls over.

But the better way is restricting the output of the llm, conforming it into a structure. The more technical term for this is **Constrained Decoding**, and there's substantial evidence ([paper](https://arxiv.org/pdf/2610.35328)) that it can improve model performance.

**How to get structured output?**

You tell the SDK the exact shape you want, and it makes the model conform to it. You need 3 pieces for this:

**1. A data structure (aka schema) that the output should conform to.** We leverage [zod](https://zod.dev/) for this — a schema you write once, in code. It gives you a TypeScript type *and* runtime validation from the same definition.

```ts
const moveSchema = z.object({
    cell: z.number().int().min(0).max(8),
    reason: z.string(),
});
```

**2. A way to provide the prompt and schema to the model.** We leverage the [Vercel AI SDK](https://ai-sdk.dev/) (`generateText`) for this. 

Why vercel? 

See the Models are becoming more and more commoditized in the current day and age, and Vercel lets us abstract out the model provider from our application logic. You give it the model, a *system* prompt (the standing instructions that frame every call — *"you are O in a game of tic-tac-toe…"*), and the user prompt.

**3. The piece that binds the two together.** `Output.object({ schema })` hands the zod schema to the model as the required output format, then parses and validates the reply behind the scenes.

```ts
const { output } = await generateText({
    model: google('gemini-3.5-flash-lite'),
    system: SYSTEM,
    prompt: promptFor(game),
    output: Output.object({ schema: moveSchema }),
});
```

And that's it — our function is no longer `string -> string`. `output` comes back typed as `{ cell: number; reason: string }`, exactly the `Move` we wanted. No regexes, no "parse the third word".

(I also ask for a one-sentence `reason` — more on why that turned out to be interesting later.)

---

## Lesson 2: well-formed ≠ legal

Here's the thing that surprised me most, and it's the most *LLM-specific* lesson of the whole project.

The model returns a perfectly-parsed, schema-valid move — a clean number between 0 and 8, with a confident reason attached — **that is still an illegal play**, because it names a cell that's already taken.

Think about what that means. Structured output guaranteed the *shape* of the answer. It said nothing about whether the answer was *correct against the rules of the game*. The schema checks the envelope; it never reads the letter inside.

So I had a choice: silently retry until the model picks an open cell, or surface it. I chose to surface it — compute legality on my side and make it visible:

```ts
return { cell: output.cell, reason: output.reason, illegal: !isLegal(game, output.cell) };
```

In the game, an illegal move just ends things as a forfeit, printed plainly. Because that illegal-move rate is the real signal — it's the model telling you how well it actually "sees" the board.

**Takeaway:** validate an LLM's output against your domain rules even when it parsed cleanly.  
A valid shape does not imply a  valid move.

---

## Lesson 3: the API call is unreliable by default

My first version was one `await` to one model. It broke the first time I played — the model was briefly overloaded ("high demand"), the call errored, and the whole turn died.

So this means we need to build a resilience layer that lives *around* the call, not in it — how? :thinking:

- **A fallback chain.** Try models in order; on failure, fall through to the next instead of failing the turn.
- `maxRetries: 1`**.** The SDK retries twice by default and *bills every attempt*, which also makes an overloaded model slow to give up. One retry, then move on.
- **A hard timeout** (`AbortSignal.timeout(15_000)`). Under load a model doesn't always error — sometimes it just *hangs*. A deadline turns a stall into a fast failover.

**Takeaway:** treat the call as flaky from day one. Budget for retries (and their cost), deadlines, and a fallback. 

---

## Lesson 4: is it actually any good?

The game works. :yay: The model seems to play okayish. Here's a real turn:

```
O (Gemini) plays 6 — "Block the opponent from winning."

 X | 1 | 2
---+---+---
 X | O | 5
---+---+---
 O | 7 | 8

Your move (1, 2, 5, 7, 8): 2
```

But "it seems to play okay" is a *vibe*, and I wanted a *number*.

How do I test this? How do I make sure it won't break in production?

The trouble is the model is **stochastic** — ask it the same thing twice and you can get two different answers. So a normal test doesn't work. A test is an assertion: `expect(add(2, 2)).toBe(4)` — same input, same output, pass or fail. There's nothing like that to assert against here.

> **💭 Reverie: the chemistry-class flashback**
>
> ![Reverie](assets/reverie.png)
>
> This actually reminded me of my chemistry classes, where I never got the desired result on the first attempt. I'd try hard to measure the chemicals in the dish properly, I'd struggle to heat the solution for just the right amount of time — and even then, when I finally measured it, the reading always seemed off for some reason :/. Anyway, that's why we were always told to repeat the experiment and take the average. That's when it clicked. :ooohhh:

The best you can do is run the model many times and *measure how often it's right*. That's not a test. It's an **experiment**. 

Here's the setup I landed on:

- **Fixed positions, not whole games.** Running an entire game through the LLM is expensive, and a bit complicated for a first attempt — it's better to pick fixed positions and simply ask the LLM to predict the next move.
- **A minimax oracle as the grader.** Tic-tac-toe is tiny, so we can actually compute perfect play with a deterministic algorithm (enter minimax — [here's a good video intro](https://www.youtube.com/watch?v=Xly7lpTQELI&t=51s)).  
Now we can grade a move as **illegal**, **optimal** (the best the position allows), or **suboptimal** (legal, but a better move exists).
- **A random-legal baseline.** A raw score means nothing on its own — is 3/4 good? Compared to *what*? So I added the dumbest possible opponent: one that picks a random legal move. That's the floor the model has to clear to prove it's doing more than guessing randomly.

```
const randomOptimalRate = (game: Game): number =>
    bestMoves(game).length / legalMoves(game).length;
```

---

## Lesson 5: what the numbers said

I used twelve board positions, categorized by different game situations, with three trials each, averaged:

```
                   model   random
overall             50%     28%
win-available       67%     34%     <- a win is on the board right now
no-immediate-win    33%     22%     <- you have to look one move ahead
```

Two findings, and you only get them because of the baseline and the split:

**50% isn't "decent" — it's barely trying.** Random already scores 28%. The model is clearing the floor, but not by much.

**The aggregate hides the real story.** Split the positions by type and the pattern jumps out. When there's a winning move *sitting right there*, the model grabs it two-thirds of the time. The moment it has to **look one move ahead** — block a threat, set up a fork — it falls to 33%, just a whisker above the random bot. 

Insight: the model **reacts** well. It doesn't **plan**. (this was tested on gemini-3.5-flash-lite, fyi)

*(One Caveat to call out: n=12 is small, so the overall 50-vs-28 isn't statistically tight.)*

> **🐇 Rabbit hole: I got lucky — most evals don't have a referee**
>
> Tic-tac-toe handed me something almost no real AI problem has: a *perfect, free* grader. That let me skip the two things that make real evals hard.
>
> **Defining "good" in advance is often impossible.** My grader was objective. But how do you grade "is this summary *helpful*?" Shreya Shankar and colleagues at Berkeley named the catch-22: *criteria drift* — you need criteria to grade outputs, but you only discover your real criteria *by looking at outputs*. The outputs teach you the rubric; you can't finish writing it first. It's the "who validates the validator?" problem. [https://arxiv.org/abs/2404.12272](https://arxiv.org/abs/2404.12272)
>
> **The grader is usually just another LLM — and it's every bit as flaky.** With no oracle, people reach for "LLM-as-judge". But a stochastic grader inherits every weakness of the thing it's judging, so now you have to evaluate your evaluator. As of 2026 the honest state of the art is: a human spot-checks a sample to calibrate the judge. Humans didn't leave the loop — they moved from grading answers to grading the grader.
>
> And treating evals as experiments isn't just my framing. Evan Miller at Anthropic argues eval scores should ship with *error bars* — standard errors and confidence intervals, like any other measurement. Which is the grown-up version of what we just built.

---

## Lesson 6: the failures are the point

The score tells you *how much*. The transcripts tell you *what went wrong* — and that's where it got weird.

**It hallucinates wins.** On a position where it needed to block, it played a losing move and justified it with *"complete the winning diagonal for X."* There was no winning diagonal. It invented one and ignored the real threat next to it.

**The reasons lie even when the move is right.** On a position it could win outright, it played the correct cell and called it *"block and win next turn."* It had already won. The `reason` field isn't an explanation of what it did — it's a plausible caption generated alongside the move.

> **🐇 Rabbit hole: is this a *grid* problem? (a hypothesis)**
>
> A hunch I haven't measured yet. When you and I look at a board, we see a 3×3 *grid* — rows, columns, diagonals, all at once, spatially. The model doesn't. It sees a sequence of tokens: `X . O X O O . X .`. The two-dimensional structure that makes "block the diagonal" *obvious* to us is something it has to reconstruct from a flat string — fighting the input format as much as the game.
>
> The follow-up experiment writes itself: give it the board in a different representation, or an explicit list of legal moves, and see if the planning numbers move. I don't know yet. That's the fun part.

---

## So, can an LLM play tic-tac-toe?

Sort of. Badly. And the *way* it's bad is the interesting part.

- **It reacts, it doesn't plan.** Grab a visible win: fine. Think one move ahead: barely above random. If your use case needs multi-step planning, *measure* it — don't assume.
- **Structured output gives you shape, never correctness.** The most important line in the project checks the model's valid-looking answer against the real rules.
- **Its confidence is uncorrelated with its correctness.** It explained a hallucinated win and a misdescribed real win with equal certainty.
- **A number needs a baseline and a slice.** "50%" meant nothing until I had a random bot to compare against and split the positions by type. Then it told a real story.

None of this means LLMs are dumb. It means they're a *different* kind of thing than the symbolic, look-ahead planner tic-tac-toe actually wants — a pattern-matcher doing a reasonable impression of a planner, until you hand it a position where impressions aren't enough.

---

## What's next

This was deliberately dead-simple — one model, one prompt. The obvious next knobs:

- **A wider matrix:** several models × a couple of prompt variants over the same suite. Turn "how does *this* model do" into "which model and prompt does best".
- **Test the grid hypothesis:** feed the board differently, or hand the model a list of legal moves, and see if the planning numbers move.
- **Observability:** log every call — latency, which model answered, token usage, illegal/suboptimal rate — so the eval doubles as a cost-and-behaviour dashboard.

If you have a better prompt, a sharper board representation, or a theory about *why* it can't plan, I'd love to hear it in the comments.

---

## Further reading

- **Evan Miller, *Adding Error Bars to Evals* (Anthropic, 2024)** — eval scores are measurements and deserve standard errors and confidence intervals. [arxiv.org/abs/2411.00640](https://arxiv.org/abs/2411.00640)
- **Hamel Husain, *Your AI Product Needs Evals* (2024)** — the practitioner's starting point, and the source of the line that broke my brain: unlike unit tests, you don't need a 100% pass rate — the pass rate is a product decision. [hamel.dev/blog/posts/evals](https://hamel.dev/blog/posts/evals/)
- **Shankar et al., *Who Validates the Validators?* (Berkeley, UIST 2024)** — where "criteria drift" comes from. [arxiv.org/abs/2404.12272](https://arxiv.org/abs/2404.12272)
- **Ribeiro et al., *Beyond Accuracy: Behavioral Testing of NLP Models with CheckList* (ACL 2020, Best Paper)** — the case for borrowing behavioral testing from software engineering and probing a model as a black box. [arxiv.org/abs/2005.04118](https://arxiv.org/abs/2005.04118)

---

*All the code, the eval, the minimax oracle and the raw learnings:* [github.com/m-chouhan/experiments-with-ai](https://github.com/m-chouhan/experiments-with-ai)
