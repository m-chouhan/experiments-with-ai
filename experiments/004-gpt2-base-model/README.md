# 004 — Running a base model locally

> **Status: parked.** The scripts below work, but I'm coming back to this after experiment 003
> (a neural net learning tic-tac-toe). It was renumbered from 003 to make room.

What is a language model, really? This runs GPT-2, a raw *base* model, on a laptop so you can
see it: no login, no API key, no chat.

A base model doesn't answer you. It only continues your text, one token at a time.

## Run

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python run.py          # three different continuations of one prompt
.venv/bin/python next_token.py   # the model's top guesses for the very next token
```

The first run downloads GPT-2 (about 500 MB). After that it runs offline.

- `run.py` continues "Hello, my name is" three ways. Same prompt, three different rambles,
  because the next token is sampled from a probability distribution.
- `next_token.py [prompt]` shows the tokens the prompt is split into and the ten most likely
  next tokens with their probabilities. That distribution is the whole model.
