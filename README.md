# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV uses charging spots or medium/large spots.
- A vehicle takes the smallest/preferred size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, EV 20 (plus 10/hour charging fee if in charging spot).
- Electric vehicles prefer charging spots (C1 before C2). If both are taken, they park in medium or large spots.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
