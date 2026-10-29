# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `pass <plate>` | `PASS <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV takes a charging spot first (C1 before C2), then falls back to medium or large spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, EV 20 (plus 10/hour if charging).
- Other vehicles never use charging spots.
- Hours are whole numbers, at least 1.
- No stay is charged for more than 8 hours: a 10-hour stay costs the same as an 8-hour stay.
- Vehicles with a monthly pass pay half the fee (applied after the 8-hour cap).
- A pass is registered with `pass <plate>` and stays valid for later visits. Registering the same plate again is harmless.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
