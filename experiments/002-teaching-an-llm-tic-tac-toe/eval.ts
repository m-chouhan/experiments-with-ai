// Eval: run a suite of fixed positions through the model, grade each move
// against the minimax oracle, and compare the model's optimal-rate to a
// random-legal baseline — overall and sliced by position type.

import { askModel } from './llm.ts';
import { bestMoves, grade } from './minimax.ts';
import { legalMoves, play, type Game, type Mark } from './game.ts';

try { process.loadEnvFile(); } catch { /* key may already be in the env */ }

const MODEL = 'gemini-3.5-flash-lite';

// The model is stochastic, so sample each position a few times and report a rate.
const TRIALS = 3;

// Gemini's free tier allows ~15 requests/minute. Space calls out so a full run
// stays under that instead of failing half its trials on quota errors.
const DELAY_MS = 4500;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A live position: a 9-char board ('X' / 'O' / '.') and whose turn it is.
const position = (cells: string, turn: Mark): Game => ({
    board: [...cells].map((c) => (c === 'X' || c === 'O' ? c : null)),
    turn, winner: null, over: false,
});

// Twelve positions, X to move, generated and vetted so each is discriminating:
// its optimal set is a strict subset of the legal moves.
const POSITIONS = [
    position('X.OXOO.X.', 'X'),
    position('XOXX.O..O', 'X'),
    position('OX.OX....', 'X'),
    position('XX..O..O.', 'X'),
    position('...OO.XX.', 'X'),
    position('O...O.XX.', 'X'),
    position('..XO.O..X', 'X'),
    position('X....XO.O', 'X'),
    position('.X.XO..O.', 'X'),
    position('XXOO.....', 'X'),
    position('OXX....O.', 'X'),
    position('O....X...', 'X'),
];

// Show the board: filled cells as their mark, empty cells as their index.
const show = (game: Game): string => {
    const c = (i: number) => game.board[i] ?? String(i);
    const r = (a: number, b: number, d: number) => `${c(a)} ${c(b)} ${c(d)}`;
    return `      ${r(0, 1, 2)}\n      ${r(3, 4, 5)}\n      ${r(6, 7, 8)}`;
};

const pct = (x: number): string => `${Math.round(100 * x)}%`;
const avg = (xs: number[]): number => xs.reduce((sum, x) => sum + x, 0) / xs.length;

// Does the side to move have an immediate winning move? Used only to label each
// position "win-available" vs "no-immediate-win" for the per-type slice.
const winAvailable = (game: Game): boolean =>
    legalMoves(game).some((cell) => play(game, cell).winner?.mark === game.turn);

// A random-legal player picks uniformly among legal moves, so its chance of an
// optimal move is just the share of legal moves that are optimal — exact, no
// sampling. This is the baseline the model must beat to show it isn't guessing.
const randomOptimalRate = (game: Game): number =>
    bestMoves(game).length / legalMoves(game).length;

interface Result { type: string; modelRate: number; randomRate: number; hasData: boolean; }

const run = async () => {
    const results: Result[] = [];

    for (const [i, game] of POSITIONS.entries()) {
        const type = winAvailable(game) ? 'win-available' : 'no-immediate-win';
        console.log(`\n#${i + 1}  (${type}, ${game.turn} to move)`);
        console.log(show(game));
        console.log(`  optimal cells: {${bestMoves(game).join(', ')}}  of legal {${legalMoves(game).join(', ')}}`);

        let optimal = 0;
        let done = 0;
        for (let trial = 1; trial <= TRIALS; trial++) {
            try {
                const { output } = await askModel(MODEL, game);
                const result = grade(game, output.cell);
                if (result === 'optimal') optimal++;
                done++;
                console.log(`    trial ${trial}: played ${output.cell}  ->  ${result}`);
            } catch (error) {
                // One flaky call shouldn't sink the run — note it and carry on.
                console.log(`    trial ${trial}: call failed (${(error as Error).message})`);
            }
            await sleep(DELAY_MS);
        }

        const hasData = done > 0;
        const modelRate = hasData ? optimal / done : 0;
        const randomRate = randomOptimalRate(game);
        results.push({ type, modelRate, randomRate, hasData });
        console.log(hasData
            ? `  optimal-rate  —  model: ${optimal}/${done} (${pct(modelRate)})   random-legal: ${pct(randomRate)}`
            : '  no successful trials (all calls failed) — excluded from averages');
    }

    const summarise = (label: string, rs: Result[]) => {
        const withData = rs.filter((r) => r.hasData);
        if (withData.length === 0) return;
        console.log(`  ${label.padEnd(18)} model ${pct(avg(withData.map((r) => r.modelRate)))}   random-legal ${pct(avg(withData.map((r) => r.randomRate)))}   (n=${withData.length})`);
    };

    console.log('\noptimal-rate, averaged over positions:');
    summarise('overall', results);
    summarise('win-available', results.filter((r) => r.type === 'win-available'));
    summarise('no-immediate-win', results.filter((r) => r.type === 'no-immediate-win'));
};

run();
