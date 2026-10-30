# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: C1 C2 (charging), S1 S2 (small), M1 M2 M3 (medium), L1 (large).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |
| `pass <plate>` | `PASS <plate>` |

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV fits medium or large spots (or charging spots).
- An EV prefers a free charging spot (C1 before C2). If both charging spots are full, it parks in a regular spot.
- Other vehicles never use charging spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, ev 20. EVs in charging spots also pay 10/hour charging fee.
- A monthly pass can be registered with `pass <plate>`. Registering the same plate again is harmless.
- No stay is charged for more than 8 hours: a 10-hour stay costs the same as an 8-hour stay.
- Vehicles with a pass pay half the fee, applied after the 8-hour cap.
- Hours are whole numbers, at least 1.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
