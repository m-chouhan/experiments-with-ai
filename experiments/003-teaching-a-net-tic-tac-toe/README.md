# 003 · Teach a machine to find even and odd numbers

> This is a version of [README.md](README.md) in ASD-STE100 Simplified Technical English.
> The content is the same. The sentences are short, and each sentence has one idea.

## 1. Purpose

A programmer can write a rule that finds odd numbers:

```python
def is_odd(n):
    return n % 2
```

This experiment does not write that rule. It writes a function that has 41 numbers inside it.
These numbers can change. The function gets 2,000 example numbers and the correct answer for each.
The function changes its numbers until it gives the correct answers. Then we examine the numbers
to see what the function found.

This is the basic procedure of machine learning. The problem is very small, thus you can see all
of the steps.

> **Next steps.** In [002](../002-teaching-an-llm-tic-tac-toe/), a large language model played
> tic-tac-toe. Its results were only a little better than random moves. The plan is to teach a
> small model tic-tac-toe from the start. Even and odd is the first step. The procedure is the
> same, but the problem is easier.

## 2. Run the experiment

You must have Python 3. You do not have to install other software.

1. Open a terminal in this folder.
2. Type this command:

   ```bash
   python3 train.py
   ```

3. Wait less than one second for the result.

The code is easy to read. There are six short files. Each file has one idea. The code uses no
libraries. Each step of the loop is in the location where it occurs.
[LEARNINGS.md](LEARNINGS.md) gives the questions that I had about the code, and their answers.

There are also two interactive explainers. Open them in a web browser:

1. [`explainer-1-how-a-neuron-learns.html`](explainer-1-how-a-neuron-learns.html) shows the
   basic idea. It does not use the code from this folder. A neuron is a weighted vote. It draws
   one straight line between two groups. With the correct inputs, one line can divide odd numbers
   from even numbers. A loop that corrects its errors finds the weights.
2. [`explainer-2-even-or-odd-learned.html`](explainer-2-even-or-odd-learned.html) shows the code
   in this folder, one chapter at a time. The chapters are: the switches, the sigmoid, the nudge,
   training, the weights, and the limit of one neuron.

---

## 3. The four parts

All of the machine learning in this folder has four parts:

| Part | Question | File |
|---|---|---|
| **Data** | What are the examples? What is the correct answer for each example? | `oracle.py`, `switches.py` |
| **Model** | Which function makes a guess? What are its weights? | `neuron.py` |
| **Grade** | How good is the guess? | `grade.py` |
| **Nudge** | How do we change the weights to make the next guess better? | `nudge.py` |

`train.py` is the loop that connects the four parts. The loop does these steps:

1. Grade the model.
2. Nudge the weights for each example.
3. Grade the model again.
4. Do steps 2 and 3 again.

The most important idea is this: *a model is a function with weights that can change. Training
changes the weights by a small quantity each time, in the direction that decreases the error.*

---

## 4. Description of each file

Read the files in this sequence. Each file is short.

### 4.1 `oracle.py` and `switches.py`: the examples and the correct answers

We select 3,000 different numbers between 0 and 9999. Each number must have a correct answer.
An **oracle** gives the correct answer. An oracle is a function that we know is correct.

```python
def oracle(number):
    return number % 2      # 1 = odd, 0 = even
```

We use `% 2` to train a model to learn `% 2`. This is not an error. The oracle is like the
answer list at the end of a textbook. The model does not see the code of the oracle. The model
sees only the questions and the answers. In real problems, the oracle is usually a person who
labels the data (for example, "this photo shows a cat"). Here, the oracle is one line of Python.
Thus, the answers are always correct.

**Divide the data** (at the top of `train.py`). We put 2,000 numbers into the **training set**.
The model learns from these examples. We put the other 1,000 numbers into the **test set**. The
model does not train on the test set. The test set shows if the model learned the *rule*. If the
model only remembered the 2,000 answers, the test set shows this. For the same reason, an
examination does not use the questions from the homework.

**Encode the data** (`switches.py`). A model can read only a list of numbers. Thus, we must
decide how to show the number "4817" to the model. Each of the 4 digit positions has 10 on/off
switches. For each position, we set to on the switch that agrees with the digit:

