# GRADE: compare the neuron with the oracle.
#
# Nothing here changes the neuron. These two numbers are just how we watch it improve.
# An example is a pair: the switches for one number, and the oracle's answer for it.


def accuracy(neuron, examples):
    """How often the neuron's guess matches the oracle's answer."""
    right = 0
    for switches, answer in examples:
        if neuron.guess(switches) == answer:
            right += 1
    return right / len(examples)


def average_miss(neuron, examples):
    """How far the confidence is from the answer, on average.
    0 = perfect and sure, 0.5 = no idea, 1 = sure and wrong.

    The miss used for learning keeps its sign, because the nudge needs to know which way
    the neuron leaned. Here we only want a size, so the sign is dropped."""
    total = 0.0
    for switches, answer in examples:
        total += abs(neuron.confidence(switches) - answer)
    return total / len(examples)
