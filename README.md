# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large).

| command | output |
|---|---|
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |
| `pass <plate>` | `PASS <plate>` |

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV charging or medium/large spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first. EVs use charging spots C1, C2 before falling back to medium/large.
- Rates per hour: bike 10, car 20, truck 50, EV 20 (plus 10/hour if in charging spot). Hours are whole numbers, at least 1.
- Monthly pass: `pass <plate>` registers a pass for a vehicle. Registering the same plate again is harmless. A pass can be registered before or after the vehicle parks.
- Fee cap: No stay is charged for more than 8 hours. A 10-hour stay costs the same as an 8-hour stay.
- Pass discount: Vehicles with a pass pay half the fee (applied after the cap).
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