```
4817  ->   digit 1 is 4:  0 0 0 0 1 0 0 0 0 0
           digit 2 is 8:  0 0 0 0 0 0 0 0 1 0
           digit 3 is 1:  0 1 0 0 0 0 0 0 0 0
           digit 4 is 7:  0 0 0 0 0 0 0 1 0 0
```

There are 40 switches. They are the input of the model. `switches_for(4817)` gives all 40
switches as a list of 0s and 1s. The model gets only this list. Switch 37 has the meaning
"digit 4 is 7". `switch_for(place, digit)` calculates the switch number. `switch_label(37)`
changes the switch number back into words for the printout. The name of this method is
**one-hot encoding**. In each group, only one switch is on ("hot").

Why do we not give the number 4817 directly to the model? If we do this, the model must find the
answer from the size of the number. But the size of a number does not tell you if it is even.
For example, 4817 is odd and 4818 is even. With switches, the model can use the fact "the last
digit is 7" directly, and give a weight to it.

### 4.2 `neuron.py`: a function with weights

The model has one **weight** for each of the 40 switches. It also has one more number, the
**bias**. At the start, all 41 numbers are 0.

To make a guess, the model adds the weights of the switches that are on. Then it adds the bias:

```python
score = bias + sum(weight * switch for each of the 40 switches)
```

Only 4 switches are on at one time. Thus, the score is the bias plus 4 weights. A large positive
score means "odd". A large negative score means "even".

Then the **sigmoid** function changes the score into a number between 0 and 1:

```python
confidence = squash(score)      # squash(score) = 1 / (1 + e^(-score))
```

| score | -5 | -1 | 0 | 1 | 5 |
|---|---|---|---|---|---|
| confidence that the number is odd | 0.007 | 0.27 | 0.5 | 0.73 | 0.993 |

A confidence of 0.5 means that the model does not know. If the confidence is more than 0.5, the
guess of the model is "odd".

This is all of the model. The 41 numbers are its weights. Training finds good values for these
weights.

### 4.3 `grade.py`: measure the model

We measure two values:

- **Accuracy**: the fraction of guesses that agree with the oracle. This value is easy to read.
  But a guess is only right or wrong. For example, a guess of 0.51 for an odd number is fully
  right.
- **Average miss**: the difference between the confidence and the correct answer, for each
  example. Then we calculate the average. If the answer is odd (1) and the model gives 0.9, the
  miss is 0.1. If the model gives 0.5, the miss is 0.5. This value continues to decrease after
  the accuracy is 100%, because the confidence of the model increases. The nudge uses the same
  miss, but the nudge keeps the sign (+ or −). The nudge must know the *direction* of the error.
  The grade must know only the size of the error.

We grade the model on the training set and on the test set. Sometimes the training accuracy is
high and the test accuracy is low. This shows that the model remembered the examples and did not
learn the rule. The name of this problem is **overfitting**.

### 4.4 `nudge.py`: gradient descent

This part causes the model to learn. It is three lines in `train.py`:

```python
confidence = neuron.confidence(switches)     # guess
miss = confidence - answer                   # find the size and direction of the error
nudge(neuron, switches, miss, LEARNING_RATE) # change the weights
```

There are also three lines in `nudge`:

```python
for switch_number, switch in enumerate(switches):
    neuron.weights[switch_number] -= learning_rate * miss * switch
neuron.bias -= learning_rate * miss
```

The procedure is:

1. Calculate the **miss**. The miss is the confidence minus the correct answer. If the miss is
   positive, the model said "odd" too strongly. If the miss is negative, the model did not say
   "odd" strongly enough.
2. For each switch that is **on** (1), move its weight by a small quantity. Move it in the
   direction opposite to the miss. The switches that are off (0) had no effect on this guess.
   Thus, their weights do not change.
3. The **learning rate** (0.1 here) sets the size of the small quantity.

The name of this procedure is **gradient descent**. The *gradient* is the direction in which the
error increases most quickly. *Descent* means a step in the opposite direction. For this model,
calculus shows that the correct direction for each weight is `miss × switch`. You do not have to
do the calculus to use this. Remember this idea: **each weight gets a part of the error. The size
of this part agrees with the effect of the weight on the answer.**

