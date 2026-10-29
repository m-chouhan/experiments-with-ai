// Usage: node harness/run.mjs [--runs 5] [--only designed:careful]
// Each run: copy a project to a temp dir, let `claude -p` implement the feature,
// run the hidden acceptance suites, append one CSV row to results/results.csv and
// keep the transcript + patch under results/runs/<id>/.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODEL = 'claude-sonnet-5-5';
const TOOLS = 'Read,Edit,Write,Bash,Glob,Grep';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const resultsDir = path.join(root, 'results');
const csv = path.join(resultsDir, 'results.csv');
const SUITES = ['regression', 'golden', 'feature'];
const COLUMNS = [
  'timestamp', 'id', 'project', 'prompt', 'run', 'model', 'claude_version',
  'passed', ...SUITES.map((s) => `${s}_failed`),
  'wall_ms', 'duration_ms', 'duration_api_ms', 'turns', 'cost_usd',
  'input_tokens', 'output_tokens', 'thinking_tokens', 'cache_read_tokens', 'cache_creation_tokens', 'total_tokens',
  'tool_calls', 'reads', 'edits', 'bash_calls', 'searches', 'distinct_files_read', 'tool_output_chars',
  'files_changed', 'lines_added', 'lines_removed', 'is_error', 'stop_reason',
];

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const runs = Number(arg('runs', 5));
const only = arg('only', null);

const cells = ['designed', 'poor'].flatMap((project) =>
  ['careful', 'vague'].map((prompt) => ({ project, prompt })))
  .filter((c) => !only || only === `${c.project}:${c.prompt}`);

const claudeVersion = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim().split(' ')[0];

const IGNORED = new Set(['scores.json', 'node_modules']);
const copyProject = (from, to) =>
  fs.cpSync(from, to, { recursive: true, filter: (src) => !IGNORED.has(path.basename(src)) });

// Diff stats ignoring files the agent creates by playing the game by hand.
const diffStats = (before, after, patchFile) => {
  const clean = fs.mkdtempSync(path.join(os.tmpdir(), 'lld-after-'));
  copyProject(after, clean);
  const git = (...extra) => spawnSync('git', ['diff', '--no-index', ...extra, before, clean], { encoding: 'utf8' }).stdout;
  fs.writeFileSync(patchFile, git().replaceAll(before, 'a').replaceAll(clean, 'b'));
  const rows = git('--numstat').trim().split('\n').filter(Boolean).map((l) => l.split('\t'));
  return {
    files_changed: rows.length,
    lines_added: rows.reduce((n, [a]) => n + (Number(a) || 0), 0),
    lines_removed: rows.reduce((n, [, r]) => n + (Number(r) || 0), 0),
  };
};

const runSuite = (workdir, suite) => {
  const res = spawnSync('node', ['--test', path.join(root, 'acceptance', `${suite}.test.js`)], {
    env: { ...process.env, PROJECT_DIR: workdir },
    encoding: 'utf8',
  });
  const failed = Number(/ℹ fail (\d+)/.exec(res.stdout)?.[1] ?? NaN);
  return { ok: res.status === 0, failed: Number.isNaN(failed) ? 'ERR' : failed };
};

const parseStream = (stdout) => {
  const events = stdout.split('\n').filter(Boolean).flatMap((l) => {
    try { return [JSON.parse(l)]; } catch { return []; }
  });
  const result = events.findLast((e) => e.type === 'result') ?? {};
  const calls = events.filter((e) => e.type === 'assistant')
    .flatMap((e) => e.message?.content ?? []).filter((b) => b.type === 'tool_use');
  const results = events.filter((e) => e.type === 'user')
    .flatMap((e) => (Array.isArray(e.message?.content) ? e.message.content : [])).filter((b) => b.type === 'tool_result');
  const textOf = (c) => (typeof c === 'string' ? c : (c ?? []).map((x) => x.text ?? '').join(''));
  const count = (...names) => calls.filter((c) => names.includes(c.name)).length;
  const tokens = Object.values(result.modelUsage ?? {}).reduce((t, m) => ({
    input: t.input + (m.inputTokens ?? 0),
    output: t.output + (m.outputTokens ?? 0),
    cacheRead: t.cacheRead + (m.cacheReadInputTokens ?? 0),
    cacheCreation: t.cacheCreation + (m.cacheCreationInputTokens ?? 0),
    thinking: t.thinking + (m.thinkingTokens ?? 0),
  }), { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, thinking: 0 });
  return {
    result, tokens,
    tool_calls: calls.length,
    reads: count('Read'),
    edits: count('Edit', 'Write', 'MultiEdit'),
    bash_calls: count('Bash'),
    searches: count('Grep', 'Glob'),
    tool_output_chars: results.reduce((n, b) => n + textOf(b.content).length, 0),
    distinct_files_read: new Set(calls.filter((c) => c.name === 'Read').map((c) => path.basename(c.input?.file_path ?? ''))).size,
  };
};

