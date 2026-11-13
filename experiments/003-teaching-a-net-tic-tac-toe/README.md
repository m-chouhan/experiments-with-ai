# 003 · Teaching a machine to tell even from odd

You already know how to write a function that says whether a number is even:

```python
def is_odd(n):
    return n % 2
```

This experiment does something stranger. It **doesn't** write that rule. It writes a function
with 41 adjustable numbers inside it, shows it 2,000 examples of numbers along with the right
answer, and lets it adjust itself until it gets the answer right. Then we open it up and look at
what it figured out.

That's all machine learning is, at its core. The goal is to watch that happen on a problem so
small that nothing is hidden.

> **Where this is going.** In [002](../002-teaching-an-llm-tic-tac-toe/) a large language model
> played tic-tac-toe and was only slightly better than random. The plan for this experiment
> is to teach a small model tic-tac-toe from scratch. Even/odd is the first rung: same idea,
> nothing in the way.

## Run it

You need Python 3. Nothing to install.

```bash
python3 train.py
```

It takes less than a second.

The code is written to be *read*: six short files, one idea each, no libraries, and every
step of the loop spelled out where it happens rather than hidden behind a helper.
[LEARNINGS.md](LEARNINGS.md) has the questions I hit while going through it, with answers.

There are also two interactive explainers. Open them in a browser:

1. [`explainer-1-how-a-neuron-learns.html`](explainer-1-how-a-neuron-learns.html): the mental
   model, with no repo code. A neuron is a weighted vote and draws one straight cut. The right
   inputs make odd vs even one cut apart, and a loop that fixes its mistakes finds the weights.
2. [`explainer-2-even-or-odd-learned.html`](explainer-2-even-or-odd-learned.html): this folder's
   code, chapter by chapter: the switches, the sigmoid, the nudge, training, reading the weights,
   and where one neuron breaks.

---

## The big idea in four words

Every piece of machine learning in this folder is one of four things:

| Word | Question it answers | File |
|---|---|---|
| **Data** | What are the examples, and what's the right answer for each? | `oracle.py`, `switches.py` |
| **Model** | What function makes a guess, and what are its weights? | `neuron.py` |
| **Grade** | How good is the guess? | `grade.py` |
| **Nudge** | How do I adjust the weights so the next guess is a bit better? | `nudge.py` |

`train.py` is the loop that ties them together: **grade → nudge on every example → grade again
→ repeat.**

If you remember nothing else: *a model is a function with adjustable weights, and training is
nudging those weights a little at a time, in whatever direction makes it less wrong.*

---

## How it works, file by file

Read the files in this order. Each one is short.

### 1. `oracle.py` and `switches.py`: the examples and the right answers

We pick 3,000 different numbers between 0 and 9999. For each one we need the right answer,
and we get it for free from an **oracle**: a function we already trust.

```python
def oracle(number):
    return number % 2      # 1 = odd, 0 = even
```

It might feel like cheating to use `% 2` to train something to learn `% 2`. It isn't. Think of
the oracle as the answer key at the back of a textbook. The model never sees the oracle's code;
it only sees questions and answers. In real problems the oracle is usually a human who labelled
the data ("this photo is a cat"). Here it's one line of Python, so the answers are always right.

**Splitting the data** (top of `train.py`). 2,000 numbers go into the **training set**, the examples the model
learns from. The other 1,000 go into the **test set**, which the model never trains on. The test
set is how we check that the model learned the *rule* and didn't just memorise the 2,000 answers
it saw. It's the same reason an exam doesn't reuse the homework questions.

**Encoding** (`switches.py`). A model can only read a list of numbers, so we have to decide how to show it
"4817". We give each of the 4 digit positions 10 on/off switches and turn on the one that matches
the digit:

```
4817  ->   digit 1 is 4:  0 0 0 0 1 0 0 0 0 0
           digit 2 is 8:  0 0 0 0 0 0 0 0 1 0
           digit 3 is 1:  0 1 0 0 0 0 0 0 0 0
           digit 4 is 7:  0 0 0 0 0 0 0 1 0 0
```

That's 40 switches, which is the model's input. `switches_for(4817)` gives you all 40 of them as
a plain list of 0s and 1s, and that list is the only thing the model ever gets handed. Switch 37
is the one that means "digit 4 is 7"; `switch_for(place, digit)` works out that number, and
`switch_label(37)` turns it back into words when something needs printing. This style is called
**one-hot encoding**: exactly one switch is "hot" in each group.

