# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV medium or large.
- A vehicle takes the smallest size that fits, lowest-numbered spot first. For EVs, this means charging spots (C1 before C2) are prioritized.
- If both charging spots are taken, an EV parks in a regular medium or large spot.
- Other vehicles never use charging spots.
- Rates per hour: bike 10, car 20, truck 50, EV 20. EVs in charging spots pay an additional 10/hour charging fee.
- Hours are whole numbers, at least 1.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
