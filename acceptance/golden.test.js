import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { playSession } from './helpers.js';

const cases = JSON.parse(fs.readFileSync(new URL('./golden.json', import.meta.url), 'utf8'));

test(`replays ${cases.length} recorded 3x3 sessions with identical output`, () => {
  for (const c of cases) {
    assert.deepEqual(playSession(c), c.expected, `seed ${c.seed}: ${JSON.stringify(c.games)}`);
  }
});
