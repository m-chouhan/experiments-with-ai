# THE LOOP: data -> grade -> nudge on every example -> grade again -> repeat.
#   python3 train.py

import random

from grade import accuracy, average_miss
from neuron import Neuron, squash
from nudge import nudge
from oracle import oracle
from switches import DIGIT_PLACES, DIGIT_VALUES, switch_for, switch_label, switches_for

LEARNING_RATE = 0.1   # how big each nudge is
ROUNDS = 5            # how many times to go through all the training examples

# Data: 3000 different numbers. Each example is a pair: the switches for that number,
# and the oracle's answer for it.
rng = random.Random(0)
numbers = rng.sample(range(10_000), 3000)
examples = [(switches_for(number), oracle(number)) for number in numbers]

train = examples[:2000]   # to learn from
test = examples[2000:]    # never learned from; checks it found the rule, not the answers

neuron = Neuron()

print('a few examples from the data:')
for number in numbers[:3]:
    print(f'  {number:04d} -> {"odd" if oracle(number) else "even"}')
print()


def report(label):
    print(f'{label:>8}   train {accuracy(neuron, train):6.1%}   test {accuracy(neuron, test):6.1%}'
          f'   average miss {average_miss(neuron, test):.3f}')


def explain(number):
    """Show the sum for one number: the bias, plus the weights of its 4 on switches."""
    switches = switches_for(number)
    on = [switch_number for switch_number, switch in enumerate(switches) if switch == 1]
    score = neuron.score(switches)

    print(f'\n{number:04d}:')
    print(f'    {"bias":<26}{neuron.bias:+7.2f}')
    for switch_number in on:
        weight = f'weight for "{switch_label(switch_number)}"'
        print(f'  + {weight:<26}{neuron.weights[switch_number]:+7.2f}')
    print(f'  = {"score":<26}{score:+7.2f}')
    print(f'    {"confidence = squash(score)":<26}{squash(score):7.2f}'
          f'   ->  guess: {"odd" if neuron.guess(switches) else "even"}')


report('before')   # every weight is 0, so it says 0.5 for everything: no idea yet
explain(4817)

for round_number in range(1, ROUNDS + 1):
    rng.shuffle(train)
    for switches, answer in train:
        # The three steps of learning, on one example: guess, see how wrong, move the weights.
        confidence = neuron.confidence(switches)
        miss = confidence - answer
        nudge(neuron, switches, miss, LEARNING_RATE)
    report(f'round {round_number}')

# What did it learn? Read the weights: one row per digit place, one column per digit value.
print('\n' + 'weights'.ljust(9) + ''.join(f'{digit:>7}' for digit in range(DIGIT_VALUES)))
for place in range(DIGIT_PLACES):
    row = [neuron.weights[switch_for(place, digit)] for digit in range(DIGIT_VALUES)]
    print(f'  digit {place + 1}' + ''.join(f'{weight:+7.1f}' for weight in row))
print(f'  bias   {neuron.bias:+7.2f}')

explain(4817)
