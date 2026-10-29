# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `pass <plate>` | `PASS <plate>` |
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV uses charging spots C1 or C2, falling back to medium or large if both are full.
- A vehicle takes the smallest size that fits, lowest-numbered spot first. EVs prefer charging spots in order (C1 before C2).
- Rates per hour: bike 10, car 20, truck 50, EV 20 + 10 (charging fee) if in a charging spot, else 20.
- Monthly passes: register with `pass <plate>`. Registering the same plate again is harmless. A pass can be registered before or after parking and stays valid for later visits.
- Fee cap: no stay is charged more than 8 hours.
- Pass discount: vehicles with a monthly pass pay half the fee, applied after the cap.
- These cap and discount rules apply to every fee reported by `leave` and `quote`.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
