export const EMPTY = '.';

export const createBoard = (size) =>
  Array.from({ length: size }, () => Array(size).fill(EMPTY));

export const isOpen = (board, r, c) =>
  Number.isInteger(r) && Number.isInteger(c) &&
  r >= 0 && c >= 0 && r < board.length && c < board.length &&
  board[r][c] === EMPTY;

export const place = (board, r, c, mark) =>
  board.map((row, i) => row.map((v, j) => (i === r && j === c ? mark : v)));

export const emptyCells = (board) =>
  board.flatMap((row, r) => row.flatMap((v, c) => (v === EMPTY ? [[r, c]] : [])));

export const render = (board) => board.map((row) => row.join(' ')).join('\n');

const lines = (size) => {
  const range = [...Array(size).keys()];
  return [
    ...range.map((r) => range.map((c) => [r, c])),
    ...range.map((c) => range.map((r) => [r, c])),
    range.map((i) => [i, i]),
    range.map((i) => [i, size - 1 - i]),
  ];
};

export const winner = (board) => {
  for (const line of lines(board.length)) {
    const [r0, c0] = line[0];
    const first = board[r0][c0];
    if (first !== EMPTY && line.every(([r, c]) => board[r][c] === first)) return first;
  }
  return null;
};
