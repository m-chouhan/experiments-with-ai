// Data for the blog's interactive widgets, written to data/ (the portfolio's sync copies it from there).
// Usage: node analysis/blog-data.mjs
// context-per-turn.json: for the median good and bad Haiku runs of task 2, how many tokens each turn
// sent (the whole conversation so far) and what the agent asked for in that turn.
// consolidated-results.json: the README's "Consolidated results" section, so its tables stay the one copy.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as transcript from '../harness/transcript.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const transcripts = path.join(root, 'results/v4')

const MEDIAN_RUNS = {
  good: { label: 'good, run 1', file: 'transcripts/haiku/semver/good-1/t2-prerelease-tags.jsonl' },
  bad: { label: 'bad, pilot', file: 'pilot/transcripts/haiku/semver/bad-1/t2-prerelease-tags.jsonl' },
}

const describe = ({ name, input }, cwd) => {
  const file = (p) => path.relative(cwd, path.resolve(cwd, p))
  if (name === 'Read' || name === 'Edit' || name === 'Write') return `${name} ${file(input.file_path)}`
  if (name === 'Bash') return `$ ${input.command.replaceAll(`${cwd}/`, '').replaceAll(cwd, '.').split('\n')[0].slice(0, 48)}`
  if (name === 'Grep') return `Grep "${input.pattern.slice(0, 32)}"`
  return `${name} ${input.pattern ?? ''}`.trim()
}

const turnsOf = (file) => {
  const events = transcript.parse(fs.readFileSync(path.join(transcripts, file), 'utf8'))
  const cwd = transcript.workdir(events)
  const turns = new Map()
  for (const e of events.filter((e) => e.type === 'assistant')) {
    const { id, usage, content } = e.message
    if (!turns.has(id)) {
      const tokens = usage.input_tokens + usage.cache_creation_input_tokens + usage.cache_read_input_tokens
      turns.set(id, { tokens, actions: [] })
    }
    for (const call of content.filter((b) => b.type === 'tool_use')) turns.get(id).actions.push(describe(call, cwd))
  }
  return [...turns.values()]
}

const runs = Object.fromEntries(Object.entries(MEDIAN_RUNS).map(([variant, { label, file }]) =>
  [variant, { label, turns: turnsOf(file) }]))

const write = (file, data) => {
  const out = path.join(root, 'data', file)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, `${JSON.stringify(data)}\n`)
}

write('context-per-turn.json', runs)
for (const [variant, { turns }] of Object.entries(runs)) {
  const sent = turns.reduce((n, t) => n + t.tokens, 0)
  console.log(`${variant}: ${turns.length} turns, ${(sent / 1e6).toFixed(2)}M input tokens sent`)
}

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
const section = readme.split('## Consolidated results')[1].split(/\n## /)[0]
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
const tables = section.split(/\n\s*\n/).filter((block) => block.trim().startsWith('|')).map((block) => {
  const [header, , ...rows] = block.trim().split('\n')
  return { header: cells(header), rows: rows.map(cells) }
})
const [trials, rounds] = tables
write('consolidated-results.json', { trials, rounds })
console.log(`consolidated: ${trials.rows.length} rows, ${rounds.rows.length} rounds`)
