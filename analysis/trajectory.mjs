// Step-level metrics from saved transcripts: what the agent spent its steps on.
// Usage: node analysis/trajectory.mjs <transcripts dir>...   (finds every semver or parking *.jsonl below)
// Per run: turns, tool calls by kind, distinct source files read, re-reads of a file already
// read (SonarSource's "revisits"), test runs, and how many of the reference solution's files
// the agent edited (and edits outside them; semver only, parking is a single main.js).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const refDir = path.join(root, 'tests/semver/reference')
const referenceFiles = (version, task) => {
  const patch = fs.readFileSync(path.join(refDir, `${version}-${task}.patch`), 'utf8')
  return new Set([...patch.matchAll(/^\+\+\+ b\/(.+)$/gm)].map((m) => m[1]))
}

const jsonlFiles = (dir) => fs.readdirSync(dir, { recursive: true })
  .filter((f) => f.endsWith('.jsonl') && /semver|parking/.test(f)).map((f) => path.join(dir, f))

// Workdir-relative path of a tool's file argument, or null for scratch files outside the project.
const rel = (p) => {
  const m = /\/T\/(?:semver|parking)-(?:good|bad|junior|mature)-[^/]+\/(.+)$/.exec(p ?? '')
  return m ? m[1] : null
}
const isLibFile = (f) => f && /^(classes|functions|internal|ranges)\/[^/]+\.js$|^index\.js$|^main\.js$/.test(f)

const rows = []
for (const dir of process.argv.slice(2)) {
  for (const file of jsonlFiles(dir)) {
    const [, version, run] = /(good|bad|junior|mature)-(\d+)/.exec(file)
    const task = path.basename(file, '.jsonl')
    const label = file.includes('pilot') ? 'pilot' : run
    const events = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    const calls = events.filter((e) => e.type === 'assistant').flatMap((e) => e.message.content).filter((b) => b.type === 'tool_use')
    const result = events.findLast((e) => e.type === 'result') ?? {}

    const reads = calls.filter((c) => c.name === 'Read').map((c) => rel(c.input.file_path)).filter(isLibFile)
    const readCounts = reads.reduce((m, f) => m.set(f, (m.get(f) ?? 0) + 1), new Map())
    const edited = new Set(calls.filter((c) => c.name === 'Edit' || c.name === 'Write').map((c) => rel(c.input.file_path)).filter(isLibFile))
    const ref = file.includes('semver') ? referenceFiles(version, task) : null
    const refLib = ref ? [...ref].filter(isLibFile) : []
    const bash = calls.filter((c) => c.name === 'Bash').map((c) => c.input.command)

    rows.push({
      task, version, run: label,
      turns: result.num_turns,
      calls: calls.length,
      searches: calls.filter((c) => c.name === 'Grep' || c.name === 'Glob').length + bash.filter((b) => /^\s*(grep|rg|find)\b/.test(b)).length,
      reads: reads.length,
      files_read: readCounts.size,
      rereads: reads.length - readCounts.size,
      edits: calls.filter((c) => c.name === 'Edit' || c.name === 'Write').length,
      scratch_files: calls.filter((c) => c.name === 'Write' && !isLibFile(rel(c.input.file_path)) && !/README/.test(c.input.file_path)).length,
      test_runs: bash.filter((b) => /\b(npm (run )?test|tap|node --test)\b/.test(b)).length,
      ref_files_edited: ref ? `${refLib.filter((f) => edited.has(f)).length}/${refLib.length}` : '-',
      other_files_edited: ref ? [...edited].filter((f) => !ref.has(f)).length : '-',
      tokens: Object.values(result.modelUsage ?? {}).reduce((n, m) => n + m.inputTokens + m.outputTokens + m.cacheReadInputTokens + m.cacheCreationInputTokens, 0),
    })
  }
}

rows.sort((a, b) => a.task.localeCompare(b.task) || a.version.localeCompare(b.version) * -1 || String(a.run).localeCompare(String(b.run)))
const keys = Object.keys(rows[0])
console.log(`| ${keys.join(' | ')} |\n|${keys.map(() => '---').join('|')}|`)
for (const r of rows) console.log(`| ${keys.map((k) => k === 'tokens' ? `${(r[k] / 1e6).toFixed(2)}M` : r[k]).join(' | ')} |`)
