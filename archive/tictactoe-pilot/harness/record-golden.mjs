// Usage: node harness/record-golden.mjs [--from projects/designed] [--cases 300]
// Generates seeded random game sessions, plays them on one project and writes
// acceptance/golden.json. acceptance/golden.test.js replays them on PROJECT_DIR.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { playSession } from '../acceptance/helpers.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const from = path.resolve(root, arg('from', 'projects/designed'));
const count = Number(arg('cases', 300));

const mulberry32 = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const JUNK = ['abc', '', '1', '1 2 3', '1.5 0', '3 0', '0 3', '-1 1', '  2   2  ', '9 9', '1,1'];
const INITIAL = [null, null, null, '{"X":2,"O":5,"draws":1}', 'not json', '{"X":7}'];

// Mostly a shuffled walk over all cells (so games finish), salted with junk,
// repeats of earlier moves, and sometimes cut short.
const genGame = (rand) => {
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const ai = pick([null, null, 'X', 'O']);
  const cells = [...Array(9).keys()].map((i) => `${Math.floor(i / 3)} ${i % 3}`)
    .map((m) => [rand(), m]).sort((x, y) => x[0] - y[0]).map(([, m]) => m);
  const moves = cells.flatMap((m, i) => [
    ...(rand() < 0.1 ? [pick(JUNK)] : []),
    ...(i > 0 && rand() < 0.1 ? [pick(cells.slice(0, i))] : []),
    m,
  ]);
  const cut = rand() < 0.2 ? Math.floor(rand() * moves.length) : moves.length;
  return { args: ai ? ['--ai', ai] : [], input: moves.slice(0, cut).map((m) => m + '\n').join('') };
};

const cases = Array.from({ length: count }, (_, seed) => {
  const rand = mulberry32(seed + 1);
  const session = {
    seed,
    initialScores: INITIAL[Math.floor(rand() * INITIAL.length)],
    games: Array.from({ length: 1 + Math.floor(rand() * 3) }, () => genGame(rand)),
  };
  return { ...session, expected: playSession(session, from) };
});

const verdicts = {};
for (const c of cases) for (const { stdout } of c.expected.transcript) {
  const v = stdout.split('\n').find((l) => /^(WINNER|DRAW|INCOMPLETE)/.test(l)) ?? 'none';
  verdicts[v] = (verdicts[v] ?? 0) + 1;
}
fs.writeFileSync(path.join(root, 'acceptance', 'golden.json'), JSON.stringify(cases, null, 1) + '\n');
console.log(`recorded ${cases.length} sessions from ${path.relative(root, from)}`, verdicts);
