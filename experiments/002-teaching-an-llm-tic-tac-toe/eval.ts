// Dead-simple eval: run a handful of positions through the model, grade each
// move against the minimax oracle, and print how it did. One model, one prompt,
// one pass — just enough to see the idea working.

import { askModel } from './llm.ts';
import { bestMoves, grade } from './minimax.ts';
import { type Game, type Mark } from './game.ts';

try { process.loadEnvFile(); } catch { /* key may already be in the env */ }

const MODEL = 'gemini-3.5-flash-lite';

// A live position: a 9-char board ('X' / 'O' / '.') and whose turn it is.
const position = (cells: string, turn: Mark, intent: string) => ({
    intent,
    game: {
        board: [...cells].map((c) => (c === 'X' || c === 'O' ? c : null)),
        turn, winner: null, over: false,
    } as Game,
});

// Four positions, one clear idea each (optimal sets vetted against the oracle).
const POSITIONS = [
    position('XX.OO....', 'X', 'win-now: complete the top row at 2 (not just block O)'),
    position('O.XO....X', 'X', 'two-ways-to-win: 5 wins the 2-5-8 column, 6 also forces it'),
    position('.X.XO.O..', 'X', 'must-block: O threatens 2 on the 2-4-6 diagonal'),
    position('XOXOX.OXO', 'X', 'near-full: 5 is the only legal cell'),
];

const run = async () => {
    let optimal = 0;
    for (const { intent, game } of POSITIONS) {
        console.log(`\n${intent}`);
        try {
            const { output } = await askModel(MODEL, game);
            const result = grade(game, output.cell);
            if (result === 'optimal') optimal++;
            console.log(`  model played ${output.cell} ("${output.reason}")`);
            console.log(`  optimal: {${bestMoves(game).join(', ')}}  ->  ${result}`);
        } catch (error) {
            // One flaky call shouldn't sink the run — note it and carry on.
            console.log(`  call failed: ${(error as Error).message}`);
        }
    }
    console.log(`\n${optimal}/${POSITIONS.length} optimal`);
};

run();
