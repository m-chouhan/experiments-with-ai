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

- A bike fits small, medium or large spots; a car medium or large; a truck only large; an EV prefers charging spots first, then falls back to medium or large spots.
- A vehicle takes the smallest size that fits (or preferred type for EVs), lowest-numbered spot first.
- Rates per hour: bike 10, car 20, truck 50, EV 20 base (plus 10/hour charging fee if in a charging spot).
- Hours are whole numbers, at least 1.
- **Monthly passes**: The `pass <plate>` command registers a monthly pass for a vehicle. Registering the same plate multiple times is harmless. A pass can be registered before or after a vehicle parks and remains valid for all subsequent visits.
- **Fee cap**: No stay is charged for more than 8 hours (e.g., a 10-hour stay costs the same as an 8-hour stay).
- **Pass discount**: Vehicles with a monthly pass pay half the calculated fee (50% discount), applied after the 8-hour cap.
- Anything malformed (unknown command or vehicle, wrong number of words, bad hours) prints `INVALID`. Blank lines are ignored.
