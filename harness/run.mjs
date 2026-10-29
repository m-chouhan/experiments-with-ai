// Usage: node harness/run.mjs [--pair parking|semver] [--model sonnet|haiku] [--runs 1]
//                             [--only <version>] [--task <task id>]
// For each version of the pair: copy it into a fresh git repo (no tests, no prompts), let
// `claude -p` apply each task, commit, run the hidden tests, then fetch the result into this
// repo as a branch under exp/<model>/<pair>/. Parking's changes are chained (change 2 builds
// on change 1); semver's tasks each start from the baseline. Writes results/<timestamp>.json.
// Claude runs under sandbox-exec: it cannot read this repo or write outside its workdir.
// Per task, the full transcript and a readable step log go to results/transcripts/.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODELS = { sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-4-5-20251001' };
const TOOLS = 'Read,Edit,Write,Bash,Glob,Grep';
const SEMVER_TASKS = ['t1-uppercase-v', 't2-prerelease-tags', 't3-natural-prerelease', 't4-compatible-release'];
const PAIRS = {
  parking: {
    versions: ['junior', 'mature'],
    chained: true,
    tasks: [
      { id: 'change1', prompt: 'prompts/change1.md', tests: ['baseline/baseline.test.js', 'target/change1.test.js'] },
      { id: 'change2', prompt: 'prompts/change2.md', tests: ['baseline/baseline.test.js', 'target/change1.test.js', 'target/change2.test.js'] },
    ],
  },
  semver: {
    versions: ['good', 'bad'],
    chained: false,
    upstreamTests: true,
    tasks: SEMVER_TASKS.map((id) => ({ id, prompt: `prompts/semver/${id}.md`, tests: [`semver/${id}.test.mjs`] })),
  },
};
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const modelName = arg('model', 'sonnet');
const MODEL = MODELS[modelName];
const runs = Number(arg('runs', 1));
const pairName = arg('pair', 'parking');
const pair = PAIRS[pairName];
const only = arg('only', null);
const onlyTask = arg('task', null);
const versions = pair.versions.filter((v) => !only || v === only);
const tasks = pair.tasks.filter((t) => !onlyTask || t.id === onlyTask);

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