Why not just give it the number 4817? Because then the model would have to discover something
about the number's size that tells it the answer, and evenness has nothing to do with size
(4817 is odd, 4818 is even). Switches let the model treat "the last digit is 7" as a fact it can
attach a weight to.

### 2. `neuron.py`: a function with weights

The model has one **weight** for each of the 40 switches, plus one extra number called the
**bias**. All 41 start at 0.

To make a guess, it adds up the weights of the switches that are on, plus the bias:

```python
score = bias + sum(weight * switch for each of the 40 switches)
```

Because only 4 switches are ever on, that's really just "bias + 4 weights". A big positive score
means "I think it's odd" and a big negative score means "I think it's even".

Then we squash the score into a number between 0 and 1 with the **sigmoid** function:

```python
confidence = squash(score)      # squash(score) = 1 / (1 + e^(-score))
```

| score | -5 | -1 | 0 | 1 | 5 |
|---|---|---|---|---|---|
| confidence it's odd | 0.007 | 0.27 | 0.5 | 0.73 | 0.993 |

A confidence of 0.5 means "no idea". If the confidence is over 0.5, the model's guess is "odd".

This is the entire model. The 41 numbers are its weights. Training means finding good values for
them.

### 3. `grade.py`: how good is it?

We measure two things:

- **Accuracy**: what fraction of guesses match the oracle. It's easy to read, but it's
  all-or-nothing: a guess of 0.51 for an odd number counts as fully right.
- **Average miss**: how far the confidence is from the true answer, averaged over the
  examples. If the answer is odd (1) and the model said 0.9, the miss is 0.1. If it said 0.5,
  the miss is 0.5. This one keeps improving even after accuracy hits 100%, because the model
  keeps getting *surer*. It's the same miss the nudge uses, with the sign thrown away: learning
  needs to know *which way* the model leaned, a score only needs to know how far off it was.

We grade on the training set and on the test set. If training accuracy is high and test accuracy
is low, the model memorised instead of learning. Machine learning calls this **overfitting**.

### 4. `nudge.py`: gradient descent

This is the part that makes it learn. The whole of it is three lines in `train.py`:

```python
confidence = neuron.confidence(switches)     # guess
miss = confidence - answer                   # see how wrong, and in which direction
nudge(neuron, switches, miss, LEARNING_RATE) # move the weights
```

and three more inside `nudge`:

```python
for switch_number, switch in enumerate(switches):
    neuron.weights[switch_number] -= learning_rate * miss * switch
neuron.bias -= learning_rate * miss
```

In words:

1. Work out the **miss**: the confidence minus the right answer. If it's positive, the model said
   "odd" too strongly. If it's negative, it didn't say "odd" strongly enough.
2. For each switch that was **on** (1), move its weight a little in the opposite
   direction of the miss. Switches that were off (0) didn't affect this guess, so they
   don't move.
3. The **learning rate** (0.1 here) decides how big "a little" is.

That's **gradient descent**. The *gradient* is the direction in which the error grows fastest.
*Descent* means stepping the other way, downhill. For this particular model, calculus says the
downhill direction for each weight is exactly `miss × switch`. You don't need to derive that to
use it. The intuition is enough: **blame each weight in proportion to how much it took part in the
answer.**

### 5. `train.py`: the loop

```
make the data
make a model (all weights at 0)
grade it                                  <- about 50%, it knows nothing yet
repeat 5 times:
    shuffle the training examples
    for each example: guess, see how wrong, move the weights
    grade it
print the weights
```

One full pass through the training set is called a **round** here. The usual name for it is an
**epoch**. We shuffle each time so the model doesn't see the examples in the same order every
pass.

---

## One nudge, worked through by hand

Here's what happens to a fresh model, with all weights at 0, if it sees these two numbers first.

**Example 1: 4817, odd (y = 1).**
- The on switches are "1st digit is 4", "2nd is 8", "3rd is 1" and "4th is 7". Their weights are
  all 0, so the score is 0 and the confidence is 0.5.
- miss = 0.5 − 1 = **−0.5**. It wasn't confident enough that this is odd.
- Each of those 4 weights, and the bias, changes by −0.1 × −0.5 × 1 = **+0.05**.

