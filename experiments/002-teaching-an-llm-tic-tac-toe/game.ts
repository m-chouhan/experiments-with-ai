// Pure rules engine, ported from my-portfolio's tictactoe/game.js and typed.

export type Mark = 'X' | 'O';
export type Cell = Mark | null;
export type Board = Cell[]; // always length 9, indexed 0..8 left-to-right, top-to-bottom

export interface Winner {
    mark: Mark;
    line?: readonly [number, number, number]; // absent for a win by forfeit
}

export interface Game {
    board: Board;
    turn: Mark;
    winner: Winner | null;
    over: boolean;
}

const LINES: readonly (readonly [number, number, number])[] = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
];

const winnerOn = (board: Board): Winner | null => {
    for (const line of LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { mark: board[a] as Mark, line };
        }
    }
    return null;
};

const withMark = (board: Board, cell: number, mark: Mark): Board =>
    board.map((held, i) => (i === cell ? mark : held));

export const otherMark = (mark: Mark): Mark => (mark === 'X' ? 'O' : 'X');

export const newGame = (): Game => ({
    board: Array(9).fill(null),
    turn: 'X',
    winner: null,
    over: false,
});

export const play = (game: Game, cell: number): Game => {
    if (!isLegal(game, cell)) return game;

    const board = withMark(game.board, cell, game.turn);
    const winner = winnerOn(board);
    const over = Boolean(winner) || board.every(Boolean);

    return { board, turn: over ? game.turn : otherMark(game.turn), winner, over };
};

// A forfeit is a terminal Game like any other, so the loop and `announce`
// handle it with no special case.
export const forfeit = (game: Game): Game =>
    ({ ...game, over: true, winner: { mark: otherMark(game.turn) } });

// The single definition of a legal move, used by play, humanMove and llmMove.
export const isLegal = (game: Game, cell: number): boolean =>
    !game.over && Number.isInteger(cell) && cell >= 0 && cell <= 8 && game.board[cell] === null;

export const legalMoves = (game: Game): number[] =>
    game.board.flatMap((_mark, cell) => (isLegal(game, cell) ? [cell] : []));

export const isDraw = (game: Game): boolean => game.over && !game.winner;
