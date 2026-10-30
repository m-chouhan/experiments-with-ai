// A trial's working copy: a fresh git repo seeded from one variant, outside this repo so the
// sandboxed agent can reach it. Afterwards its history is kept as a branch of this repo.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const git = (cwd, ...args) =>
  spawnSync('git', ['-c', 'user.name=lld-harness', '-c', 'user.email=harness@localhost', ...args], { cwd, encoding: 'utf8' });

export const repoRoot = (dir) => fs.realpathSync(git(dir, 'rev-parse', '--show-toplevel').stdout.trim());

// The agent sees its folder name and git log, so neither says which variant it is.
export const create = (variantDir) => {
  const workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'trial-')));
  fs.cpSync(variantDir, workdir, { recursive: true });
  git(workdir, 'init', '-q', '-b', 'main');
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '-m', 'baseline');
  return workdir;
};

export const head = (workdir) => git(workdir, 'rev-parse', 'HEAD').stdout.trim();

export const commit = (workdir, ...messages) => {
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '--allow-empty', ...messages.flatMap((m) => ['-m', m]));
};

export const diffStat = (workdir, base) => git(workdir, 'diff', '--shortstat', base, 'HEAD').stdout.trim();

// Fetches the working copy's main into `repo` as `branch`, then deletes the working copy.
export const archive = (workdir, repo, branch) => {
  git(repo, 'fetch', '-q', '--force', workdir, `main:${branch}`);
  fs.rmSync(workdir, { recursive: true, force: true });
};
