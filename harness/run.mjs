// Usage: node harness/run.mjs [--model sonnet|haiku] [--runs 1] [--only junior|mature]
// For each version: copy it into a fresh git repo (no tests, no prompts), let `claude -p`
// apply change 1 then change 2, commit after each, run the hidden tests, then fetch the
// result into this repo as branch exp/<model>/<version>-<run>. Writes results/<timestamp>.json.
// Claude runs under sandbox-exec: it cannot read this repo or write outside its workdir.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODELS = { sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-4-5-20251001' };
const TOOLS = 'Read,Edit,Write,Bash,Glob,Grep';
const CHANGES = ['change1', 'change2'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const modelName = arg('model', 'sonnet');
const MODEL = MODELS[modelName];
const runs = Number(arg('runs', 1));
const only = arg('only', null);
const versions = ['junior', 'mature'].filter((v) => !only || v === only);

const sh = (cmd, args, cwd) => spawnSync(cmd, args, { cwd, encoding: 'utf8' });
const git = (cwd, ...args) => sh('git', ['-c', 'user.name=lld-harness', '-c', 'user.email=harness@localhost', ...args], cwd);

const runTests = (workdir, files) => {
  const res = spawnSync('node', ['--test', ...files.map((f) => path.join(root, 'tests', f))], {
    env: { ...process.env, PROJECT_DIR: workdir }, encoding: 'utf8',
  });
  const count = (label) => Number(new RegExp(`ℹ ${label} (\\d+)`).exec(res.stdout)?.[1]);
  const failing = [...res.stdout.matchAll(/^✖ (.+?) \(/gm)].map((m) => m[1]).filter((n) => !n.startsWith('failing'));
  return { passed: count('pass'), failed: count('fail'), failing: [...new Set(failing)] };
};

const sandboxProfile = (workdir) => {
  const home = os.homedir();
  return `(version 1)
(allow default)
(deny file-read* file-write* (subpath "${fs.realpathSync(root)}"))
(deny file-write*
  (require-all
    (require-not (subpath "${workdir}"))
    (require-not (subpath "${home}/.claude"))
    (require-not (regex #"^${home}/\\.claude\\.json"))
    (require-not (subpath "/private/var/folders"))
    (require-not (subpath "/private/tmp"))
    (require-not (subpath "/dev"))))`;
};

const askClaude = (workdir, prompt) => {
  const started = Date.now();
  const res = spawnSync('sandbox-exec', ['-p', sandboxProfile(workdir), 'claude',
    '-p', prompt,
    '--model', MODEL,
    '--output-format', 'json',
    '--permission-mode', 'acceptEdits',
    '--tools', TOOLS,
    '--allowedTools', TOOLS,
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    '--no-session-persistence',
  ], { cwd: workdir, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  let out = {};
  try { out = JSON.parse(res.stdout); } catch { /* recorded as missing fields */ }
  const usage = Object.values(out.modelUsage ?? {});
  const sum = (key) => usage.reduce((n, m) => n + (m[key] ?? 0), 0);
  return {
    wall_s: Math.round((Date.now() - started) / 1000),
    turns: out.num_turns,
    cost_usd: out.total_cost_usd,
    input_tokens: sum('inputTokens'),
    output_tokens: sum('outputTokens'),
    cache_read_tokens: sum('cacheReadInputTokens'),
    cache_write_tokens: sum('cacheCreationInputTokens'),
    total_tokens: ['inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens'].reduce((n, k) => n + sum(k), 0),
    is_error: out.is_error ?? true,
    summary: out.result,
  };
};

const results = [];
for (let run = 1; run <= runs; run++) for (const version of versions) {
  const workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `parking-${version}-`)));
  fs.cpSync(path.join(root, 'projects', version), workdir, { recursive: true });
  git(workdir, 'init', '-q', '-b', 'main');
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '-m', `baseline (${version})`);

  for (const [i, change] of CHANGES.entries()) {
    const prompt = fs.readFileSync(path.join(root, 'prompts', `${change}.md`), 'utf8');
    const agent = askClaude(workdir, prompt);
    git(workdir, 'add', '-A');
    git(workdir, 'commit', '-q', '--allow-empty', '-m', `${change} (${version})`, '-m',
      `model=${MODEL} wall_s=${agent.wall_s} total_tokens=${agent.total_tokens} cost_usd=${agent.cost_usd}`);
    const diff = sh('git', ['diff', '--shortstat', 'HEAD~1', 'HEAD'], workdir).stdout.trim();
    const tests = runTests(workdir, ['baseline/baseline.test.js', ...CHANGES.slice(0, i + 1).map((c) => `target/${c}.test.js`)]);
    const row = { model: MODEL, run, version, change, ...agent, diff, ...tests };
    results.push(row);
    console.log(`#${run} ${version} ${change}: tests ${tests.passed}/${tests.passed + tests.failed}, ` +
      `${agent.wall_s}s, ${agent.total_tokens} tokens, $${agent.cost_usd?.toFixed(3)}, ${diff}`);
  }
  git(root, 'fetch', '-q', '--force', workdir, `main:exp/${modelName}/${version}-${run}`);
  fs.rmSync(workdir, { recursive: true, force: true });
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
console.log('\nversion  change   passed  median s  median tokens  median $');
for (const version of versions) for (const change of CHANGES) {
  const rows = results.filter((r) => r.version === version && r.change === change);
  const ok = rows.filter((r) => r.failed === 0).length;
  console.log(`${version.padEnd(8)} ${change}  ${ok}/${rows.length}     ${String(median(rows.map((r) => r.wall_s))).padEnd(9)} ` +
    `${String(median(rows.map((r) => r.total_tokens))).padEnd(14)} ${median(rows.map((r) => r.cost_usd ?? 0)).toFixed(3)}`);
}

fs.mkdirSync(path.join(root, 'results'), { recursive: true });
const file = path.join(root, 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n');
console.log(`wrote ${path.relative(root, file)}`);
