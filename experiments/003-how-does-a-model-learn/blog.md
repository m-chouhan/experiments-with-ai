# Let's Build GPT From Scratch (Part 02): How Does a Model Learn?

*Hello again! In Part 01 we built the dumbest model that writes: a 65×65 table, filled in by just counting. And I promised that the next post would throw the counting away and teach that table by **nudging** instead. Then I sat down to write it, and realised I couldn't explain to myself why nudging a pile of numbers should ever turn into knowledge. So this post is a small detour, hehe. A necessary one, I promise :)*

---

## Where are we in this series?

A quick recap of [Part 01](https://mchouhan.co.in/blogs/lets-build-gpt-from-scratch-01/):

- An LLM **predicts the next token**, appends it, and asks again.
- Our model looks at the current character and rolls a die from its row in a **65×65 table**.
- We filled that table by **counting** pairs, and graded it by **how surprised** it is by real text: from 4.17 (random) down to **2.46**.
- Counting doesn't scale. So the next step is to make our system *learn* the probabilities instead.

But what does "learning" actually mean for a piece of software? This is a fundamental question that needs to be answered before we move further on this journey. That is what we will try to answer today.

![Two problems, one loop: show the model an example, check its guess, and nudge its weights when it's wrong](images/learning.gif)

- **How do I "teach" a model to distinguish even and odd numbers?** ← this post
- **How do I "teach" a model what character should come next?** ← where we're headed: that's what GPT does

The second one is the real goal. But it's the same trick as the first one, just a lot bigger. So let's get the small one right first.

---

To understand what learning even means, we need to look at our brain first.

## Do you know how your brain works?

Scientists and researchers have tried to understand the mechanics of the human brain for thousands of years, and it's still an open-ended problem. :/

But in 1943, two scientists, [Warren McCulloch](https://en.wikipedia.org/wiki/Warren_Sturgis_McCulloch) and [Walter Pitts](https://en.wikipedia.org/wiki/Walter_Pitts), came up with [a mathematical model of one brain cell](https://doi.org/10.1007/BF02478259). That model is the foundation of artificial intelligence today.

See, the human brain works on **[neurons](https://en.wikipedia.org/wiki/Neuron)**. These are extremely complicated cells that emit an (output) signal based on the (input) signals coming into them. *And these signals actually impact everything that we do, every decision we take, everything we ever learned gets recorded or captured in the connections between these cells.*

![A neuron with each part labelled by its name in the code: inputs x arrive at the dendrites through synapses whose strengths are the weights w, the cell body adds them into the total, the bias is the threshold, and the axon fires if total > 0](images/neuron.png)

*Signals come in, each one gets stronger or weaker on the way (the weights), the cell body adds them up, and if the total crosses a threshold, the neuron fires.*

McCulloch and Pitts wrote this down as maths. In code, it's three lines:

```python
def neuron(inputs, weights, bias):
    total = bias + sum(w * x for w, x in zip(weights, inputs))
    return total > 0          # fire, or don't
```

This became the basis of the neuro + mathematical + computing model of artificial intelligence as we know it today.

---

## Where does the logic live?

As software engineers, we're used to giving instructions to a machine. This equation reverses that paradigm.

Look at that function again. Where do you think the logic (the instructions, the information) of the program lives?
Let's run through a simple example to build the mental model, which will help us arrive at the key insight.

Say we want to build a neuron that outputs a signal for whether I go out for a run or not.
Signal on → we go for a run, signal off → we stay put. Now what could the input signals for this be?

Let's say we have 2 signals.

| input signal       | on? | weight |
| ------------------ | --- | ------ |
| it's sunny         | 1   | +2     |
| a friend is coming | 0   | +1.5   |

**The neuron adds up the weights of the signals that are on, and fires if the total is above 3.**

Now let's try to answer whether I go for a run or not using this. (Try to do the math by hand before moving forward.)

<!-- interactive: readers flip the run neuron's inputs and drag its weights and threshold, and watch the total and the decision change -->
![The run neuron: flipping inputs and moving a weight or the threshold changes the total and the decision](images/run.gif)

So, where does the logic live? It's all in the **weights and the bias**.

*The structure is the same for every neuron that ever existed. But the knowledge lives entirely in its weights and bias.*

### The weights are the program!

*Change the weight, and the decision changes.*

Remember the **parameters** from Part 01, "the adjustable numbers inside the model"? These weights are exactly that. [GPT-3](https://arxiv.org/abs/2005.14165)'s 175 billion parameters are the same kind of number as these two weights.

So then what does **learning** mean?

Answer: it means finding the right weights and bias, so that our software program takes the right decision for a given input :) This is loosely how our brain processes information too.

---

## So how do you teach (or train) a model?

For that, it's important to pause and teach a single neuron *anything* first. And you're going to do it by hand.

Take the run neuron with just two inputs: *sunny* and *friend coming*, each can be either 0 or 1.  
That's only four situations. Pick what you want the neuron to learn, then move the weights until it learns :  

a) go out only if it's sunny and friend is coming  
b) go out if it's sunny OR a friend is coming  
c) go out if either of them is true, BUT not both.

<!-- interactive: readers pick a rule (both, either, exactly one) and drag the two weights and the bias until the cut gets all four corners right -->
![The four sunny / friend situations as the corners of a square; the neuron's cut is a straight line, which gets "both" and "either" right but always misses a corner on "exactly one"](images/corners.gif)

Congratulations! You just taught a neuron two different rules, and the only thing you changed was a few numbers. :P

What about (c), "exactly one"? You can't do it. Put the four situations on the corners of a square, and the border between "fire" and "don't fire" is always a **straight line** across it. A weighted sum can only ever make [one straight cut](https://en.wikipedia.org/wiki/Linear_separability), and "exactly one" needs its two "run" corners on opposite diagonals. Hold on to this idea, because it took researchers decades to figure this one out.

> **The picture to keep:** teaching a neuron = moving its weights until it gives the right answer. And whatever the weights, a single neuron can only split its inputs with one straight cut.

---

## Now our actual problem: even and odd

How do we teach a neuron the difference between even and odd numbers?

**Attempt 1: give it the number.**  
The obvious design is one input: the number itself. Then the neuron's total is `weight × number + bias`, a straight line. But the answers zig-zag: odd, even, odd, even.

<!-- interactive: readers tilt and slide the one-input line over the twenty numbers and count how many it gets right -->
![A straight line over the numbers 1 to 20: however it is tilted or slid, it gets at most 11 of them right](images/line.gif)

However you tilt and slide it, the best it gets is eleven out of twenty. A straight line crosses the middle *once*. The answers cross it on *every single step*. It's the "exactly one" problem again. Over all 10,000 numbers, the best any line can do is 50%, a coin flip.

The neuron isn't too dumb. It's looking at the problem from an angle where the answer can't be drawn with one cut. So this implies **we need more inputs**.

**Attempt 2: a number as ten switches.**  
Let's try a different approach: represent the number differently. Instead of one input, "the number", give it ten switches, one per possible last digit. Exactly one is on at a time:

```
9 = [0,0,0,0,0,0,0,0,0,1]
2 = [0,0,1,0,0,0,0,0,0,0]
```

Each switch gets its own weight. With just one switch on, the total is simply *that switch's weight* (plus the bias). Now 4817 and 4818 aren't neighbours on a line any more. They use two completely separate weights.

<!-- interactive: readers drag one weight per last digit until all twenty numbers are right -->
![Ten sliders, one weight per last digit: pushing odd digits up and even digits down turns all twenty numbers right](images/sliders.gif)

Twenty out of twenty is easy: push the odd digits up and the even digits down. And every number ending in 7 gets the same total, so twenty out of twenty means *all ten thousand* are right. Nothing about the neuron got smarter. Its *inputs* did.

This trick of turning a value into one switch per possibility is called **[one-hot encoding](https://en.wikipedia.org/wiki/One-hot)**. And we've seen it before! Looking up row `t` of our bigram table in Part 01 is exactly this: switch on input `t` out of 65, and read off its weights. GPT does the same with text: one switch per token in its vocabulary.

> **The picture to keep:** how we represent the input is extremely important. One plain number hid the pattern; ten switches made it obvious. The richer the input signals, the more complex the patterns a model can pick up.

---

## How do you teach it without the sliders?

Up to now, *you* were the one doing the teaching. You looked at the wrong answers and moved the sliders. Let's hand that job to a loop.

We show the model each input, and then, based on its response being right or wrong, we nudge it:

1. **Guess.** Add up the weights of the switches that are on, plus the bias. Positive means "odd".
2. **Check** against the right answer.
3. **Right?** Do nothing.
4. **Wrong?** Nudge every weight whose switch was on: +1 if it should have said odd, −1 if it should have said even. Same for the bias.

That's the whole learning rule. [Frank Rosenblatt](https://en.wikipedia.org/wiki/Frank_Rosenblatt) came up with it [in 1958](https://doi.org/10.1037/h0042519) and called the result a **[perceptron](https://en.wikipedia.org/wiki/Perceptron)**.

Let's dry run it, with just the ten last-digit switches. Everything starts at 0:

```
number  total            guess  right?   what moves
17      0                even   ✗ odd    digit 7 → +1, bias → +1
24      1 + 0  =  1      odd    ✗ even   digit 4 → −1, bias →  0
53      0 + 0  =  0      even   ✗ odd    digit 3 → +1, bias → +1
87      1 + 1  =  2      odd    ✓        nothing
38      1 + 0  =  1      odd    ✗ even   digit 8 → −1, bias →  0
```

See what's happening? Every mistake writes the answer into the weight of the digit it saw. A few more mistakes and all ten weights are filled in, and then there's nothing left to fix.

Now let's make it a fair test, and not even tell it which digit matters. It gets all four digits of the number, ten switches each, so **40 switches**. Everything starts at 0.

Before you run it: the rule never mentions the last digit. Which weights do you expect to grow?

```python
weights, bias = [0] * 40, 0
for number, answer in examples:
    switches = switches_for(number)                    # 40 zeros and ones
    total = bias + sum(w * s for w, s in zip(weights, switches))
    guess = 1 if total > 0 else 0
    if guess != answer:
        nudge = +1 if answer == 1 else -1              # which way it was wrong
        for i in range(40):
            weights[i] += nudge * switches[i]          # only switches that were on
        bias += nudge
```

I ran it on 2,000 random numbers. Here's every mistake it made, and every nudge:

<!-- interactive: readers step through the real training run mistake by mistake and watch the weight grid fill in -->
![The 4 × 10 weight grid during training: each mistake nudges the four switches of that number, until the last row is striped and accuracy reaches 100%](images/training.gif)

The last row turns into stripes, and the other three rows stay at (or near) zero. After a few dozen mistakes it hardly makes any more, so it hardly changes any more.

### And the model has learned `n % 2`.

*Nobody wrote that rule. It's sitting in the bottom row of the grid.*

> **🐇 Rabbit hole: why accuracy here, when Part 01 said accuracy is a bad grade?**
>
> In Part 01, after `"th"` both `e` and `a` are fine answers, so marking the top guess right or wrong threw information away, and we measured *surprise* instead. Odd and even is different: every number has exactly one right answer, and nothing is uncertain. So here, "how often is it right?" is an honest grade. For the next character it isn't, and that's exactly why in the next post we will go back to surprise.

---

## Why does it work? Looks like magic?

Each step of that loop is completely mindless. So where did the understanding come from?

**It learns from hard evidence.** A weight only moves when its switch was on during a mistake: +1 for an odd number, −1 for an even one. So every weight is just a running tally of evidence.

**Signal adds up, noise cancels.** This is the critical one. Our observation that the evenness or oddness of a number depends on the *position* of the digit was crucial. Because every position got its own switches, the model could identify and refine the signal. "Digit 4 is 7" only ever shows up in odd numbers, so every nudge pushes it the same way, and it climbs. "Digit 2 is 8" shows up in odd and even numbers about equally, so its nudges cancel each other out. The same signals got added up, and the noise ended up cancelling itself.

**It only changes on errors.** When the answer is right, the design blocks the nudge. Once the pattern is in the weights, mistakes dry up and the numbers stop moving. It doesn't "know" it's done. It just stops getting corrected.

> **The picture to keep:** learning is a loop that turns every mistake into a tiny edit of the numbers. Only what's consistently linked to the answer survives all those edits, and that's exactly what a pattern is.

> **🐇 Rabbit hole: why "exactly one" took decades**
>
> One neuron draws one straight line, so it can never learn "exactly one". The fix is more neurons, feeding into each other. But then our loop breaks. It works because a wrong answer tells us exactly which weights to nudge: the ones whose switches were on. With many neurons chained together, a wrong answer at the end doesn't tell us which weights inside caused it. Researchers were stuck on that for years. The answer is called **[backpropagation](https://en.wikipedia.org/wiki/Backpropagation)**: a way to work out how much each weight is to blame for the mistake, so every weight knows which way to move. Every GPT is still trained this way today, and we'll get to it later in this series :)

---

## The same thing, in a programmer's world!!

| | programming | machine learning |
| --- | --- | --- |
| **you write** | the rules | the pipeline (a model + a nudge rule) |
| **you give** | the input | inputs AND answers |
| **you get** | an answer | the rules, as weights |

Andrej Karpathy has an interesting name for this shift: **[Software 2.0](https://karpathy.medium.com/software-2-0-a64152b37c35)**.

1. **Software 1.0, write the rule for the machine:** `n % 2 == 1`. One line. Done.
2. **Software 2.0, let the machine learn the rule:** what this whole post did. 40 weights and a loop that nudged them on every mistake. The weights *are* the program, and instead of writing them, we train the model to find them.

For odd and even, option 1 wins by a mile. It's shorter, it's faster, and it's right by construction, not by testing. We spent a whole post re-deriving one line of code. The interesting shift is that we can now solve a whole class of problems where option 1 doesn't even exist. Nobody can write `is_cat(photo)` or `next_character("th")` as a rule. For those, learning isn't the slow way. It's probably the only way.

Odd and even was just a problem small enough to watch it happen.

---

## Play with it

Everything above is in one file: [`playground.py`](https://github.com/m-chouhan/experiments-with-ai/blob/main/experiments/003-how-does-a-model-learn/playground.py).

---

## Wrapping up

No new row on the scoreboard this time. It's a detour, after all :P But in this post we found out:

- **A neuron is a weighted sum and a threshold.** Three lines of code, borrowed from biology in 1943.
- **The weights are the program.** Learning means finding the right weights.
- **The inputs decide what's learnable.** One straight cut can't split odd from even, but one-hot switches make it easy.
- **A dumb loop can find the weights.** Guess, check, and nudge on every mistake. Signal adds up, noise cancels, and it stops when the mistakes stop.

**Next post:** *Same score, new engine*, for real this time. Our bigram table from Part 01 is just 65 neurons, each with 65 one-hot inputs. We start it from zeros and nudge it. The difference: it can't wait for a clear "wrong", because the next character is never certain. So it nudges on *every* example, by *how surprised* it was. That's [gradient descent](https://en.wikipedia.org/wiki/Gradient_descent), and it's what eventually trains a GPT.

If something here didn't click, or you know a better way to explain it, tell me in the comments. I'm learning this too :)

### Further reading

1. [3Blue1Brown, *Neural Networks*](https://www.3blue1brown.com/topics/neural-networks). The videos that inspired this post.
2. [Michael Nielsen, *Neural Networks and Deep Learning*, chapter 1](http://neuralnetworksanddeeplearning.com/chap1.html). Perceptrons, then sigmoid neurons. The same path as this post.
3. [Wikipedia, *Perceptron*](https://en.wikipedia.org/wiki/Perceptron). Where the perceptron came from, and what one neuron can and can't do.
4. [Andrej Karpathy, *The spelled-out intro to neural networks and backpropagation*](https://www.youtube.com/watch?v=VMj-3S1tku0). The step after this one.

---

*Code for this post:* [github.com/m-chouhan/experiments-with-ai](https://github.com/m-chouhan/experiments-with-ai/tree/main/experiments/003-how-does-a-model-learn)
