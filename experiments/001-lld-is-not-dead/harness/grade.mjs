// Judging a trial: the hidden tests the agent never saw, and optionally the variant's own
// upstream suite restored from the original (so the agent cannot pass by editing it).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const hiddenTests = (workdir, testFiles) => {
  const res = spawnSync('node', ['--test', ...testFiles], { env: { ...process.env, PROJECT_DIR: workdir }, encoding: 'utf8' });
  const count = (label) => Number(new RegExp(`ℹ ${label} (\\d+)`).exec(res.stdout)?.[1]);
  const failing = [...res.stdout.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]).filter((n) => !n.startsWith('failing'));
  return { passed: count('pass'), failed: count('fail'), failing: [...new Set(failing)] };
};

// Runs tap on a copy of the working copy whose suite folder is replaced by `originalSuite`.
export const upstreamSuite = (workdir, originalSuite) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'upstream-'));
  const suite = path.join(copy, path.basename(originalSuite));
  fs.cpSync(workdir, copy, { recursive: true, filter: (src) => !src.endsWith('/.git') });
  fs.rmSync(suite, { recursive: true, force: true });
  fs.cpSync(originalSuite, suite, { recursive: true });
  const res = spawnSync('npx', ['tap', '--no-coverage', '-R', 'terse'], { cwd: copy, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  fs.rmSync(copy, { recursive: true, force: true });
  const out = (res.stdout ?? '').replace(/\x1b\[[0-9;]*[A-Za-z]|​/g, '');
  const n = (re) => Number(re.exec(out.split('Asserts:').at(-1))?.[1] ?? 0);
  return { upstream_ok: res.status === 0, upstream_passed: n(/(\d+) passed/), upstream_failed: n(/(\d+) failed/) };
};
