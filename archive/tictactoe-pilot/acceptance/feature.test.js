import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from './helpers.js';

test('--size 4 default win needs 4 in a row (row)', () => {
  const r = run(['--size', '4'], ['0 0', '1 0', '0 1', '1 1', '0 2', '1 2', '0 3']);
  assert.ok(r.lines.includes('X X X X'));
  assert.equal(r.verdict, 'WINNER X');
});

test('--size 4 --win 3 wins on three in a row', () => {
  const r = run(['--size', '4', '--win', '3'], ['0 0', '3 3', '0 1', '3 2', '0 2']);
  assert.equal(r.verdict, 'WINNER X');
});

test('--win 3 detects a three-long run that does not start at the edge', () => {
  const r = run(['--size', '5', '--win', '3'], ['0 1', '4 4', '0 2', '4 2', '0 3']);
  assert.equal(r.verdict, 'WINNER X');
});

test('--win 3 detects a column win', () => {
  const r = run(['--size', '4', '--win', '3'], ['1 2', '0 0', '2 2', '0 1', '3 2']);
  assert.equal(r.verdict, 'WINNER X');
});

test('--win 3 detects a diagonal win off the main diagonal', () => {
  const r = run(['--size', '5', '--win', '3'], ['1 0', '0 0', '2 1', '0 1', '3 2']);
  assert.equal(r.verdict, 'WINNER X');
});

test('--win 3 detects an anti-diagonal win off the main anti-diagonal', () => {
  const r = run(['--size', '5', '--win', '3'], ['0 3', '0 0', '1 2', '0 1', '2 1']);
  assert.equal(r.verdict, 'WINNER X');
});

test('two in a row is not enough for --win 3', () => {
  const r = run(['--size', '4', '--win', '3'], ['0 0', '3 3', '0 1', '3 2']);
  assert.ok(r.lines.includes('X X . .'));
  assert.equal(r.last, 'INCOMPLETE');
});

test('moves outside a 4x4 board are invalid but 3 3 is valid', () => {
  const r = run(['--size', '4'], ['4 4', '3 3']);
  assert.equal(r.lines.filter((l) => l === 'INVALID').length, 1);
  assert.equal(r.last, 'INCOMPLETE');
});

test('default board stays 3x3: move 3 3 is invalid', () => {
  const r = run([], ['3 3']);
  assert.equal(r.lines[0], 'INVALID');
});

test('AI blocks a 3-in-a-row threat on a larger board', () => {
  const r = run(['--size', '5', '--win', '3', '--ai', 'O'], ['0 0', '0 1']);
  assert.ok(r.lines.join('\n').includes('X X O . .'));
});

test('scores still record on larger boards', () => {
  const r = run(['--size', '4', '--win', '3'], ['0 0', '3 3', '0 1', '3 2', '0 2']);
  assert.equal(r.last, 'SCORES X=1 O=0 draws=0');
});
