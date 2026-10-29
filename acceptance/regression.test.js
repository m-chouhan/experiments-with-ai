import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { run } from './helpers.js';

test('3x3 row win for X', () => {
  const r = run([], ['0 0', '1 0', '0 1', '1 1', '0 2']);
  assert.equal(r.verdict, 'WINNER X');
  assert.equal(r.last, 'SCORES X=1 O=0 draws=0');
});

test('3x3 diagonal win for O', () => {
  const r = run([], ['0 1', '0 0', '0 2', '1 1', '2 0', '2 2']);
  assert.equal(r.verdict, 'WINNER O');
});

test('3x3 draw', () => {
  const r = run([], ['0 0', '0 1', '0 2', '1 1', '1 0', '1 2', '2 1', '2 0', '2 2']);
  assert.equal(r.verdict, 'DRAW');
  assert.equal(r.last, 'SCORES X=0 O=0 draws=1');
});

test('invalid moves are rejected without losing the turn', () => {
  const r = run([], ['5 5', 'abc', '0 0', '0 0', '1 0', '0 1', '1 1', '0 2']);
  assert.equal(r.lines.filter((l) => l === 'INVALID').length, 3);
  assert.equal(r.verdict, 'WINNER X');
});

test('incomplete game does not touch scores', () => {
  const r = run([], ['0 0', '1 1']);
  assert.equal(r.last, 'INCOMPLETE');
  assert.equal(fs.existsSync(r.scoresFile), false);
});

test('AI as O blocks an immediate X win', () => {
  const r = run(['--ai', 'O'], ['0 0', '0 1']);
  assert.ok(r.lines.includes('X X O'));
  assert.equal(r.last, 'INCOMPLETE');
});

test('AI takes the centre first', () => {
  const r = run(['--ai', 'O'], ['0 0']);
  assert.ok(r.lines.includes('. O .'));
});
