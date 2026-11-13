# 003 · Learnings and learner questions

Questions I actually had while going through this, with the answers. These are the
confusions a real learner hits, so the final blog should answer each one *at the moment the
reader would ask it*.

---

## Q1. Is this really a *single* neuron? I thought it was 4 neurons, one per digit.

**Yes, it's one neuron.** All 40 switches feed into **one** sum, which goes through **one**
squash and gives **one** answer:

```
score = bias + (weight × switch) for all 40 switches      <- one sum
confidence = squash(score)                               <- one output
```

The 4 × 10 grid is only how we *lay out* the 40 weights so humans can read them (one row per
digit place). The neuron doesn't know about rows.

**But the "4 neurons" idea is a real, good idea.** It describes a different shape:

```
4 neurons, one per digit place  ->  each gives its own answer  ->  a 5th neuron combines them
```

That's a **hidden layer** (4 hidden neurons + 1 output neuron), and it's the right instinct
for "divisible by 3", where one sum isn't enough. One catch: if each hidden neuron only sees
*its own* digit, the output neuron is still just adding up one opinion per digit, which is what
our single neuron already does. The hidden neurons have to see **all** the switches, so each
one can learn a combination across digits.

> **For the blog:** draw the wiring. 40 dots, all arrows into one circle. Then draw the
> 4-neuron version next to it and say "hold that thought, it's chapter 8".

---

## Q2. Are the 40 switches a 4 × 10 probability matrix that, once trained, computes the answer?

**No. There are two different 4 × 10 grids, and it's easy to mix them up:**

| | the switches | the weights |
|---|---|---|
| what | the **input**: which digits this number has | the **memory**: what the neuron learned |
| changes | for every number | only during training; fixed after |
| values | 0 or 1, exactly 4 ones | any number: −4.6, +0.1, +4.6 … |
| example | 4817 lights up 4 cells | the 4th row ends up −4.6/+4.6 stripes |

The **weights** are what "computes the answer once trained". And they aren't probabilities: they
can be negative, they can be bigger than 1, and they don't add up to anything. A probability
only appears at the very end, after the squash.

### "Can we start with a 0 matrix? Is using the number to initialise it necessary?"

**We already start at 0.** Every weight is 0.0 before training (`neuron.py`). The number
never sets the weights. It only decides which 4 *switches* are on. Because the switches grid and
the weights grid have the same shape, it can look like the number "filled in" the weights.

Footnote for later: starting at 0 works for one neuron. With a hidden layer it doesn't, because
all the hidden neurons would start identical and get identical nudges forever, so they'd
never become different from each other. Hidden layers start with small *random* weights.

> **For the blog:** draw the two grids in visibly different styles (yellow 0/1 for switches,
> blue/red colour scale for weights) and say out loud "same shape, different thing".

---

## Q3. Why not just hand the neuron the number 4817 directly?

Step by step:

1. With one input, the neuron has one weight `w` and the bias `b`:
   `score = b + w × 4817`.
2. As the number goes up by 1, the score goes up by `w`. It always moves the **same
   direction**: steadily up, or steadily down.
3. So the best it can say is "everything above some cut-off is odd, everything below is
   even". It's a straight line.
4. But odd/even **zig-zags**: 4816 even, 4817 odd, 4818 even, 4819 odd… A straight line can't
   zig-zag. No setting of `w` and `b` fixes that.
5. So it's stuck at about 50%, a coin flip.

I ran it to check (single neuron, same training loop, different inputs):

| what the neuron is given | test accuracy |
|---|---|
| the number itself, 4817 | 50.1% |
| the number scaled to 0..1 | 52.8% |
| the 4 digits as 4 numbers (4, 8, 1, 7) | 52.8% |
| **our 40 switches** | **100%** |
| the number in binary (14 bits) | **100%** |

With switches, every digit value gets **its own weight**, so "last digit is 7" and "last digit
is 8" can have completely different opinions. The digits-as-numbers version fails for the
same reason as the raw number: 7 and 8 are next to each other on a line, but they're opposite
answers.

The binary row is the surprise: in binary, odd/even is just the last bit, so it's trivially
easy. **How you show the data to the model decides how hard the problem is.**

> **Link to GPT:** this is why GPT doesn't read words as numbers either. Each token is a
> switch ("token 4817 is on"), and its weights are a row in the **embedding table**. Picking
> the weights of the switch that's on *is* an embedding lookup.

---

## Q4. What does `score = bias + w[1st=4] + w[2nd=8] + w[3rd=1] + w[4th=7]` mean? Is it 4 + bias?

**No.** The confusion is the notation. `w[1st=4]` doesn't mean "4". It means "**the weight for
the switch '1st digit is 4'**". The 4 says *which* weight; it's a label, not a value.

That's why the code and the printout keep the two apart: the weights are a plain list of 41
numbers, and `switch_label(37)` is what turns switch 37 back into the words "digit 4 is 7"
when something gets printed.

