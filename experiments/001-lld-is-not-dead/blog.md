# No, LLD Is Not Dead: What Bad Code Costs an AI Agent

*Hello everyone! Lately my feed has been full of one idea: "AI writes the code now, so low-level design doesn't matter anymore. Nobody will read it anyway." I've spent years caring about clean modules and good abstractions, so naturally this hurt a little :P. But instead of arguing, I wanted to measure it. This post is about that experiment.*

---

## The claim

The argument goes something like this:

> Design principles exist to help **humans** read and change code. If an AI agent is the one reading and changing it, who cares whether the code is clean? The agent can read 2,000 lines in a second.

It sounds reasonable. But think about it for a sec: what does an agent actually *do* when you ask it for a change?

It doesn't read the whole codebase in one go. It searches, opens a file, reads a bit, opens another file, makes an edit, runs the tests, reads the error, edits again... And **every one of those steps costs tokens**, which is literally money.

So the real question isn't "can an AI read bad code?". Of course it can. The better question would be:

**Does bad design make an AI agent spend more, or make more mistakes, when it changes existing code?**

**Does bad design make an agent thrash?**

---

## What does the research say?

I wasn't the first to ask. One interesting study came out recently.

### SonarSource: "cleaner code, fewer tokens"

A team at SonarSource ([arXiv 2605.20049](https://arxiv.org/abs/2605.20049)) took **6 pairs of repositories**, each pair being a messy and a cleaned-up version of the same project, between 26k and 137k lines. Then they gave **Claude Code (Sonnet 4.6)** the same **33 tasks**, **10 runs each**, on both versions of every pair.

What they found:

| | Clean vs messy code |
| --- | --- |
| Tasks passed | **about the same** |
| Input tokens, all tasks | **7% fewer** |
| Input tokens, tasks spanning several modules | **10.7% fewer** |
| Times the agent went back to a file it had already read, all tasks | **33.8% fewer** |
| ...on multi-module tasks | **50.8% fewer** |

So on clean code the agent didn't succeed more often, but it **wandered around a lot less**. It didn't need to go back to the same files again and again to piece things together.

Two caveats: they also tried Haiku but dropped it because it failed too many tasks, and their data isn't public, so we can't check it.

I tried to replicate this experiment on my local machine, rest of the writeup covers that aspect.

---

## Attempt 1: a parking lot (and why it failed)

My first idea was the classic LLD interview question: a **parking lot**. Park, leave and get a quote for bikes, cars and trucks across small, medium and large spots.

I wrote it twice, with the same behaviour and about the same length (~90 lines):

- **Bad Version:** one file, if/else per vehicle type, fee logic copy-pasted into `leave` and `quote`.
- **Mature / Good Version:** vehicles and spots as data tables, three small classes (`ParkingLot`, `Pricing`, `Cli`).

Then I gave Claude Code (Haiku 4.5) two change requests on each: add **electric vehicles** with charging spots, then add **monthly passes** with a fee cap. The agent never saw the tests. They were hidden outside its sandbox, and graded the result afterwards.

The first round looked great for design. Good Version used **~30% fewer tokens** on the first change. Champagne! 🍾

Then it all fell apart:

- On the second change, mature **failed all 3 runs**. My "mature" code had one sneaky implicit rule (a validation check hidden inside a condition), and the agent kept missing it. Ironically, that's exactly the kind of thing good design is supposed to avoid. I fixed it.
- After the fix, the 30% gap **mostly disappeared**. On some changes junior was even cheaper.

So what was going on?

**The app was too small.** Claude Code sends about **13.5k tokens of scaffolding** with *every* request: its system prompt (~6.3k) plus the descriptions of its tools (~6.6k). Next to that, a 90-line file is a rounding error. The agent read the whole file in one go either way, so the design never really got in its way.

> **🐇 Rabbit hole: why do agents burn millions of tokens?**
>
> An agent works in turns: the model asks for a tool (read this file, run that command), gets the result, and decides the next step. The catch: **every turn resends the entire conversation so far**. The system prompt, every file it has read, every test output.
>
> So the cost is roughly **number of turns × size of the context**. Turn 1 sends 15k tokens, turn 2 sends 18k, turn 40 might send 60k. That's how a small change ends up costing 2 million tokens. (Most of them are cache reads, which are cheaper, but they still add up.)
>
> This is also why design can matter so much: **every extra file the agent has to open is paid for again on every turn after it.**

<!-- interactive: readers watch a real run turn by turn: the agent hauls the whole conversation to the model each turn, and one file it read early gets paid for again on every turn after -->

I even tried stripping Claude Code down to a one-line prompt and three tiny tools, to make the code a bigger share of the context. Still no consistent difference. A 90-line toy just can't show it.

**Lesson learned:** the project needs to be big enough that the agent *can't* read everything in one go. It has to navigate.

---

## Attempt 2: a real open-source project

So I went looking for a real project. My requirements:

- **Real and well designed**, so "good" isn't just my opinion.
- **Small enough** that I can rewrite a "bad" twin of all of it, but too big to read in one go.
- **Lots of tests**, so I can prove the twin behaves exactly the same.

### What does "good design" even mean?

To build a credible "bad" version, I needed a definition of "good" that isn't just my taste. I went with John Ousterhout's *[A Philosophy of Software Design](https://web.stanford.edu/~ouster/cgi-bin/book.php)*. (His [talk at Google](https://www.youtube.com/watch?v=bmSAYlu0NcY) is a great one-hour summary.)

Ousterhout says complexity shows up in three ways:

1. **Change amplification:** a simple change needs edits in many places.
2. **Cognitive load:** you need to know a lot to make a change safely.
3. **Unknown unknowns:** it's not obvious *what* you need to change. This is the worst one.

And the cures are **deep modules** (a simple interface hiding a lot of logic) and **information hiding** (each piece of knowledge lives in one place).

### The final pick: node-semver

[node-semver](https://github.com/npm/node-semver) is the library npm itself uses to understand versions like `^1.2.3` or `>=2.0.0 <3.0.0`. It's about **1,850 lines** in 48 files, with **22,923 test assertions**. And it's a nice example of information hiding:

- The whole version grammar (what a valid version looks like) is defined **once**, in one module of regular expressions.
- The rule for "which prerelease versions match a range" lives in **one** function. etc etc.

### Making the evil twin 😈

Then I wrote the twin the way a rushed team might: everything still works, but knowledge is copy-pasted instead of shared.

| What I did in the bad version | Ousterhout red flag |
| --- | --- |
| Copied the version grammar into 4 different files. The original module stays, but nothing uses it anymore | Information leakage, unknown unknowns |
| Pasted the version-ordering logic into 9 functions (`compare`, `gt`, `lt`, `eq`...) | Change amplification |
| Pasted the prerelease-matching rule into 4 places | Change amplification |
| Merged the range parsing (caret, tilde, x-ranges, hyphens) into one long function | Cognitive load |
| Replaced named constants with magic numbers | Information leakage |

Two rules I didn't break: the **public API stays identical**, and the **behaviour stays identical**. All 22,923 upstream assertions pass on both. On top of that, I wrote a hidden "twin test" that runs every public function on thousands of random versions and ranges and checks both versions give exactly the same answer, or the same error.

### Is bad actually bad? This time, yes

| Metric | good | bad |
| --- | --- | --- |
| Code lines | 1,850 | 2,456 |
| Cyclomatic complexity, mean per function | 4.5 | 10.1 |
| Cognitive complexity, total | 577 | 1,470 |
| Functions over Sonar's complexity limit | 12 | 29 |
| Sonar code smells | 14 | 129 |
| Duplicated lines | 0.9% | 20.0% |

One caveat though: the bad version is **33% bigger**, because copy-pasted code is, well, more code. Some of the cost difference could come from size alone.

---

## The tasks

The code isn't really the point here. The **tasks** are. Each is a feature request a semver maintainer could realistically get. The agent gets just the request, in plain language, with no hints about which files to touch:

1. **Uppercase V:** accept `V1.2.3`, not just `v1.2.3`.
2. **Prerelease tags:** add a new option `prereleaseTags: ['rc']`, so `1.3.0-rc.1` counts as matching `^1.2.0`.
3. **Natural ordering:** add a new option so `rc9` sorts before `rc10` (today `rc10` comes first, because it's compared as text).
4. **Compatible release:** support Python's `~=` operator in ranges. This one is a **control**: it's about the same amount of work in both versions.

Before running any agent, I solved every task myself (i.e. Opus 5.5) on **both** versions, to prove they're solvable and to count how many places each one touches:

| Task | Edit sites in good | Edit sites in bad |
| --- | --- | --- |
| 1. Uppercase V | 2 files, 5 places | 4 files, 5 places (and editing the obvious grammar file does *nothing*) |
| 2. Prerelease tags | **1 file, 1 place** | **4 files, 4 places** |
| 3. Natural ordering | 2 files, 3 places | 11 files, 21 places |
| 4. `~=` (control) | 2 files, 3 places | 1 file, 2 places |

Take a guess: which one do you think the agent will struggle with on the bad version?

---

## The setup

I wanted to measure a **real agent**, not a lab toy, so:

- **Claude Code**, out of the box: its own system prompt and its usual tools (read, edit, write, search, shell). The model is **Haiku 4.5**, because it's cheap, and I'm paying for this myself :P
- Each run starts from a **fresh copy** of the project in a temp folder, with its own git repo.
- The agent runs in a **macOS sandbox**: it can't read anything outside its folder, so it never sees the hidden tests, and it can't write anywhere else.
- After it's done, I grade it with:
  - **hidden tests** for the feature (Given/When/Then style), and
  - the project's **original test suite**, restored from the untouched copy. The agent can edit or even delete tests in its folder, but it can't hide a regression that way.
- I record everything: wall time, number of tool calls, tokens (including cache reads), cost, the diff, and the full transcript of every step.

All of it is open source: [https://github.com/m-chouhan/experiments-with-ai](https://github.com/m-chouhan/experiments-with-ai).

---

## So... did design matter?

I ran task 2 (prerelease tags) and task 4 (the control) on both versions: a pilot run plus 2 runs for task 2, and 2 runs for task 4. In total that's 10 agent runs, about **$5**.

### Task 2: prerelease tags

| Run | good | bad |
| --- | --- | --- |
| pilot | ✅ 35 tool calls · 1.30M tokens · $0.30 | ✅ 64 tool calls · 2.84M tokens · $0.51 |
| 1 | ✅ 55 tool calls · 2.27M tokens · $0.42 | ✅ 63 tool calls · 2.97M tokens · $0.51 |
| 2 | ✅ 53 tool calls · 2.37M tokens · $0.44 | ❌ 47 tool calls · 1.87M tokens · $0.35 |
| **median** | **3/3 passed · 2.27M tokens · $0.42** | **2/3 passed · 2.84M tokens (+25%) · $0.51** |

Two things stand out.

**1. Bad cost more, about 25% in the median.** That's in the same direction as SonarSource's 7–11%, a bit bigger, and on a much smaller project. In good, the agent edited one function in `range.js`. In bad, it had to find and edit all four copies of the rule: `range.js`, `satisfies.js`, `maxSatisfying.js` and `minSatisfying.js`. And it was clearly less sure of itself: in the pilot run it wrote **five scratch test scripts** to convince itself it had covered every case.

**2. Bad broke something.** This is the part I find most interesting. In run 2, the agent did find all four copies. But it rewrote each one by hand, and in doing so it **replaced** an existing rule instead of adding to it. The old rule ("a prerelease on the same version as the range's own prerelease is allowed") silently stopped working whenever the new option was set:

```js
satisfies('1.2.3-beta.2', '^1.2.3-beta.1', { prereleaseTags: ['rc'] })
// expected true, got false
```

The agent ran the tests, everything it wrote passed, and it reported success. In good, the rule lives in one small function, and in all 3 runs the agent added its check next to the existing rule without touching it.

That's change amplification in action: **every copy is one more chance to get it wrong.**

### What did the agent spend its steps on?

Tokens tell you *how much* the agent spent. But I saved the full transcript of every run, so we can also look at *what* it spent it on: every search, every file it read, every edit, every test run. I didn't know this was possible until I tried it, and it turned out to be the most useful view of all.

| Task 2                | good (pilot, 1, 2)  | bad (pilot, 1, 2)    |
| --------------------- | ------------------- | -------------------- |
| Searches              | 2, 5, 7             | 6, 6, 5              |
| Files read (re-reads) | 7 (0), 9 (4), 9 (0) | 8 (5), 10 (0), 7 (1) |
| **Edits**             | **3, 6, 5**         | **15, 13, 7**        |
| Scratch test scripts  | 0, 0, 0             | 5, 2, 0              |
| Test runs             | 4, 4, 5             | 5, 6, 7              |

**Edits are the clearest signal.** Searching and reading look about the same on both versions: the agent finds its way around either codebase just fine. But on bad it needed **about 2.5× more edits** (a median of 13 vs 5), which is exactly the four copies showing up in its work. (On the control task, edits were the same on both: 9–13 vs 9–11.)

<!-- interactive: readers replay a good and a bad run side by side, step by step, and watch which files the agent reads and edits, and which of its edits broke the old rule -->

> **🐇 Rabbit hole: what about re-reads?**
>
> SonarSource's most striking number was that clean code cut the agent going back to files it had already read by 34–51%. I don't see that here: re-reads are 0–5 on both versions, with no pattern.
>
> My guess: their projects were 15–70× bigger than mine. At 1,850 lines, the agent mostly reads each file once and keeps it in its context. Re-reads should start to show up once a project is too big to hold in context at once.

### Task 4: the control

| Run | good | bad |
| --- | --- | --- |
| 1 | ✅ 83 tool calls · 6.41M tokens · $0.97 | ✅ 59 tool calls · 3.25M tokens · $0.62 |
| 2 | ✅ 48 tool calls · 2.51M tokens · $0.48 | ✅ 42 tool calls · 2.51M tokens · $0.51 |

On the task where design *shouldn't* matter, it didn't: run 2 is a near tie. But look at good's run 1: **6.4M tokens** for the same task that took 2.5M in the next run. The transcript shows why: it got stuck in a loop of edit, run the tests, read the failure, edit again, and ran the tests **25 times** (the other runs needed 1 or 2). Bad luck, not bad design.

This is the most important thing I learned about measuring agents: **they're noisy**. The same agent, on the same code, with the same task, can cost 2.5× more just by luck. A single run proves nothing, and even 2–3 runs per cell only show a direction, not a precise number.

---

## So, is LLD dead?

No. But the story is more interesting than "clean code = cheaper AI".

- **The token savings are real but modest.** Around 25% in my runs, 7–11% in SonarSource's much bigger study. Noticeable on your bill, but not dramatic, and easily hidden by run-to-run noise.
- **Look at edits, not just tokens.** Tokens are noisy, but the number of edits followed the design closely: about 2.5× more on the duplicated code (median 13 vs 5), the same on the control task.
- **The bigger cost is correctness.** Agents are great at *finding* duplicated code: Haiku found every copy, every time. The risk is in *changing* it: N copies means N chances to make a subtle mistake, and the tests you have might not catch it. My one failure came from exactly that.
- **Size matters for the experiment.** On a 90-line toy, design made no difference at all, because the agent reads everything in one go. Design starts to matter once the agent has to **navigate**.
- **"Good design" has to be measurable.** My first bad twin wasn't bad by any metric, and readers would rightly call that out. If you run your own experiment, check your "bad" code with real tools first.

Ousterhout's principles were written for humans who have to keep a mental model of the code. It turns out an AI agent has the same problem, just with a token bill attached. **Knowledge that is structured well is safer to change, for humans and for machines. period.**

---

## All the numbers

<!-- interactive: readers open a panel with every trial's numbers right here, instead of going to GitHub -->
Every trial I ran, with its tokens, cost, edits and test runs, is in the [repo README](https://github.com/m-chouhan/experiments-with-ai/tree/main/experiments/001-lld-is-not-dead#consolidated-results).

---

## What's next

This was a small experiment, and I want to make it less small:

- **More runs per task** (5+), to get past the noise.
- **A stronger model** (Sonnet) and **local models** (I tried Ollama with Qwen 14B on my laptop, but it managed about 1 token per second, hehe).

If you have ideas for better tasks, a better "bad" twin, or another project to try, tell me in the comments. I'd love to make this more rigorous :)

---

*Code, prompts, hidden tests and every transcript:* [github.com/m-chouhan/experiments-with-ai](https://github.com/m-chouhan/experiments-with-ai)
