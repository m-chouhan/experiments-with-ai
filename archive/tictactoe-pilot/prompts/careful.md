Add configurable board size and win length to this tic-tac-toe CLI.

Requirements:
- New flags: `--size N` (board is N×N, default 3) and `--win K` (K consecutive marks in a row, column or diagonal wins; default equals the board size).
- Valid values: size 3–10, win 3–size. Existing behaviour with no new flags must not change.
- Moves are 0-indexed `row col` and must be validated against the chosen board size (out-of-range or occupied cells print `INVALID` and do not consume the turn).
- The AI opponent (`--ai X|O`) must still win-if-it-can, then block, on any board size and win length.
- Scores persistence and the output format (board rendering, `WINNER X` / `DRAW` / `INCOMPLETE`, `SCORES ...` line) stay as they are.

Before you finish, run `node main.js` by hand with a few moves piped in to confirm both the default and a `--size 5 --win 3` game behave correctly.
