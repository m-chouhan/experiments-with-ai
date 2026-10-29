// Usage: node harness/run.mjs [--model sonnet|haiku] [--runs 1] [--only junior|mature]
// For each version: copy it into a fresh git repo (no tests, no prompts), let `claude -p`
// apply change 1 then change 2, commit after each, run the hidden tests, then fetch the
// result into this repo as branch exp/<model>/<version>-<run>. Writes results/<timestamp>.json.
// Claude runs under sandbox-exec: it cannot read this repo or write outside its workdir.
// Per change, the full transcript and a readable step log go to results/transcripts/.
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

const results = [];
for (let run = 1; run <= runs; run++) for (const version of versions) {
  const workdir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `parking-${version}-`)));
  fs.cpSync(path.join(root, 'projects', version), workdir, { recursive: true });
  git(workdir, 'init', '-q', '-b', 'main');
  git(workdir, 'add', '-A');
  git(workdir, 'commit', '-q', '-m', `baseline (${version})`);

  for (const [i, change] of CHANGES.entries()) {
    const prompt = fs.readFileSync(path.join(root, 'prompts', `${change}.md`), 'utf8');
    const logBase = path.join(root, 'results', 'transcripts', modelName, `${version}-${run}`, change);
    const base = sh('git', ['rev-parse', 'HEAD'], workdir).stdout.trim();
    const agent = askClaude(workdir, prompt, logBase, `${version} · ${change} · ${modelName} · run ${run}`);
    git(workdir, 'add', '-A');
    git(workdir, 'commit', '-q', '--allow-empty', '-m', `${change} (${version})`, '-m',
      `model=${MODEL} wall_s=${agent.wall_s} total_tokens=${agent.total_tokens} cost_usd=${agent.cost_usd}`);
    const diff = sh('git', ['diff', '--shortstat', base, 'HEAD'], workdir).stdout.trim();
    const tests = runTests(workdir, ['baseline/baseline.test.js', ...CHANGES.slice(0, i + 1).map((c) => `target/${c}.test.js`)]);
    const row = { model: MODEL, run, version, change, ...agent, diff, ...tests };
    results.push(row);
    fs.appendFileSync(`${logBase}.md`, `\n## Outcome\n\nHidden tests: ${tests.passed}/${tests.passed + tests.failed} passed. ${diff}\n` +
      tests.failing.map((t) => `- failed: ${t}\n`).join(''));
    console.log(`#${run} ${version} ${change}: tests ${tests.passed}/${tests.passed + tests.failed}, ` +
      `${agent.wall_s}s, ${agent.tool_calls} calls, ${agent.total_tokens} tokens, $${agent.cost_usd?.toFixed(3)}, ${diff}`);
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
