// Static design metrics for each project version (every source file outside test/).
// Usage: node analysis/measure.mjs semver good bad
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import sonarjs from 'eslint-plugin-sonarjs'
import escomplex from 'typhonjs-escomplex'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const bin = (name) => path.join(here, 'node_modules', '.bin', name)

const SKIP = /^(test|node_modules|\.nyc_output)(\/|$)/
const sourceFiles = (dir) => fs.readdirSync(dir, { recursive: true })
  .filter((f) => /\.m?js$/.test(f) && !SKIP.test(f)).sort().map((f) => path.join(dir, f))

const codeLines = (src) => src.split('\n').filter((l) => !/^\s*($|\/\/|\*|\/\*)/.test(l)).length
const sum = (xs) => xs.reduce((a, b) => a + b, 0)
const max = (xs) => Math.max(...xs)
const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`

async function measure (study, version) {
  const dir = path.join(root, 'studies', study, 'variants', version)
  const files = sourceFiles(dir)
  const sources = files.map((f) => fs.readFileSync(f, 'utf8'))

  // Size
  const lines = sources.map(codeLines)

  // Cyclomatic complexity, Halstead effort, maintainability index
  const reports = sources.map((s) => escomplex.analyzeModule(s, { commonjs: true, esmImportExport: true }))
  const fns = reports.flatMap((r) => r.methods)
  const cyclo = fns.map((m) => m.cyclomatic)

  // Cognitive complexity and SonarQube code smells
  const eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: true,
    overrideConfig: [{
      files: ['**/*.js', '**/*.mjs'],
      languageOptions: { ecmaVersion: 'latest', sourceType: 'commonjs' },
      plugins: { sonarjs },
      rules: { ...sonarjs.configs.recommended.rules, 'sonarjs/cognitive-complexity': ['error', 0] },
    }],
  })
  const results = await eslint.lintFiles(files)
  const messages = results.flatMap((r) => r.messages)
  const cognitive = messages.filter((m) => m.ruleId === 'sonarjs/cognitive-complexity')
    .map((m) => Number(/from (\d+) to/.exec(m.message)?.[1] ?? 0))
  const smells = messages.filter((m) => m.ruleId && m.ruleId !== 'sonarjs/cognitive-complexity')

  // Duplication
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jscpd-'))
  execFileSync(bin('jscpd'), ['--silent', '--min-tokens', '50', '--reporters', 'json', '--output', out,
    '--format', 'javascript', '--formats-exts', 'javascript:js,mjs', ...files])
  const dup = JSON.parse(fs.readFileSync(path.join(out, 'jscpd-report.json'), 'utf8')).statistics.total
  fs.rmSync(out, { recursive: true, force: true })

  // Module dependencies
  const graph = JSON.parse(execFileSync(bin('depcruise'), ['--no-config', '--output-type', 'json',
    '--do-not-follow', 'node_modules', ...files.map((f) => path.relative(dir, f))], { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))
  const internal = graph.modules.filter((m) => !m.source.includes('node_modules') && !m.coreModule)
  const edges = internal.flatMap((m) => m.dependencies.filter((d) => !d.resolved.includes('node_modules')))
  const fanOut = internal.map((m) => m.dependencies.filter((d) => !d.resolved.includes('node_modules')).length)

  return {
    files: files.length,
    'code lines': sum(lines),
    'largest file (lines)': max(lines),
    functions: fns.length,
    'cyclomatic: mean / max': `${(sum(cyclo) / cyclo.length).toFixed(2)} / ${max(cyclo)}`,
    'functions with cyclomatic > 10': cyclo.filter((c) => c > 10).length,
    'cognitive: total / max': `${sum(cognitive)} / ${max(cognitive)}`,
    'functions with cognitive > 15 (Sonar limit)': cognitive.filter((c) => c > 15).length,
    'Halstead effort (total, millions)': (sum(reports.map((r) => sum(r.methods.map((m) => m.halstead.effort)))) / 1e6).toFixed(2),
    'maintainability index: mean / min': `${(sum(reports.map((r) => r.maintainability)) / reports.length).toFixed(1)} / ${Math.min(...reports.map((r) => r.maintainability)).toFixed(1)}`,
    'Sonar code smells': smells.length,
    'duplicated lines': `${dup.duplicatedLines} (${pct(dup.duplicatedLines, dup.lines)})`,
    'duplicate blocks': dup.clones,
    'internal imports (edges)': edges.length,
    'max fan-out': max(fanOut),
    _smells: Object.entries(smells.reduce((a, m) => ({ ...a, [m.ruleId]: (a[m.ruleId] ?? 0) + 1 }), {})),
  }
}

const [study, ...versions] = process.argv.slice(2)
const data = {}
for (const v of versions) data[v] = await measure(study, v)

const keys = Object.keys(data[versions[0]]).filter((k) => !k.startsWith('_'))
console.log(`| metric | ${versions.join(' | ')} |\n|---|${versions.map(() => '---').join('|')}|`)
for (const k of keys) console.log(`| ${k} | ${versions.map((v) => data[v][k]).join(' | ')} |`)
for (const v of versions) console.log(`\n${v} smells by rule: ${data[v]._smells.map(([r, n]) => `${r.replace('sonarjs/', '')} ${n}`).join(', ')}`)
