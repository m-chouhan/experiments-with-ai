# NUDGE: gradient descent, for one example.
#
# Someone else has already worked out how wrong the neuron was. This moves each weight
# a little in the direction that would have made it less wrong. Do that for thousands
# of examples and the weights end up somewhere useful.


def nudge(neuron, switches, miss, learning_rate):
    """Move every weight a little, against the miss.

    `miss` is how wrong the neuron was and which way it leaned:
    above 0 it said "odd" too strongly, below 0 not strongly enough.
    """
    for switch_number, switch in enumerate(switches):
        # An off switch (0) had no hand in this answer, so its weight moves by 0.
        # An on switch (1) moves its weight by learning_rate x miss, against the miss.
        neuron.weights[switch_number] -= learning_rate * miss * switch

    # The bias is in every answer, so it always moves.
    neuron.bias -= learning_rate * miss

    # Why `miss x switch`? It's what calculus says is the downhill direction for this neuron.
    # You don't need to derive it to use it: "blame each weight in proportion to how
    # much it took part" is the whole idea.
