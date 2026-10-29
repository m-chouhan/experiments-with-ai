// Usage: node harness/analyze.mjs [results/results.csv]
// Per cell: pass rate over all runs, then median [min–max] over passing runs only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [header, ...lines] = fs.readFileSync(process.argv[2] ?? path.join(root, 'results', 'results.csv'), 'utf8')
  .trim().split('\n').map((l) => l.split(','));
const rows = lines.map((l) => Object.fromEntries(header.map((h, i) => [h, l[i]])));

const METRICS = [
  ['wall s', (r) => r.wall_ms / 1000],
  ['total tok', (r) => +r.total_tokens],
  ['output tok', (r) => +r.output_tokens],
  ['cost $', (r) => +r.cost_usd],
  ['turns', (r) => +r.turns],
  ['tool calls', (r) => +r.tool_calls],
  ['tool out chars', (r) => +r.tool_output_chars],
  ['lines +/-', (r) => +r.lines_added + +r.lines_removed],
];

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (x) => (Math.abs(x) >= 100 ? Math.round(x).toString() : x.toFixed(x < 1 ? 3 : 1));

const table = [['cell', 'pass', ...METRICS.map(([name]) => name)]];
for (const project of ['designed', 'poor']) for (const prompt of ['careful', 'vague']) {
  const cell = rows.filter((r) => r.project === project && r.prompt === prompt);
  if (!cell.length) continue;
  const ok = cell.filter((r) => r.passed === 'true');
  table.push([`${project}/${prompt}`, `${ok.length}/${cell.length}`, ...METRICS.map(([, f]) => {
    if (!ok.length) return '-';
    const xs = ok.map(f);
    return `${fmt(median(xs))} [${fmt(Math.min(...xs))}–${fmt(Math.max(...xs))}]`;
  })]);
}

const widths = table[0].map((_, i) => Math.max(...table.map((r) => r[i].length)));
for (const r of table) console.log(r.map((c, i) => c.padEnd(widths[i])).join('  '));

const failures = rows.filter((r) => r.passed !== 'true');
if (failures.length) {
  console.log('\nfailures:');
  for (const r of failures) {
    console.log(`  ${r.project}/${r.prompt} #${r.run}: regression=${r.regression_failed} golden=${r.golden_failed} feature=${r.feature_failed} (${r.id})`);
  }
}