For 4817, the four switches that are on are "1st digit is 4", "2nd digit is 8", "3rd digit
is 1" and "4th digit is 7". Their weights are added up (output from `python3 train.py`):

```
before training:  score = 0.00 + 0.00 + 0.00 + 0.00 + 0.00 = 0.00   -> confidence 0.50 (no idea)
after training:   score = -0.01 - 0.18 + 0.11 + 0.06 + 4.55 = +4.54 -> confidence 0.99 (odd)
                          bias  d1 is 4  d2 is 8  d3 is 1  d4 is 7
```

Almost the whole score comes from the weight for "digit 4 is 7". The other three are near 0
because the first three digits don't matter.

> **For the blog:** never use `w[0][4]`-style notation before showing real values. Show the
> sum with actual numbers, before and after training.

---

## Q5. Why is the sigmoid needed? Justify it before explaining it.

The problem, shown first:

1. The oracle's answer is 0 or 1. The score can be anything: −20, 3, 4000.
2. We grade with `miss = confidence − answer`. Try using the raw score as the confidence.
3. Take an odd number (answer 1) where the score is **+3**. That's a confident, *correct*
   guess. But `miss = 3 − 1 = +2`, so the nudge pushes the score **down**. **The neuron gets
   punished for being right.**
4. With a big learning rate it gets worse: I ran the switches version without the squash at
   learning rate 1, and the weights **blew up** to infinity. With the squash, learning rates of 1 and
   even 100 both reach 100%.

The fix: squeeze the score into 0..1 *before* comparing it with the answer. A score of +3
becomes 0.95, so the miss is −0.05, and the nudge is a small push in the *right* direction.
Being very sure and right costs almost nothing. That squeeze is the **sigmoid**.

Honest footnote: the very first neuron that learned, Rosenblatt's perceptron (1958), used a
hard on/off step instead: fire if the score is above 0. I tried that too, and it also gets
100% on even/odd. The smooth sigmoid matters for two reasons. It tells you *how* wrong you
were ("almost" vs "way off"). And later, when neurons are stacked in layers, the nudge has to
pass back through each neuron, which needs a smooth curve, not a cliff.

---

## How to teach this (notes for the final blog)

- **Problem first, then the name.** Every definition (switches, score, sigmoid, miss, learning
  rate, hidden layer) is introduced only after the reader has hit the problem it solves.
  Curiosity first, terminology second.
- **Start from biology.** A brain cell adds up signals from its neighbours, some
  strong and some weak, and fires if the total is big enough. That connection strength *is*
  the weight. McCulloch and Pitts turned that into
  maths in 1943. Rosenblatt made the strengths *learnable* in 1958. Then: "that's exactly our
  40 switches and 41 weights".
- **Let them play before telling.** Interactive scenes where the reader tries something and
  forms a guess before the next idea: try to fit odd/even with raw numbers (and fail), drag the
  score with and without the squash, step through nudges, watch training.
- **Same shape ≠ same thing.** Switches and weights are both 4 × 10. Style them differently,
  and say so.
- **Readable isn't the same as named after the page.** I first made every switch and weight a
  dict keyed by its English name (`weight["4th digit is 7"]`), on the theory that code matching
  the page's words reads more easily. It doesn't: it buried the one line that matters
  (`weights[i] -= rate * miss * switch`) under name plumbing, and it taught a data structure no
  real model uses. The switches are now a list of 40 zeros and ones, which is what every
  library and every textbook will hand the reader next. The names live in one printing
  function, where they belong.
- **Spell the pipeline out where it happens.** Guess, see how wrong, move the weights: those
  three steps sit in the training loop in `train.py`, one line each, instead of being folded
  into a helper. The loop is the thing being taught, so it shouldn't be the thing that's
  abbreviated.

## Chapter → code map

| page chapter | idea | file | names in the code |
|---|---|---|---|
| 0. A brain cell | inputs × strengths, sum, fire | `neuron.py` | `Neuron` |
| 1. The oracle | the answer key | `oracle.py` | `oracle(number)` |
| 2. What the neuron sees | switches | `switches.py` | `switches_for(number)`, `switch_for()`, `switch_label()` |
| 3. Weights and a score | the sum | `neuron.py` | `weights`, `bias`, `score()` |
| 4. How wrong, and the squash | miss, sigmoid | `neuron.py`, `train.py` | `squash()`, `confidence()`, `miss` in the loop |
| 5. The nudge | gradient descent | `nudge.py` | `nudge()` |
| 6. Thousands of nudges | the loop, train/test | `train.py` | `train`, `test`, `ROUNDS`, `report()` |
| 7. Reading its mind | the learned weights | `train.py` | weight table, `explain(4817)` |
| 8. One neuron or four? | where one neuron breaks | change `oracle.py` | `number % 3 == 0` |
