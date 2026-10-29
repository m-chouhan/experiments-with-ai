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

- A bike fits small, medium or large spots; a car medium or large; a truck only large.
- An EV fits medium or large spots, but prefers free charging spots (C1, C2) first.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, EV 20. Hours are whole numbers, at least 1.
- EVs pay a 10/hour charging fee while parked in a charging spot (C1 or C2), in addition to the base rate.
- No stay is charged for more than 8 hours: a 10-hour stay costs the same as an 8-hour stay.
- Vehicles with a monthly pass pay half the fee, applied after the hour cap.
- A pass can be registered before or after a vehicle parks, and stays valid for all future visits.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
