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

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV uses charging spots (C1, C2) if available, otherwise medium or large spots.
- A vehicle takes the smallest size that fits, lowest-numbered spot first. EVs prefer charging spots before other spots.
- Rates per hour: bike 10, car 20, truck 50, EV 20 (base) + 10 (charging). Hours are whole numbers, at least 1.
- EVs in charging spots pay 30/hour total (20 base + 10 charging fee). EVs in regular spots pay 20/hour.
- Only EVs can use charging spots; other vehicles cannot.
- Fees are capped at 8 hours: a 10-hour stay costs the same as an 8-hour stay.
- Vehicles with a monthly pass (registered with `pass <plate>`) pay 50% of the fee, applied after the cap.
- Monthly passes can be registered before or after the vehicle parks; a pass stays valid for all future visits. Registering the same plate again is harmless.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
