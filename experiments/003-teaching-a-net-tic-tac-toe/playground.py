# PLAYGROUND: the whole blog post (blog.md) in one file, to read and to mess with.
#   python3 playground.py
#
# One neuron, the "fix your mistakes" rule, and nothing else. No libraries.
# The knobs are right below. Change one, run it again, and see what happens.

import random

# ---- Knobs ---------------------------------------------------------------------------------

# What should the neuron learn? Any function of a number 0..9999 that returns 1 or 0.
def rule(number):
    return number % 2                   # is it odd?
    # return 1 if number % 3 == 0 else 0  # divisible by 3? (one neuron can't do this one)
    # return 1 if number >= 5000 else 0   # big or small? (easy, even with INPUTS = 'number')

# What does the neuron get to see? This is the "choose the inputs" part of the post.
#   'number'      one input: the number itself. A straight line, so about 50% on odd/even.
#   'last digit'  10 switches, one per possible last digit.
#   'all digits'  40 switches, 10 for each of the 4 digits. It has to find the last digit itself.
INPUTS = 'all digits'

EXAMPLES = 2000     # how many numbers to learn from
SEED = 7            # change it for a different shuffle of examples


# ---- The neuron ------------------------------------------------------------------------------

def neuron(inputs, weights, bias):
    total = bias + sum(w * x for w, x in zip(weights, inputs))
    return total > 0          # fire, or don't


# ---- What it sees ----------------------------------------------------------------------------

def switches_for(number):
    """A number -> the list of inputs the neuron sees, depending on INPUTS."""
    if INPUTS == 'number':
        return [number / 9999]                        # squeezed into 0..1 to keep the nudges sane
    digits = f'{number:04d}' if INPUTS == 'all digits' else f'{number % 10}'
    switches = [0] * (10 * len(digits))
    for place, digit in enumerate(digits):
        switches[place * 10 + int(digit)] = 1         # "digit 4 is 7" is switch 37
    return switches


def accuracy(weights, bias):
    """How many of all 10,000 numbers it gets right, including the ones it never saw."""
    right = sum(neuron(switches_for(n), weights, bias) == bool(rule(n)) for n in range(10_000))
    return right / 10_000


# ---- Training: guess, check, nudge on a mistake ----------------------------------------------

rng = random.Random(SEED)
examples = [rng.randrange(10_000) for _ in range(EXAMPLES)]

weights, bias = [0] * len(switches_for(0)), 0
mistakes = 0

print(f'inputs: {INPUTS} ({len(weights)} weights + 1 bias, all starting at 0)')
print(f'before training: right on {accuracy(weights, bias):.1%} of all 10,000 numbers\n')

for seen, number in enumerate(examples, start=1):
    switches = switches_for(number)
    answer = rule(number)
    guess = 1 if neuron(switches, weights, bias) else 0
    if guess != answer:
        mistakes += 1
        nudge = +1 if answer == 1 else -1             # which way it was wrong
        for i in range(len(weights)):
            weights[i] += nudge * switches[i]         # only switches that were on move
        bias += nudge
    if seen in (10, 50, 100, 500, EXAMPLES):
        print(f'after {seen:>5} examples: {mistakes:>4} mistakes so far, '
              f'right on {accuracy(weights, bias):.1%} of all 10,000')


# ---- Reading its mind ------------------------------------------------------------------------

print(f'\nbias: {bias:+}')
if INPUTS == 'number':
    print(f'weight: {weights[0]:+.2f}   (one straight cut: every number on one side of a single point gets the same answer)')
else:
    print('weights (rows: digit place, columns: digit value):\n')
    print('          ' + ''.join(f'{v:>5}' for v in range(10)))
    for place in range(len(weights) // 10):
        row = weights[place * 10:place * 10 + 10]
        print(f'  digit {place + 1}' + ''.join(f'{w:>+5}' if w else '    0' for w in row))


def explain(number):
    """Show the sum for one number: the bias, plus the weights of its switches that are on."""
    switches = switches_for(number)
    total = bias + sum(w * x for w, x in zip(weights, switches))
    on = [i for i, x in enumerate(switches) if x]
    parts = ' '.join(f'{weights[i] * switches[i]:+g}' for i in on)
    print(f'  {number:04d}: bias {bias:+} {parts} = {total:+g}  ->  '
          f'{"odd/yes" if total > 0 else "even/no"}, answer: {"odd/yes" if rule(number) else "even/no"}')


print('\na few numbers, explained:')
for number in (4817, 6890, 1234, 9999):
    explain(number)