**Example 2: 6890, even (y = 0).**
- The on switches are "1st is 6", "2nd is 8", "3rd is 9" and "4th is 0". Only "2nd is 8" was
  touched before, at +0.05, and the bias is +0.05. So the score is 0.10 and the confidence is
  about 0.52.
- miss = 0.52 − 0 = **+0.52**. It leaned "odd" a little, and it was wrong.
- Each of the 4 on weights, and the bias, changes by about **−0.05**.

Look at what happened to **"2nd digit is 8"**. It went up by 0.05, then down by about 0.05. It
appeared in an odd number and then in an even number, so the nudges cancelled out.

That's the whole secret of what follows. Over 2,000 examples, a weight like "2nd digit is 8" gets
pushed up roughly as often as it gets pushed down, because the 2nd digit tells you nothing about
evenness. So it stays near 0. But "4th digit is 7" is *only ever* in odd numbers, so it gets
pushed up every single time. The useful weights grow and the useless ones stay near 0. Nobody
told the model which digit mattered. The data did.

---

## What you'll see

```
  before   train  49.9%   test  49.9%   average miss 0.500

4817:
    bias                        +0.00
  + weight for "digit 1 is 4"   +0.00
  + weight for "digit 2 is 8"   +0.00
  + weight for "digit 3 is 1"   +0.00
  + weight for "digit 4 is 7"   +0.00
  = score                       +0.00
    confidence = squash(score)   0.50   ->  guess: even
 round 1   train 100.0%   test 100.0%   average miss 0.052
 round 2   train 100.0%   test 100.0%   average miss 0.026
 round 3   train 100.0%   test 100.0%   average miss 0.017
 round 4   train 100.0%   test 100.0%   average miss 0.013
 round 5   train 100.0%   test 100.0%   average miss 0.010

weights        0      1      2      3      4      5      6      7      8      9
  digit 1   +0.1   -0.0   -0.1   -0.0   -0.2   +0.0   -0.0   +0.1   -0.0   +0.1
  digit 2   -0.2   -0.1   +0.0   -0.1   -0.0   +0.1   +0.1   +0.0   +0.1   +0.1
  digit 3   +0.0   +0.1   -0.0   -0.1   -0.1   +0.0   -0.0   +0.1   -0.0   +0.0
  digit 4   -4.6   +4.6   -4.5   +4.6   -4.5   +4.5   -4.6   +4.5   -4.6   +4.6
  bias     -0.01

4817:
    bias                        -0.01
  + weight for "digit 1 is 4"   -0.18
  + weight for "digit 2 is 8"   +0.11
  + weight for "digit 3 is 1"   +0.06
  + weight for "digit 4 is 7"   +4.55
  = score                       +4.54
    confidence = squash(score)   0.99   ->  guess: odd
```

How to read it:

- **Before training** it scores about 50%. Every confidence is exactly 0.5, so it guesses
  "even" for everything and is right for the half of the numbers that are even. That's what a
  coin flip gets.
- **After one round** it's perfect, even on the 1,000 test numbers it never trained on. So it
  learned the rule, not the examples.
- **Average miss** keeps shrinking. The answers were already right; the model is just getting
  more confident.
- **The weights table is the model's brain, printed.** The last lines show the sum for 4817,
  before and after: 0.00 at the start, +4.54 at the end, nearly all from the weight for
  "digit 4 is 7". Digits 1, 2 and 3 are near 0, so they're
  ignored. Digit 4 is −4.6 for 0, 2, 4, 6, 8 and +4.6 for 1, 3, 5, 7, 9. That's "look at the last
  digit, and check whether it's even", written in numbers. It's the same rule as `n % 2`, and the
  model found it on its own.

---

## Experiments to try

Each is a one-line change. Predict what will happen *before* you run it.

1. **`LEARNING_RATE = 0`** in `train.py`. Nothing moves. Why?
2. **`LEARNING_RATE = 0.001`**. It learns, but slowly. How many rounds does it need now?
3. **`LEARNING_RATE = 100`**. Does it still work? Look at how big the weights get.
4. **Use less data.** In `train.py`, change the 2000/1000 split to 20 training examples. Does
   test accuracy hold up? Which weights end up wrong?