### 4.5 `train.py`: the loop

```
make the data
make a model (all weights at 0)
grade it                                  <- approximately 50%, it knows nothing
do these steps 5 times:
    put the training examples in a random sequence
    for each example: guess, find the error, change the weights
    grade it
print the weights
```

One full pass through the training set is a **round**. The usual name is an **epoch**. Each
round, we put the examples in a new random sequence. Thus, the model does not see the examples
in the same sequence each time.

---

## 5. Example: one nudge, calculated by hand

This example shows a new model. All of its weights are 0. It sees these two numbers first.

**Example 1: 4817, odd (y = 1).**
- The switches that are on are: "digit 1 is 4", "digit 2 is 8", "digit 3 is 1" and
  "digit 4 is 7". Their weights are all 0. Thus, the score is 0 and the confidence is 0.5.
- miss = 0.5 − 1 = **−0.5**. The model was not sufficiently sure that the number is odd.
- Each of these 4 weights, and the bias, changes by −0.1 × −0.5 × 1 = **+0.05**.

**Example 2: 6890, even (y = 0).**
- The switches that are on are: "digit 1 is 6", "digit 2 is 8", "digit 3 is 9" and
  "digit 4 is 0". Only "digit 2 is 8" changed before (to +0.05). The bias is also +0.05. Thus,
  the score is 0.10 and the confidence is approximately 0.52.
- miss = 0.52 − 0 = **+0.52**. The model said "odd" a little, and this was wrong.
- Each of the 4 weights that are on, and the bias, changes by approximately **−0.05**.

Examine the weight for **"digit 2 is 8"**. It increased by 0.05. Then it decreased by
approximately 0.05. It was in an odd number and then in an even number. Thus, the two nudges
cancelled each other.

This is the most important result. In 2,000 examples, a weight like "digit 2 is 8" increases
approximately as frequently as it decreases. The reason is that the second digit does not tell
you if a number is even. Thus, this weight stays near 0. But "digit 4 is 7" occurs *only* in odd
numbers. Thus, it increases each time. The useful weights become large. The weights that are not
useful stay near 0. Nobody told the model which digit is important. The data gave this
information.

---

## 6. Results

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

How to read the results:

- **Before training**, the accuracy is approximately 50%. Each confidence is 0.5. Thus, the model
  guesses "even" for all numbers. This is correct for the half of the numbers that are even. A
  random coin toss gives the same result.
- **After one round**, the accuracy is 100%. This is also true for the 1,000 test numbers. The
  model did not train on these numbers. Thus, the model learned the rule, not the examples.
- **The average miss** continues to decrease. The answers were already correct. The confidence
  of the model increases.
- **The table of weights shows what the model learned.** The last lines show the calculation for
  4817, before and after training. At the start, the score is 0.00. At the end, the score is
  +4.54. Almost all of this score comes from the weight for "digit 4 is 7". The weights for
  digits 1, 2 and 3 are near 0. Thus, the model ignores these digits. For digit 4, the weight is
  −4.6 for 0, 2, 4, 6, 8. It is +4.6 for 1, 3, 5, 7, 9. This is the rule "examine the last digit,
  and find if it is even", in numbers. It is the same rule as `n % 2`. The model found this rule
  without help.

---

## 7. Tests that you can do

Each test is a change to one line. Before you run the code, say what you think will occur.

1. Set **`LEARNING_RATE = 0`** in `train.py`. No weights change. Find the reason.
2. Set **`LEARNING_RATE = 0.001`**. The model learns, but slowly. Count the rounds that are
   necessary now.
3. Set **`LEARNING_RATE = 100`**. Find if the model still works. Examine the size of the weights.
4. **Use less data.** In `train.py`, change the 2000/1000 division to 20 training examples. Find
   if the test accuracy stays high. Find which weights become wrong.
5. **Use a more difficult rule.** In `oracle.py`, change the oracle to
   `return 1 if number % 3 == 0 else 0` ("divisible by 3"). The accuracy does not become stable.
   It changes between approximately 45% and 66% from round to round. After the 5 standard rounds,
   it is 46%. After 50 rounds, it is approximately 65%. All of these values are *worse* than the
   answer "no" for all numbers. That answer gives approximately 67%, because only one third of
   numbers are divisible by 3. Examine the weights to find the reason. Divisibility by 3 depends
   on *all* the digits *together* (their sum). This model adds one weight for each digit. It
   cannot show the idea "together". Because of this limit, real neural networks have
   *hidden layers*. Hidden layers are the next step.

