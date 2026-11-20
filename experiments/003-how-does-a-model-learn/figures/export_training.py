# Replays playground.py's 'all digits' run (SEED 7) and saves a snapshot after every mistake.
import json, random, sys

def switches_for(n):
    s = [0] * 40
    for place, d in enumerate(f'{n:04d}'):
        s[place * 10 + int(d)] = 1
    return s

def acc(w, b):
    return sum(((b + sum(w[i] for i, x in enumerate(switches_for(n)) if x)) > 0) == bool(n % 2) for n in range(10000)) / 10000

rng = random.Random(7)
examples = [rng.randrange(10000) for _ in range(2000)]
w, b, snaps = [0] * 40, 0, []
for seen, n in enumerate(examples, 1):
    sw = switches_for(n)
    total = b + sum(w[i] for i in range(40) if sw[i])
    if (1 if total > 0 else 0) != n % 2:
        nudge = 1 if n % 2 else -1
        for i in range(40):
            w[i] += nudge * sw[i]
        b += nudge
        snaps.append({'seen': seen, 'number': n, 'total': total, 'nudge': nudge, 'weights': w[:], 'bias': b, 'accuracy': acc(w, b)})
json.dump(snaps, open(sys.argv[1], 'w'))
print(len(snaps), snaps[-1]['seen'], snaps[-1]['accuracy'], snaps[-1]['weights'][30:])
