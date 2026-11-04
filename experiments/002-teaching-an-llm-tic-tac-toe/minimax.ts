// Minimax oracle for grading moves — not a gameplay opponent. Tic-tac-toe has
// far fewer than 9! reachable states, so plain recursion is instant and needs
// no memoization. Reuses the rules engine in game.ts.

import { isLegal, legalMoves, play, type Game, type Mark } from './game.ts';

// Value of `game` from `mark`'s perspective, with optimal play by both sides:
// +1 this mark wins, 0 draw, -1 this mark loses.
const value = (game: Game, mark: Mark): number => {
    if (game.winner) return game.winner.mark === mark ? 1 : -1;
    if (game.over) return 0; // full board, no winner — a draw
    const scores = legalMoves(game).map((cell) => value(play(game, cell), mark));
    return game.turn === mark ? Math.max(...scores) : Math.min(...scores);
};

// The best value the side to move can force from here.
const bestValue = (game: Game): number => {
    const gameOutcomes = legalMoves(game).map((cell) => value(play(game, cell), game.turn));
    return Math.max(...gameOutcomes);
}

// Every move that achieves that best value — any of these counts as optimal.
export const bestMoves = (game: Game): number[] =>
    legalMoves(game).filter((cell) => value(play(game, cell), game.turn) === bestValue(game));

export type Grade = 'illegal' | 'optimal' | 'suboptimal';

// Grade a move: illegal, optimal (keeps the best value the position offers), or
// suboptimal (legal but gives up value).
export const grade = (game: Game, cell: number): Grade => {
    if (!isLegal(game, cell)) return 'illegal';
    return value(play(game, cell), game.turn) === bestValue(game) ? 'optimal' : 'suboptimal';
};
