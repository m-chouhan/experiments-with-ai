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

- A bike fits small, medium or large spots; a car and EV fit medium or large; a truck only large.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- EVs prefer charging spots C1 and C2 (in that order). If both are taken, an EV parks in a regular medium or large spot.
- Other vehicles never use charging spots.
- Rates per hour: bike 10, car 20, truck 50, EV 20 base + 10 charging fee while in a charging spot. Hours are whole numbers, at least 1.
- Monthly passes: `pass <plate>` registers a monthly pass for a vehicle. Registering the same plate again is harmless. A pass can be registered before or after the vehicle parks, and stays valid for later visits.
- Fee cap: no stay is charged for more than 8 hours. A 10-hour stay costs the same as an 8-hour stay.
- Pass discount: vehicles with a pass pay half the fee, applied after the fee cap.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