// The project's own test suite, run against the agent's code but with the original test
// files, so an agent editing tests cannot hide a regression.
const runUpstreamTests = (workdir, version) => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), `upstream-${version}-`));
  fs.cpSync(workdir, copy, { recursive: true, filter: (src) => !src.endsWith('/.git') });
  fs.rmSync(path.join(copy, 'test'), { recursive: true, force: true });
  fs.cpSync(path.join(root, 'projects', version, 'test'), path.join(copy, 'test'), { recursive: true });
  const res = spawnSync('npx', ['tap', '--no-coverage', '-R', 'terse'], { cwd: copy, encoding: 'utf8', timeout: 10 * 60 * 1000 });
  fs.rmSync(copy, { recursive: true, force: true });
  const out = (res.stdout ?? '').replace(/\x1b\[[0-9;]*[A-Za-z]|\u200b/g, '');
  const n = (re) => Number(re.exec(out.split('Asserts:').at(-1))?.[1] ?? 0);
  return { upstream_ok: res.status === 0, upstream_passed: n(/(\d+) passed/), upstream_failed: n(/(\d+) failed/) };
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

const clip = (text, n) => (text.length > n ? `${text.slice(0, n)}…` : text);
const resultText = (c) => (typeof c === 'string' ? c : (c ?? []).map((x) => x.text ?? '').join(''));

const describeCall = ({ name, input }) => {
  if (name === 'Bash') return `Bash\n\n\`\`\`sh\n${clip(input.command, 1500)}\n\`\`\``;
  if (name === 'Edit') return `Edit ${input.file_path}\n\n\`\`\`diff\n${clip(input.old_string, 600).replace(/^/gm, '- ')}\n${clip(input.new_string, 1200).replace(/^/gm, '+ ')}\n\`\`\``;
  if (name === 'Write') return `Write ${input.file_path} (${input.content.length} chars)`;
  return `${name} ${JSON.stringify(input)}`;
};

// Readable step-by-step log: one step per model turn, with thinking, text, tool calls and results.
const renderSteps = (events, title) => {
  const lines = [`# ${title}`];
  let lastId = null;
  let step = 0;
  for (const e of events) {
    if (e.type === 'assistant') {
      if (e.message.id !== lastId) lines.push(`\n## Step ${++step}`);
      lastId = e.message.id;
      for (const b of e.message.content) {
        if (b.type === 'thinking' && b.thinking) lines.push(`\n**Thinking:** ${b.thinking.trim()}`);
        if (b.type === 'text') lines.push(`\n**Says:** ${b.text.trim()}`);
        if (b.type === 'tool_use') lines.push(`\n**Tool:** ${describeCall(b)}`);
      }
    }
    if (e.type === 'user' && Array.isArray(e.message.content)) {
      for (const b of e.message.content.filter((x) => x.type === 'tool_result')) {
        lines.push(`\n**Result${b.is_error ? ' (error)' : ''}:**\n\n\`\`\`\n${clip(resultText(b.content).trim(), 800)}\n\`\`\``);
      }
    }
  }
  return lines.join('\n') + '\n';
};

const askClaude = (workdir, prompt, logBase, title) => {
  const started = Date.now();
  const res = spawnSync('sandbox-exec', ['-p', sandboxProfile(workdir), 'claude',
    '-p', prompt,
    '--model', MODEL,
    '--output-format', 'stream-json', '--verbose',
    '--settings', JSON.stringify({ showThinkingSummaries: true }),
    '--permission-mode', 'acceptEdits',
    '--tools', TOOLS,
    '--allowedTools', TOOLS,
    '--setting-sources', 'project,local',
    '--strict-mcp-config',
    '--no-session-persistence',
  ], { cwd: workdir, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 256 * 1024 * 1024 });
  const wall_s = Math.round((Date.now() - started) / 1000);
  const events = (res.stdout ?? '').split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
  const out = events.findLast((e) => e.type === 'result') ?? {};
  const calls = events.filter((e) => e.type === 'assistant')
    .flatMap((e) => e.message.content).filter((b) => b.type === 'tool_use');
  const usage = Object.values(out.modelUsage ?? {});
  const sum = (key) => usage.reduce((n, m) => n + (m[key] ?? 0), 0);
  const metrics = {
    claude_code_version: events.find((e) => e.subtype === 'init')?.claude_code_version,
    wall_s,
    turns: out.num_turns,
    tool_calls: calls.length,
    cost_usd: out.total_cost_usd,
    input_tokens: sum('inputTokens'),
    output_tokens: sum('outputTokens'),
    thinking_tokens: sum('thinkingTokens'),
    cache_read_tokens: sum('cacheReadInputTokens'),
    cache_write_tokens: sum('cacheCreationInputTokens'),
    total_tokens: ['inputTokens', 'outputTokens', 'cacheReadInputTokens', 'cacheCreationInputTokens'].reduce((n, k) => n + sum(k), 0),
    is_error: out.is_error ?? true,
  };
  fs.mkdirSync(path.dirname(logBase), { recursive: true });
  fs.writeFileSync(`${logBase}.jsonl`, res.stdout ?? '');
  const header = `${wall_s}s · ${metrics.turns} turns · ${metrics.tool_calls} tool calls · ${metrics.total_tokens} tokens · $${metrics.cost_usd?.toFixed(3)}`;
  fs.writeFileSync(`${logBase}.md`, renderSteps(events, `${title}\n\n${header}`));
  return metrics;
};

const freshRepo = (version) => {
  const workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${pairName}-${version}-`)));
  fs.cpSync(path.join(root, 'projects', version), workdir, { recursive: true });
  git(workdir, 'init', '-q', '-b', 'main');
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '-m', `baseline (${version})`);
  return workdir;
};

const results = [];
const doTask = (workdir, version, task, run) => {
  const prompt = fs.readFileSync(path.join(root, task.prompt), 'utf8');
  const logBase = path.join(root, 'results', 'transcripts', modelName, pairName, `${version}-${run}`, task.id);
  const base = sh('git', ['rev-parse', 'HEAD'], workdir).stdout.trim();
  const agent = askClaude(workdir, prompt, logBase, `${pairName} · ${version} · ${task.id} · ${modelName} · run ${run}`);
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '--allow-empty', '-m', `${task.id} (${version})`, '-m',
    `model=${MODEL} wall_s=${agent.wall_s} total_tokens=${agent.total_tokens} cost_usd=${agent.cost_usd}`);
  const diff = sh('git', ['diff', '--shortstat', base, 'HEAD'], workdir).stdout.trim();
  const tests = runTests(workdir, task.tests);
  const upstream = pair.upstreamTests ? runUpstreamTests(workdir, version) : {};
  const row = { pair: pairName, model: MODEL, run, version, task: task.id, ...agent, diff, ...tests, ...upstream };
  results.push(row);
  const upstreamLine = pair.upstreamTests ? ` Upstream suite: ${upstream.upstream_ok ? 'pass' : 'FAIL'} (${upstream.upstream_passed} passed, ${upstream.upstream_failed} failed).` : '';
  fs.appendFileSync(`${logBase}.md`, `\n## Outcome\n\nHidden tests: ${tests.passed}/${tests.passed + tests.failed} passed.${upstreamLine} ${diff}\n` +
    tests.failing.map((t) => `- failed: ${t}\n`).join(''));
  console.log(`#${run} ${version} ${task.id}: tests ${tests.passed}/${tests.passed + tests.failed}` +
    `${pair.upstreamTests ? `, upstream ${upstream.upstream_ok ? 'ok' : 'FAIL'}` : ''}, ` +
    `${agent.wall_s}s, ${agent.tool_calls} calls, ${agent.total_tokens} tokens, $${agent.cost_usd?.toFixed(3)}, ${diff}`);
};
const keep = (workdir, branch) => {
  git(root, 'fetch', '-q', '--force', workdir, `main:exp/${modelName}/${pairName}/${branch}`);
  fs.rmSync(workdir, { recursive: true, force: true });
};

for (let run = 1; run <= runs; run++) for (const version of versions) {
  if (pair.chained) {
    const workdir = freshRepo(version);
    for (const task of tasks) doTask(workdir, version, task, run);
    keep(workdir, `${version}-${run}`);
  } else {
    for (const task of tasks) {
      const workdir = freshRepo(version);
      doTask(workdir, version, task, run);
      keep(workdir, `${version}-${task.id}-${run}`);
    }
  }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
console.log('\nversion  task                    passed  median s  median tokens  median $');
for (const version of versions) for (const task of tasks) {
  const rows = results.filter((r) => r.version === version && r.task === task.id);
  const ok = rows.filter((r) => r.failed === 0 && r.upstream_ok !== false).length;
  console.log(`${version.padEnd(8)} ${task.id.padEnd(23)} ${ok}/${rows.length}     ${String(median(rows.map((r) => r.wall_s))).padEnd(9)} ` +
    `${String(median(rows.map((r) => r.total_tokens))).padEnd(14)} ${median(rows.map((r) => r.cost_usd ?? 0)).toFixed(3)}`);
}

fs.mkdirSync(path.join(root, 'results'), { recursive: true });
const file = path.join(root, 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2) + '\n');
console.log(`wrote ${path.relative(root, file)}`);
