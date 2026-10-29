// Junior and mature baselines must behave identically on random command streams.
import test from 'node:test';
import assert from 'node:assert/strict';
import { play } from '../helpers.js';

const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const WORDS = {
  command: ['park', 'park', 'park', 'leave', 'leave', 'quote', 'fly', 'pass'],
  plate: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
  type: ['bike', 'car', 'car', 'truck', 'plane'],
  hours: ['1', '2', '3', '7', '0', '-1', '1.5', 'x'],
};

test('500 random sessions give identical output on both baselines', () => {
  for (let seed = 1; seed <= 500; seed++) {
    const rand = rng(seed);
    const pick = (xs) => xs[Math.floor(rand() * xs.length)];
    const commands = Array.from({ length: 5 + Math.floor(rand() * 25) }, () => {
      const command = pick(WORDS.command);
      const words = [command, pick(WORDS.plate), pick(command === 'park' ? WORDS.type : WORDS.hours), pick(WORDS.hours)];
      const length = rand() < 0.8 ? 3 : 1 + Math.floor(rand() * 4);
      return words.slice(0, length).join(' ');
    });
    assert.deepEqual(play(commands, 'projects/junior'), play(commands, 'projects/mature'), `seed ${seed}`);
  }
});
