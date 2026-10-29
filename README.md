# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging, EVs only).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |
| `pass <plate>` | `PASS <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large.
- An EV takes a free charging spot first (C1 before C2); if both are taken it parks where a car would. Other vehicles never use charging spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, ev 20 (plus 10 more per hour while in a charging spot). Hours are whole numbers, at least 1.
- No stay is charged for more than 8 hours (a 10-hour stay costs the same as 8). A plate with a monthly pass pays half the fee, applied after the cap. Both rules apply to `leave` and `quote`.
- `pass` registers a monthly pass for the plate, before or after it parks; it stays valid for later visits. Registering again is harmless and prints the same line.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
