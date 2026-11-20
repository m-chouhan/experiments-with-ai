# Experiments with AI

Small, reproducible experiments on how AI agents actually behave, each with its code, raw
results and a write-up. The name nods to Gandhi's *The Story of My Experiments with Truth*:
try things, measure them, report what happened, including when it didn't work.

The code is not dead.

| # | Experiment | Question | Write-up |
|---|---|---|---|
| 001 | [lld-is-not-dead](experiments/001-lld-is-not-dead/) | Does code design change what an AI agent spends to make a change? | [blog](experiments/001-lld-is-not-dead/blog.md) |
| 002 | [teaching-an-llm-tic-tac-toe](experiments/002-teaching-an-llm-tic-tac-toe/) | Can an LLM actually play tic-tac-toe — and how do you measure it? | [blog](experiments/002-teaching-an-llm-tic-tac-toe/blog.md) |
| 003 | [how-does-a-model-learn](experiments/003-how-does-a-model-learn/) | What does "learning" mean for software? One neuron learns odd and even by fixing its mistakes. | [blog](experiments/003-how-does-a-model-learn/blog.md) |
| 004 | [gradient-descent](experiments/004-gradient-descent/) | The same neuron, with a sigmoid, nudged on every example by how wrong it was. | [build guide](experiments/004-gradient-descent/README.md) |
| – | [parked-gpt2-base-model](experiments/parked-gpt2-base-model/) *(parked)* | What does a raw base model actually do with a prompt? | [README](experiments/parked-gpt2-base-model/README.md) |

Each experiment folder stands on its own: its README says how to run it, and it has its own
dependencies and results. Nothing is shared between experiments until two of them need it.
