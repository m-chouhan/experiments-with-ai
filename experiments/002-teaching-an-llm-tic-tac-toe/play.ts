// Console loop: you are X, Gemini (O) is the LLM. Print the board, take your
// move or the model's, until someone wins, it's a draw, or the model forfeits.

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { forfeit, isDraw, isLegal, legalMoves, newGame, play, type Game } from './game.ts';
import { llmMove } from './llm.ts';

// Load the API key from a local .env if present; fine if there's none — it may
// already be in the environment.
try {
    process.loadEnvFile();
} catch {
    // no .env; carry on
}

const HUMAN = 'X';
const LLM = 'O';

const render = (game: Game) => {
    const cell = (i: number) => game.board[i] ?? String(i);
    const row = (a: number, b: number, c: number) => ` ${cell(a)} | ${cell(b)} | ${cell(c)} `;
    console.log(`\n${row(0, 1, 2)}\n---+---+---\n${row(3, 4, 5)}\n---+---+---\n${row(6, 7, 8)}\n`);
};

const humanMove = async (rl: ReturnType<typeof createInterface>, game: Game): Promise<number> => {
    const open = legalMoves(game);
    while (true) {
        const answer = await rl.question(`Your move (${open.join(', ')}): `);
        const cell = Number(answer.trim());
        if (isLegal(game, cell)) return cell;
        console.log('  Not an open cell — try again.');
    }
};

// An API failure throws here and propagates to the boundary in main(), not the
// game loop — keeping a failed call distinct from an illegal move (a forfeit).
const llmTurn = async (game: Game): Promise<Game> => {
    const move = await llmMove(game);
    console.log(`${LLM} (Gemini) plays ${move.cell} — "${move.reason}"`);
    if (move.illegal) {
        console.log(`  ⚠ cell ${move.cell} is already taken — it forfeits.`);
        return forfeit(game);
    }
    return play(game, move.cell);
};

const announce = (game: Game) => {
    if (game.winner) {
        console.log(game.winner.mark === HUMAN ? 'You win!' : 'The LLM wins.');
    } else if (isDraw(game)) {
        console.log("It's a draw.");
    }
};

const main = async () => {
    const rl = createInterface({ input, output });

    try {
        let game = newGame();
        console.log('Tic-tac-toe — you are X, Gemini is O.');

        while (!game.over) {
            render(game);
            game = game.turn === HUMAN
                ? play(game, await humanMove(rl, game))
                : await llmTurn(game);
        }

        render(game);
        announce(game);
    } finally {
        rl.close();
    }
};

main().catch((error: unknown) => {
    console.error(`\nSomething went wrong: ${(error as Error).message}`);
    process.exitCode = 1;
});