---

## 8. Standard names

All books and courses use these terms. This table shows the standard name for each term in this
code.

| In this code | Standard name |
|---|---|
| the neuron in `neuron.py` | **logistic regression**, or one **neuron** with a sigmoid activation |
| switches | **one-hot encoded features** |
| the weights and the bias | **parameters** (training sets these numbers) |
| `LEARNING_RATE`, `ROUNDS` | **hyperparameters** (*you* set these numbers) |
| confidence | **predicted probability** |
| `oracle` | **labels** / **ground truth** |
| average miss | a simple **loss** (books usually use **cross-entropy loss**; our nudge rule is its gradient) |
| nudge | **gradient descent**; with one example at a time, **stochastic gradient descent (SGD)** |
| round | **epoch** |
| learning rate | **learning rate** (the same name) |
| training set and test set | **training set** / **test set** (or held-out set) |
| learned the rule, not the examples | **generalisation** |
| remembered the examples | **overfitting** |

**Is this a neural network?** Yes. It is the smallest neural network: one neuron. A large neural
network has many neurons in layers. The outputs of one layer are the switches for the next layer.
The four parts (data, model, grade, nudge) do not change when you add layers. Only the model
becomes larger. Also, the nudge must send the error back through the layers. The name of this
procedure is **backpropagation**.

---

## 9. More information

Use these sources in this sequence:

1. **3Blue1Brown, *Neural Networks*** (videos). These videos give very clear pictures of neurons,
   layers and gradient descent. Watch the first two videos after you run this code.
   https://www.3blue1brown.com/topics/neural-networks
2. **Michael Nielsen, *Neural Networks and Deep Learning*, chapter 1** (free book). This chapter
   explains sigmoid neurons and gradient descent with the same ideas as this experiment. Then it
   makes a network that reads handwritten digits.
   http://neuralnetworksanddeeplearning.com/chap1.html
3. **Google, *Machine Learning Crash Course*: logistic regression**. A short, practical
   description of the neuron in `neuron.py`.
   https://developers.google.com/machine-learning/crash-course/logistic-regression
4. **Andrej Karpathy, *The spelled-out intro to neural networks and backpropagation*** (video,
   approximately 2.5 hours). This video makes a small neural network library in Python from the
   start. Use it when you want to learn the step after this experiment: hidden layers and
   backpropagation.
   https://www.youtube.com/watch?v=VMj-3S1tku0
5. **Stanford CS231n notes: linear classification**. This source is more formal. Use it when you
   know the ideas and want the mathematics.
   https://cs231n.github.io/linear-classify/

Short references: [Logistic regression](https://en.wikipedia.org/wiki/Logistic_regression),
[Sigmoid function](https://en.wikipedia.org/wiki/Sigmoid_function),
[Gradient descent](https://en.wikipedia.org/wiki/Gradient_descent),
[One-hot](https://en.wikipedia.org/wiki/One-hot).

---

## 10. Next steps

1. **Even and odd**: one neuron, one row of weights. *This folder. Completed.*
2. **Divisible by 3**: one neuron cannot do this (test 5 in section 7). Add a hidden layer and
   make sure that it works. Backpropagation is necessary at this step.
3. **Tic-tac-toe**: the same loop. The minimax oracle from 002 gives the correct answers. Can a
   small network play better than the LLM from 002?

The four parts do not change at each step. Only the data and the model change.

## 11. Files

```
oracle.py       the correct answers: 1 if odd, 0 if even
switches.py     changes a number into a row of 40 on/off switches
neuron.py       41 weights -> a score -> squash -> a confidence between 0 and 1
grade.py        accuracy and average miss: these show the improvement
nudge.py        gradient descent, one example at a time
train.py        the data, the loop, the table of weights; run this file
LEARNINGS.md    my questions about this subject, with answers (notes for the blog)
README-STE.md   this file: README.md in Simplified Technical English
```
