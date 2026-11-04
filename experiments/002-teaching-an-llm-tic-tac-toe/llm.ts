// The LLM opponent: build a prompt from the board, ask Gemini for a move as
// structured JSON, and report whether that move was legal. Ports my-portfolio's
// tictactoe/prompt.js + ai/index.js.

import { generateText, Output } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { isLegal, type Board, type Game } from './game.ts';

// Tried in order: when one model is overloaded (a transient "high demand"
// error), we fall through to the next rather than fail the turn.
const MODELS = ['gemini-flash-latest', 'gemini-3.5-flash-lite'];

// The SDK retries twice by default and bills every attempt, so an overloaded
// model is slow to give up. One retry, then fail over to the next model.
const RETRIES_PER_MODEL = 1;

// Under "high demand" a model can hang rather than error, so cap each attempt
// and fail over instead of stalling the game.
const PER_ATTEMPT_MS = 15_000;

const SYSTEM =
    'You play tic-tac-toe. Given a board and whose turn it is, pick the strongest legal '
    + 'open cell for that mark. Keep `reason` to one short sentence a player would understand, '
    + 'under twelve words.';

// Structured output: the SDK returns a parsed object matching this schema, not
// prose we have to scrape a cell number out of.
const moveSchema = z.object({
    cell: z.number().int().min(0).max(8),
    reason: z.string(),
});

const glyph = (held: Board[number]) => held ?? '.';

const asGrid = (b: Board) => `${glyph(b[0])} | ${glyph(b[1])} | ${glyph(b[2])}
${glyph(b[3])} | ${glyph(b[4])} | ${glyph(b[5])}
${glyph(b[6])} | ${glyph(b[7])} | ${glyph(b[8])}`;

const promptFor = (game: Game) => `Cells are numbered 0-8, left to right, top to bottom.
You are playing ${game.turn}.

${asGrid(game.board)}.`;

export interface LlmMove {
    cell: number;
    reason: string;
    illegal: boolean;
}

export const askModel = async (modelId: string, game: Game) =>
    generateText({
        model: google(modelId),
        system: SYSTEM,
        prompt: promptFor(game),
        output: Output.object({ schema: moveSchema }),
        maxRetries: RETRIES_PER_MODEL,
        abortSignal: AbortSignal.timeout(PER_ATTEMPT_MS),
    });

export const llmMove = async (game: Game): Promise<LlmMove> => {
    let lastError: unknown;
    for (const modelId of MODELS) {
        try {
            const { output } = await askModel(modelId, game);
            // A well-formed move can still be illegal — the model names a taken
            // cell. We surface that rather than hide it.
            return { cell: output.cell, reason: output.reason, illegal: !isLegal(game, output.cell) };
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
};
