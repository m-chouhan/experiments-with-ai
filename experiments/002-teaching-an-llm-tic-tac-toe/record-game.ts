// Play one honest end-to-end game — X is a perfect (minimax) opponent, O is the
// LLM — and record every detail of each turn: for the model's moves, the exact
// prompt sent, the raw response, the latency, legality, and the oracle's grade.
// Writes a transcript JSON the blog animation is built from. Nothing here is
// faked: the board, the prompts, the replies and the timings are all real.

import { writeFileSync } from 'node:fs';
import { newGame, play, forfeit, isDraw, type Board, type Game } from './game.ts';
import { bestMoves, grade } from './minimax.ts';
import { SYSTEM, promptFor, askModel } from './llm.ts';

try { process.loadEnvFile(); } catch { /* key may already be in env */ }

const MODEL = 'gemini-3.5-flash-lite'; // what the eval pins to (see LEARNINGS §eval)
const pick = <T>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

type Ply = {
    n: number;
    player: 'X' | 'O';
    cell: number;
    boardBefore: Board;
    boardAfter: Board;
    bestMoves: number[];
    grade: ReturnType<typeof grade>;
    // model-only fields:
    prompt?: string;
    rawResponse?: string;
    reason?: string;
    latencyMs?: number;
    legal?: boolean;
};

const main = async () => {
    let game = newGame();
    const plies: Ply[] = [];
    let n = 0;
    let result = '';

    while (!game.over) {
        n += 1;
        const boardBefore = game.board;
        const best = bestMoves(game);

        if (game.turn === 'X') {
            // Perfect opponent: play one of the optimal cells.
            const cell = pick(best);
            game = play(game, cell);
            plies.push({ n, player: 'X', cell, boardBefore, boardAfter: game.board, bestMoves: best, grade: 'optimal' });
            continue;
        }

        // O's turn — the LLM. Capture the real prompt, reply, timing and grade.
        const prompt = promptFor(game);
        const t0 = performance.now();
        const { output, text } = await askModel(MODEL, game);
        const latencyMs = Math.round(performance.now() - t0);
        const g = grade(game, output.cell);
        const legal = g !== 'illegal';

        plies.push({
            n, player: 'O', cell: output.cell, boardBefore,
            boardAfter: legal ? play(game, output.cell).board : game.board,
            bestMoves: best, grade: g, prompt, rawResponse: text,
            reason: output.reason, latencyMs, legal,
        });

        console.log(`#${n} O plays ${output.cell} (${g}, ${latencyMs}ms) — "${output.reason}"`);
        if (!legal) { result = 'O forfeits — illegal move'; game = forfeit(game); break; }
        game = play(game, output.cell);
    }

    if (!result) {
        result = game.winner ? (game.winner.mark === 'X' ? 'X (perfect play) wins' : 'O (the LLM) wins') : 'draw';
    }

    const transcript = { model: MODEL, xPlayer: 'minimax-optimal', system: SYSTEM, result, plies };
    writeFileSync(new URL('./data/game-transcript.json', import.meta.url), JSON.stringify(transcript, null, 2));
    console.log(`\nResult: ${result}  (${plies.length} plies, ${plies.filter((p) => p.player === 'O').length} model calls)`);
};

main().catch((e: unknown) => { console.error(e); process.exitCode = 1; });
