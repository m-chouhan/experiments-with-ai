# SWITCHES: what the neuron sees.
#
# A neuron can't read "4817". It reads a row of switches, each one on (1) or off (0).
# Every digit place gets its own block of 10 switches, one per possible digit, and we
# turn on the one that matches:
#
#   4817  ->  digit 1:  0 0 0 0 1 0 0 0 0 0      (it's a 4)
#             digit 2:  0 0 0 0 0 0 0 0 1 0      (it's an 8)
#             digit 3:  0 1 0 0 0 0 0 0 0 0      (it's a 1)
#             digit 4:  0 0 0 0 0 0 0 1 0 0      (it's a 7)
#
# Laid end to end that's 40 switches, and that row of 40 numbers is the neuron's input.
# Whatever the number, exactly 4 of them are on and the other 36 are off.

DIGIT_PLACES = 4
DIGIT_VALUES = 10
SWITCH_COUNT = DIGIT_PLACES * DIGIT_VALUES   # 40


def switch_for(place, digit):
    """Which switch in the row of 40 means "the digit in this place is `digit`".

    Place 0 is the first digit, so its 10 switches are 0..9, place 1's are 10..19,
    and so on. "digit 4 is 7" is switch 3 * 10 + 7 = 37.
    """
    return place * DIGIT_VALUES + digit


def switches_for(number):
    """A number -> its row of 40 switches, as a list of 0s and 1s."""
    switches = [0] * SWITCH_COUNT
    for place, digit in enumerate(f'{number:04d}'):
        switches[switch_for(place, int(digit))] = 1
    return switches


def switch_label(switch):
    """A switch's number -> words, for printing. 37 -> 'digit 4 is 7'."""
    place, digit = divmod(switch, DIGIT_VALUES)
    return f'digit {place + 1} is {digit}'
