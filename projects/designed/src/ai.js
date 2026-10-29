import { emptyCells, place, winner } from './board.js';

const winningCell = (board, mark) =>
  emptyCells(board).find(([r, c]) => winner(place(board, r, c, mark)) === mark);

export const chooseMove = (board, mark, opponent) => {
  const centre = Math.floor(board.length / 2);
  const free = emptyCells(board);
  return (
    winningCell(board, mark) ||
    winningCell(board, opponent) ||
    free.find(([r, c]) => r === centre && c === centre) ||
    free[0]
  );
};
