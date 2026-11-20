# 003 · How does a model learn?

The code for *Let's Build GPT From Scratch, Part 02*: [blog.md](blog.md).

What does "learning" mean for a piece of software? One neuron learns to tell odd from even
numbers, with nothing but a weighted sum and one rule: when it's wrong, nudge the weights.

## Play with it

You need Python 3, and nothing else.

```bash
python3 playground.py
```

The knobs are at the top of the file:

- Set `INPUTS = 'number'` and watch it get stuck at 50%. Then try `'last digit'`, then `'all digits'`.
- Swap the `rule` for "divisible by 3" and watch one neuron fail.
- Change `EXAMPLES` and `SEED` and see how few examples it really needs.

Two interactive explainers, to open in a browser:

- [`explainer-1-how-a-neuron-learns.html`](explainer-1-how-a-neuron-learns.html): the neuron as a
  weighted vote, the one straight cut, and the "fix your mistakes" loop.
- [`explainer-3-more-inputs-one-cut.html`](explainer-3-more-inputs-one-cut.html): what one cut
  looks like with three inputs, or *n*.

## Files

```
blog.md          the post
playground.py    the whole post in one file: the neuron, the inputs, the learning rule
explainer-*.html the interactive explainers above
images/          the post's figures
figures/         how the GIFs are made (with my-portfolio/tools/sketch-gifs)
raw-notes/       the handwritten notes the post started from
```

**Next:** [004](../004-gradient-descent/) trains the same neuron with a sigmoid and gradient
descent, nudging on every example by how wrong it was.
