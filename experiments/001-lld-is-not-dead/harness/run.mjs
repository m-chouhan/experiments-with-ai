// Runs one study's tasks against its good and bad variants and records what each trial cost.
// Usage: node harness/run.mjs [--study parking|semver] [--model sonnet|haiku] [--runs 1]
//                             [--variant good|bad] [--task <task id>] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { MODELS, runAgent } from './agent.mjs';
import { hiddenTests, upstreamSuite } from './grade.mjs';
import * as transcript from './transcript.mjs';
import * as workspace from './workspace.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const modelName = flag('model', 'sonnet');
const studyName = flag('study', 'parking');
const MODEL = MODELS[modelName];
const studyDir = path.join(root, 'studies', studyName);
if (!MODEL) throw new Error(`unknown model: ${modelName}`);
if (!fs.existsSync(path.join(studyDir, 'study.mjs'))) throw new Error(`unknown study: ${studyName}`);
const { default: study } = await import(pathToFileURL(path.join(studyDir, 'study.mjs')));
const runs = Number(flag('runs', 1));
const variants = study.variants.filter((v) => v === flag('variant', v));
const tasks = study.tasks.filter((t) => t.id === flag('task', t.id));

const promptFile = (task) => path.join(studyDir, 'tasks', `${task.id}.md`);
const missing = tasks.flatMap((t) => [promptFile(t), ...t.tests.map((f) => path.join(studyDir, f))]).filter((f) => !fs.existsSync(f));
if (missing.length) throw new Error(`missing task files:\n${missing.join('\n')}`);

// Each entry is one working copy. A chained study runs all its tasks in one copy per
// variant and run; otherwise every task starts from a fresh baseline.
const plan = [];
for (let run = 1; run <= runs; run++) {
  for (const variant of variants) {
    if (study.chained) plan.push({ run, variant, tasks, branch: `${variant}-${run}` });
    else for (const task of tasks) plan.push({ run, variant, tasks: [task], branch: `${variant}-${task.id}-${run}` });
  }
}
const branchPrefix = `${path.basename(root)}/${modelName}/${studyName}`;

if (process.argv.includes('--dry-run')) {
  for (const p of plan) console.log(`run ${p.run} ${p.variant}: ${p.tasks.map((t) => t.id).join(' → ')}  → ${branchPrefix}/${p.branch}`);
  process.exit(0);
}

const repo = workspace.repoRoot(root);
const results = [];
const runTrial = (workdir, variant, task, run) => {
  const logBase = path.join(root, 'results', 'transcripts', modelName, studyName, `${variant}-${run}`, task.id);
  const base = workspace.head(workdir);
  const { stream, wall_s } = runAgent(workdir, fs.readFileSync(promptFile(task), 'utf8'), MODEL, repo);
  const events = transcript.parse(stream);
  const agent = transcript.metrics(events, wall_s);
  fs.mkdirSync(path.dirname(logBase), { recursive: true });
  fs.writeFileSync(`${logBase}.jsonl`, stream);
  fs.writeFileSync(`${logBase}.md`, transcript.render(events, `${studyName} · ${variant} · ${task.id} · ${modelName} · run ${run}\n\n${transcript.headline(agent)}`));

  workspace.commit(workdir, task.id, `model=${MODEL} wall_s=${agent.wall_s} total_tokens=${agent.total_tokens} cost_usd=${agent.cost_usd}`);
  const diff = workspace.diffStat(workdir, base);
  const tests = hiddenTests(workdir, task.tests.map((f) => path.join(studyDir, f)));
  const upstream = study.upstreamSuite ? upstreamSuite(workdir, path.join(studyDir, 'variants', variant, study.upstreamSuite)) : {};
  results.push({ study: studyName, model: MODEL, run, variant, task: task.id, ...agent, diff, ...tests, ...upstream });

  const upstreamLine = study.upstreamSuite
    ? ` Upstream suite: ${upstream.upstream_ok ? 'pass' : 'FAIL'} (${upstream.upstream_passed} passed, ${upstream.upstream_failed} failed).`
    : '';
  fs.appendFileSync(`${logBase}.md`, `\n## Outcome\n\nHidden tests: ${tests.passed}/${tests.passed + tests.failed} passed.${upstreamLine} ${diff}\n` +
    tests.failing.map((t) => `- failed: ${t}\n`).join(''));
  console.log(`#${run} ${variant} ${task.id}: tests ${tests.passed}/${tests.passed + tests.failed}` +
    `${study.upstreamSuite ? `, upstream ${upstream.upstream_ok ? 'ok' : 'FAIL'}` : ''}, ` +
    `${agent.wall_s}s, ${agent.tool_calls} calls, ${agent.total_tokens} tokens, $${agent.cost_usd?.toFixed(3)}, ${diff}`);
};

for (const { run, variant, tasks: chain, branch } of plan) {
  const workdir = workspace.create(path.join(studyDir, 'variants', variant));
  for (const task of chain) runTrial(workdir, variant, task, run);
  workspace.archive(workdir, repo, `${branchPrefix}/${branch}`);
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];
console.log('\nvariant  task                    passed  median s  median tokens  median $');
for (const variant of variants) {
  for (const task of tasks) {
    const rows = results.filter((r) => r.variant === variant && r.task === task.id);
    const ok = rows.filter((r) => r.failed === 0 && r.upstream_ok !== false).length;
    console.log(`${variant.padEnd(8)} ${task.id.padEnd(23)} ${ok}/${rows.length}     ${String(median(rows.map((r) => r.wall_s))).padEnd(9)} ` +
      `${String(median(rows.map((r) => r.total_tokens))).padEnd(14)} ${median(rows.map((r) => r.cost_usd ?? 0)).toFixed(3)}`);
  }
}

const file = path.join(root, 'results', `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
console.log(`wrote ${path.relative(root, file)}`);
