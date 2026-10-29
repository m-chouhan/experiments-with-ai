import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const projectDir = path.resolve(process.env.PROJECT_DIR || '.');

export const runRaw = (args, input, dir = projectDir) => {
  const res = spawnSync('node', ['main.js', ...args], { cwd: dir, input, encoding: 'utf8', timeout: 10000 });
  return { stdout: res.stdout, stderr: res.stderr, status: res.status };
};

export const run = (args, moves = []) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttt-'));
  const scores = path.join(tmp, 'scores.json');
  const res = runRaw(['--scores', scores, ...args], moves.join('\n') + '\n');
  const lines = res.stdout.trim().split('\n');
  return { lines, last: lines.at(-1), verdict: lines.at(-2), scoresFile: scores, status: res.status };
};

// Plays a session of games against one scores file; returns everything observable.
export const playSession = ({ initialScores, games }, dir = projectDir) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ttt-'));
  const scores = path.join(tmp, 'scores.json');
  if (initialScores !== null) fs.writeFileSync(scores, initialScores);
  const transcript = games.map(({ args, input }) => {
    const res = runRaw(['--scores', scores, ...args], input, dir);
    return { stdout: res.stdout, status: res.status };
  });
  const finalScores = fs.existsSync(scores) ? fs.readFileSync(scores, 'utf8') : null;
  return { transcript, finalScores };
};
