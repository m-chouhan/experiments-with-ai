import { createBoard, emptyCells, isOpen, place, render, winner } from './board.js';
import { chooseMove } from './ai.js';

const other = (mark) => (mark === 'X' ? 'O' : 'X');

const parseMove = (line) => {
  const parts = line.trim().split(/\s+/).map(Number);
  return parts.length === 2 ? parts : null;
};

// Returns 'X', 'O', 'DRAW', or 'INCOMPLETE' when input runs out.
export const playGame = ({ size, aiMark, inputs, print }) => {
  let board = createBoard(size);
  let mark = 'X';
  let next = 0;

  while (true) {
    let move;
    if (mark === aiMark) {
      move = chooseMove(board, mark, other(mark));
    } else {
      if (next >= inputs.length) return 'INCOMPLETE';
      move = parseMove(inputs[next++]);
      if (!move || !isOpen(board, ...move)) {
        print('INVALID');
        continue;
      }
    }

    board = place(board, ...move, mark);
    print(render(board));

    const win = winner(board);
    if (win) return win;
    if (emptyCells(board).length === 0) return 'DRAW';
    mark = other(mark);
  }
};