5. **A harder rule.** In `oracle.py`, change the oracle to `return 1 if number % 3 == 0 else 0` ("divisible by
   3"). Accuracy never settles: it wanders somewhere in the 45–66% range from round to round
   (46% after the 5 rounds as shipped, about 65% if you let it run 50). All of that is *worse*
   than just always answering "no", which scores about 67%, since only a third of numbers are
   divisible by 3. Look at the weights to see why: whether a number
   is divisible by 3 depends on *all* the digits *together* (their sum), and a model that only
   adds up one weight per digit can't express "together". That limit is why real neural
   networks have *hidden layers*. It's the next step.

---

## The proper names

You'll meet these terms in every book and course. Here's how they map to this code.

| In this code | Standard name |
|---|---|
| the neuron in `neuron.py` | **logistic regression**, or a single **neuron** with a sigmoid activation |
| switches | **one-hot encoded features** |
| the weights and the bias | **parameters** (the numbers training sets) |
| `LEARNING_RATE`, `ROUNDS` | **hyperparameters** (the numbers *you* set) |
| confidence | **predicted probability** |
| `oracle` | **labels** / **ground truth** |
| average miss | a simple **loss** (books usually use **cross-entropy loss**, and our nudge rule is its gradient) |
| nudge | **gradient descent**; one example at a time is **stochastic gradient descent (SGD)** |
| round | **epoch** |
| learning rate | **learning rate** (same name) |
| train / test split | **training set** / **test set** (or held-out set) |
| learned the rule, not the examples | **generalisation** |
| memorised the examples | **overfitting** |

**Is this a neural network?** It's the smallest one: a single neuron. A neural network is many of
these stacked, where the outputs of one layer become the switches for the next. Everything
here (data, model, grade, nudge) stays the same when you stack them. Only the model gets bigger,
and the nudge has to pass blame back through the layers. That passing back is called
**backpropagation**.

---

## Read and watch more

In the order I'd go through them:

1. **3Blue1Brown, *Neural Networks*** (videos). The clearest pictures of neurons, layers and
   gradient descent you'll find. Watch the first two after running this code.
   https://www.3blue1brown.com/topics/neural-networks
2. **Michael Nielsen, *Neural Networks and Deep Learning*, chapter 1** (free book). Covers
   sigmoid neurons and gradient descent with the same intuition used here, then builds a network
   that reads handwritten digits.
   http://neuralnetworksanddeeplearning.com/chap1.html
3. **Google, *Machine Learning Crash Course*: logistic regression**. A short, practical take on
   exactly the neuron in `neuron.py`.
   https://developers.google.com/machine-learning/crash-course/logistic-regression
4. **Andrej Karpathy, *The spelled-out intro to neural networks and backpropagation*** (video,
   about 2.5 hours). Builds a tiny neural network library from scratch in Python. Do this one when
   you want to understand the step after this experiment: hidden layers and backpropagation.
   https://www.youtube.com/watch?v=VMj-3S1tku0
5. **Stanford CS231n notes: linear classification**. More formal. Good once the ideas feel
   familiar and you want the maths behind them.
   https://cs231n.github.io/linear-classify/

Quick references: [Logistic regression](https://en.wikipedia.org/wiki/Logistic_regression),
[Sigmoid function](https://en.wikipedia.org/wiki/Sigmoid_function),
[Gradient descent](https://en.wikipedia.org/wiki/Gradient_descent),
[One-hot](https://en.wikipedia.org/wiki/One-hot).

---

## What's next

1. **Even/odd**: one neuron, one row of weights. *Done: this folder.*
2. **Divisible by 3**: the single neuron fails (experiment 5 above). Add a hidden layer and
   watch it succeed. This is where backpropagation comes in.
3. **Tic-tac-toe**: same loop, with the 002 minimax oracle as the answer key. Can a tiny network
   beat the LLM from 002?

The four parts stay the same at every step. Only the data and the model change.

## Files

```
oracle.py     the answer key: 1 if odd, 0 if even
switches.py   a number -> a row of 40 on/off switches
neuron.py     41 weights -> a score -> squash -> a confidence between 0 and 1
grade.py      accuracy and average miss: how we watch it improve
nudge.py      gradient descent, one example at a time
train.py      the data, the loop, the weight table; run this one
LEARNINGS.md  questions I had while learning this, with answers (notes for the blog)
```
