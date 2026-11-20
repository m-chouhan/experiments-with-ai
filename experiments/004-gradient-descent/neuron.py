# THE NEURON: one weight per switch, plus a bias. Switches in, one confidence out.
#
# This is a single neuron. All 40 switches feed into the same sum, and there's one
# answer at the end.

import math

from switches import SWITCH_COUNT


class Neuron:
    def __init__(self):
        self.weights = [0.0] * SWITCH_COUNT   # one weight per switch, all start at 0
        self.bias = 0.0                     # 1 extra number, tied to no switch

    def score(self, switches):
        """The bias, plus each weight times its switch. An off switch adds weight x 0 = nothing,
        so only the 4 weights whose switches are on have any say."""
        total = self.bias
        for weight, switch in zip(self.weights, switches):
            total += weight * switch
        return total

    def confidence(self, switches):
        """How sure it is that the number is odd: 0 = surely even, 0.5 = no idea, 1 = surely odd."""
        return squash(self.score(switches))

    def guess(self, switches):
        """Its actual answer: 1 for odd, 0 for even."""
        return 1 if self.confidence(switches) > 0.5 else 0


def squash(score):
    """Squeeze any score, however big or small, into 0..1. Proper name: the sigmoid."""
    return 1 / (1 + math.exp(-score))
