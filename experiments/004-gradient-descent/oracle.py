# THE ORACLE: the answer key.
#
# Something we already trust to give the right answer. The neuron never sees this code;
# it only ever sees a number and the answer that comes back.


def oracle(number):
    """1 if the number is odd, 0 if it's even."""
    return number % 2
