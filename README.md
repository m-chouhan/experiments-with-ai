# Parking lot

Reads commands from stdin, one per line, and prints one line per command.

    node main.js < commands.txt

Spots: S1 S2 (small), M1 M2 M3 (medium), L1 (large), C1 C2 (charging).

| command | output |
|---|---|
| `pass <plate>` | `PASS <plate>` |
| `park <plate> <bike\|car\|truck\|ev>` | `PARKED <plate> <spot>`, `ALREADY PARKED <plate>`, `FULL <plate>` |
| `leave <plate> <hours>` | `LEFT <plate> <spot> FEE <fee>`, `NOT FOUND <plate>` |
| `quote <plate> <hours>` | `QUOTE <plate> FEE <fee>`, `NOT FOUND <plate>` |

- **Monthly pass**: `pass <plate>` registers a monthly pass for a vehicle. Registering the same plate again is harmless and prints the same line. A pass can be registered before or after the vehicle parks.
- A bike fits small, medium or large spots; a car or EV medium, large, or charging spots; a truck only large.
- A vehicle takes the smallest size that fits, lowest-numbered spot first.
- An EV takes a free charging spot first (C1 before C2). If both are taken, it parks like a car.
- Other vehicles never use charging spots.
- **Rates per hour**: bike 10, car 20, truck 50, EV 20 (+ 10 if in a charging spot).
- **Fee cap**: No stay is charged for more than 8 hours. A 10-hour stay costs the same as an 8-hour stay.
- **Pass discount**: Vehicles with a monthly pass pay half the fee, applied after the cap.
- Hours are whole numbers, at least 1.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
