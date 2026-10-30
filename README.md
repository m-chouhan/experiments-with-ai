# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |
| `pass <plate>` | `PASS <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV uses charging spots first (C1, C2), then medium or large spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, EV 20 + 10 (if in charging spot). Hours are whole numbers, at least 1.
- Monthly pass registration: `pass <plate>` registers a pass for a vehicle (idempotent, valid for all future visits).
- Fee caps and passes: no stay is charged for more than 8 hours; vehicles with a pass pay half the fee (discount applied after the cap).
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
