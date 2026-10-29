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

- A bike fits small, medium or large spots; a car medium or large; a truck only large. An EV takes a free charging spot first (C1 before C2), otherwise parks like a car. Only EVs use charging spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, ev 20. An EV in a charging spot pays an extra 10 per hour for charging. Hours are whole numbers, at least 1.
- No stay is charged for more than 8 hours (a 10-hour stay costs the same as 8). A plate with a monthly pass (`pass`) pays half the fee, applied after the cap. A pass can be registered before or after parking, is idempotent, and stays valid for later visits. This applies to both `leave` and `quote`.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
