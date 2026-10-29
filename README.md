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

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV takes charging or medium/large spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first. EVs prefer charging spots.
- Rates per hour: bike 10, car 20, truck 50, EV 20 (plus 10 charging fee if in a charging spot). Hours are whole numbers, at least 1.
- Monthly pass: register a plate with `pass <plate>`. Plates with passes pay half the fee. A pass can be registered before or after the vehicle parks.
- Maximum stay fee: any stay longer than 8 hours is charged as 8 hours. Pass discount applies after the cap.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
