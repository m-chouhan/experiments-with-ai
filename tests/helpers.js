import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

export const projectDir = path.resolve(process.env.PROJECT_DIR || 'projects/mature');

export const play = (commands, dir = projectDir) =>
  spawnSync('node', ['main.js'], { cwd: dir, input: commands.join('\n') + '\n', encoding: 'utf8', timeout: 10000 })
    .stdout.trim().split('\n');

// Every command prints exactly one line, so `then` is checked against the last lines of output.
export const scenario = (name, { given = [], when, then }) =>
  test(name, () => {
    const whens = [].concat(when);
    assert.deepEqual(play([...given, ...whens]).slice(given.length), [].concat(then));
  });