fs.mkdirSync(path.join(resultsDir, 'runs'), { recursive: true });
if (!fs.existsSync(csv)) fs.writeFileSync(csv, COLUMNS.join(',') + '\n');

for (let run = 1; run <= runs; run++) {
  for (const { project, prompt } of cells) {
    const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-${project}-${prompt}`;
    const runDir = path.join(resultsDir, 'runs', id);
    fs.mkdirSync(runDir);
    const source = path.join(root, 'projects', project);
    const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `lld-${project}-${prompt}-`));
    copyProject(source, workdir);

    const promptText = fs.readFileSync(path.join(root, 'prompts', `${prompt}.md`), 'utf8');
    const started = Date.now();
    const res = spawnSync('claude', [
      '-p', promptText,
      '--model', MODEL,
      '--output-format', 'stream-json', '--verbose',
      '--permission-mode', 'acceptEdits',
      '--tools', TOOLS,
      '--allowedTools', TOOLS,
      '--setting-sources', 'project,local',
      '--strict-mcp-config',
      '--no-session-persistence',
      '--max-budget-usd', '5',
    ], { cwd: workdir, encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 256 * 1024 * 1024 });
    const wall_ms = Date.now() - started;
    fs.writeFileSync(path.join(runDir, 'transcript.jsonl'), res.stdout ?? '');
    if (res.stderr) fs.writeFileSync(path.join(runDir, 'stderr.txt'), res.stderr);

    const s = parseStream(res.stdout ?? '');
    const suites = Object.fromEntries(SUITES.map((name) => [name, runSuite(workdir, name)]));
    const t = s.tokens;
    const row = {
      timestamp: new Date().toISOString(), id, project, prompt, run, model: MODEL, claude_version: claudeVersion,
      passed: SUITES.every((name) => suites[name].ok),
      ...Object.fromEntries(SUITES.map((name) => [`${name}_failed`, suites[name].failed])),
      wall_ms, duration_ms: s.result.duration_ms, duration_api_ms: s.result.duration_api_ms,
      turns: s.result.num_turns, cost_usd: s.result.total_cost_usd,
      input_tokens: t.input, output_tokens: t.output, thinking_tokens: t.thinking,
      cache_read_tokens: t.cacheRead, cache_creation_tokens: t.cacheCreation,
      total_tokens: t.input + t.output + t.cacheRead + t.cacheCreation,
      tool_calls: s.tool_calls, reads: s.reads, edits: s.edits, bash_calls: s.bash_calls,
      searches: s.searches, distinct_files_read: s.distinct_files_read, tool_output_chars: s.tool_output_chars,
      ...diffStats(source, workdir, path.join(runDir, 'changes.patch')),
      is_error: s.result.is_error ?? (res.status !== 0), stop_reason: s.result.subtype ?? res.signal ?? '',
    };
    fs.writeFileSync(path.join(runDir, 'row.json'), JSON.stringify(row, null, 2));
    fs.appendFileSync(csv, COLUMNS.map((c) => row[c] ?? '').join(',') + '\n');
    console.log(`${project}/${prompt} #${run}: ${row.passed ? 'PASS' : 'FAIL'} ` +
      `${(wall_ms / 1000).toFixed(0)}s ${row.total_tokens} tok $${row.cost_usd ?? '?'}`);
  }
}
