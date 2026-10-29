// The good and bad semver twins must behave identically: every public function,
// class and constant, on every string in the fixtures plus seeded random versions
// and ranges, under each option set. Results and thrown errors must match exactly.
import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)
const load = (v) => require(path.join(root, 'projects', v))
const good = load('good')
const bad = load('bad')
const G = good.SemVer
const B = bad.SemVer

const OPTIONS = [undefined, true, { loose: true }, { includePrerelease: true }, { loose: true, includePrerelease: true }]

// Serialize any result so the twins' outputs can be compared structurally.
const ser = (x) => {
  if (x instanceof G || x instanceof B) {
    const { options, ...fields } = x
    return { SemVer: fields, options: { ...options } }
  }
  if (x instanceof good.Range || x instanceof bad.Range) {
    return { Range: x.range, raw: x.raw, loose: x.loose, includePrerelease: x.includePrerelease, set: x.set.map((s) => s.map(ser)) }
  }
  if (x instanceof good.Comparator || x instanceof bad.Comparator) {
    return { Comparator: x.value, operator: x.operator, semver: typeof x.semver === 'symbol' ? 'ANY' : ser(x.semver) }
  }
  if (Array.isArray(x)) return x.map(ser)
  if (typeof x === 'symbol') return String(x)
  return x
}
const run = (fn) => {
  try {
    return ser(fn())
  } catch (e) {
    return `throws ${e.constructor.name}: ${e.message}`
  }
}
// Call the same expression on both twins; `f(lib)` must give the same result.
const same = (f, label) => {
  const want = run(() => f(good))
  const got = run(() => f(bad))
  assert.deepStrictEqual(got, want, label)
}

// Every string literal in the fixtures, used both as versions and as ranges.
const fixtureDir = path.join(root, 'projects/good/test/fixtures')
const fixtureStrings = [...new Set(fs.readdirSync(fixtureDir).flatMap((f) => {
  const strings = []
  const walk = (v) => Array.isArray(v) ? v.forEach(walk) : typeof v === 'string' && strings.push(v)
  walk(require(path.join(fixtureDir, f)))
  return strings
}))]

const rng = (seed) => () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
const rand = rng(42)
const pick = (xs) => xs[Math.floor(rand() * xs.length)]
const NUMS = ['0', '1', '2', '3', '10', '01', 'x', 'X', '*', '99999999999999999999']
const PRE = ['alpha', 'beta', '0', '1', 'rc.1', 'a-b', '00', 'alpha.1', 'beta.2']
const randomVersion = () => {
  let v = pick(['', '', 'v', '=', 'v=', ' ', '  v']) + pick(NUMS)
  if (rand() < 0.8) v += '.' + pick(NUMS)
  if (rand() < 0.7) v += '.' + pick(NUMS)
  if (rand() < 0.35) v += pick(['-', '-', '']) + pick(PRE)
  if (rand() < 0.15) v += '+' + pick(['build', '001', 'b.1', 'x-y'])
  if (rand() < 0.03) v += pick([' ', '.4', 'garbage'])
  return v
}
const randomRange = () => {
  const comparator = () => pick(['', '', '^', '~', '~>', '>', '>=', '<', '<=', '=', '!', '^ ', '> ']) + randomVersion()
  let r = comparator()
  const n = Math.floor(rand() * 3)
  for (let i = 0; i < n; i++) r += pick([' ', ' ', '  ', ' - ', ' || ', '||']) + comparator()
  return r
}

// Versions that share a main version, so prerelease and build ordering gets exercised.
const closeVersion = () => pick(['1.2.3', '0.0.1', '1.0.0']) +
  pick(['', `-${pick(PRE)}`, `-${pick(PRE)}.${pick(PRE)}`, `-${pick(PRE)}.${pick(PRE)}.${pick(PRE)}`]) +
  (rand() < 0.3 ? `+${pick(['b', 'b.1', '2', 'a.b'])}` : '')
const close = Array.from({ length: 500 }, closeVersion)
const versions = [...fixtureStrings, ...close, ...Array.from({ length: 1500 }, randomVersion)]
const ranges = [...fixtureStrings, '>', '<', '>=', '<=', '=', '', ' ', '*', 'x', ...Array.from({ length: 1500 }, randomRange)]
const opt = () => pick(OPTIONS)
const ver = () => pick(versions)
const rangeStr = () => pick(ranges)
const N = 6000

test('constants and exported regexes are the same', () => {
  assert.deepStrictEqual(Object.keys(bad).sort(), Object.keys(good).sort())
  for (const k of ['SEMVER_SPEC_VERSION', 'RELEASE_TYPES', 'src', 'tokens']) assert.deepStrictEqual(bad[k], good[k], k)
  assert.deepStrictEqual(bad.re.map(String), good.re.map(String))
})

test('single-version functions', () => {
  for (const v of versions) {
    for (const o of OPTIONS) {
      for (const fn of ['parse', 'valid', 'clean', 'prerelease', 'major', 'minor', 'patch', 'coerce']) {
        same((lib) => lib[fn](v, o), `${fn}(${JSON.stringify(v)}, ${JSON.stringify(o)})`)
      }
      same((lib) => lib.coerce(v, { ...o, rtl: true }), `coerce rtl ${JSON.stringify(v)}`)
      same((lib) => new lib.SemVer(v, o), `new SemVer(${JSON.stringify(v)})`)
    }
  }
  for (const x of [1, 1.5, null, undefined, {}, 123456789]) {
    for (const fn of ['parse', 'valid', 'coerce']) same((lib) => lib[fn](x), `${fn}(${x})`)
  }
})

test('comparing two versions', () => {
  const fns = ['compare', 'rcompare', 'compareBuild', 'gt', 'lt', 'eq', 'neq', 'gte', 'lte']
  const ops = ['===', '!==', '', '=', '==', '!=', '>', '>=', '<', '<=', 'nope']
  for (let i = 0; i < N; i++) {
    const near = rand() < 0.4
    const a = near ? pick(close) : ver()
    const b = rand() < 0.1 ? a : near ? pick(close) : ver()
    const o = opt()
    for (const fn of fns) same((lib) => lib[fn](a, b, o), `${fn}(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${JSON.stringify(o)})`)
    same((lib) => lib.compareLoose(a, b), `compareLoose ${a} ${b}`)
    same((lib) => lib.diff(a, b), `diff ${a} ${b}`)
    const op = pick(ops)
    same((lib) => lib.cmp(a, op, b, o), `cmp ${a} ${op} ${b}`)
    same((lib) => {
      const x = new lib.SemVer(a, o)
      return [x.compare(b), x.compareMain(b), x.comparePre(b), x.compareBuild(b)]
    }, `SemVer methods ${a} ${b}`)
  }
})

test('increment and truncate', () => {
  const releases = ['major', 'premajor', 'minor', 'preminor', 'patch', 'prepatch', 'prerelease', 'release', 'pre', 'bogus']
  const ids = [undefined, 'beta', 'alpha.1', '1', '', 'a b', 'beta.1']
  const bases = [undefined, '0', '1', false]
  for (let i = 0; i < N; i++) {
    const v = ver()
    const o = opt()
    const release = pick(releases)
    const id = pick(ids)
    const base = pick(bases)
    same((lib) => lib.inc(v, release, o, id, base), `inc(${JSON.stringify(v)}, ${release}, ${JSON.stringify(o)}, ${id}, ${base})`)
    same((lib) => lib.inc(v, release, id, base), `inc(${JSON.stringify(v)}, ${release}, ${id}, ${base})`)
    same((lib) => new lib.SemVer(v, o).inc(release, id, base), `SemVer#inc ${v} ${release}`)
    same((lib) => lib.truncate(v, release, o), `truncate ${v} ${release}`)
  }
})

test('parsing ranges and comparators', () => {
  for (const r of ranges) {
    for (const o of OPTIONS) {
      same((lib) => new lib.Range(r, o), `new Range(${JSON.stringify(r)}, ${JSON.stringify(o)})`)
      same((lib) => lib.validRange(r, o), `validRange ${r}`)
      same((lib) => lib.toComparators(r, o), `toComparators ${r}`)
      same((lib) => lib.minVersion(r, o), `minVersion ${r}`)
      same((lib) => new lib.Comparator(r, o), `new Comparator(${JSON.stringify(r)})`)
    }
  }
})

test('versions against ranges', () => {
  for (let i = 0; i < N * 2; i++) {
    const v = ver()
    const r = rangeStr()
    const o = opt()
    const label = `(${JSON.stringify(v)}, ${JSON.stringify(r)}, ${JSON.stringify(o)})`
    same((lib) => lib.satisfies(v, r, o), `satisfies${label}`)
    same((lib) => lib.gtr(v, r, o), `gtr${label}`)
    same((lib) => lib.ltr(v, r, o), `ltr${label}`)
    const hilo = pick(['>', '<', '?'])
    same((lib) => lib.outside(v, r, hilo, o), `outside ${hilo}${label}`)
    same((lib) => new lib.Comparator(r, o).test(v), `Comparator#test${label}`)
  }
})

test('range against range', () => {
  for (let i = 0; i < N; i++) {
    const a = rangeStr()
    const b = rand() < 0.1 ? a : rangeStr()
    const o = opt()
    const label = `(${JSON.stringify(a)}, ${JSON.stringify(b)}, ${JSON.stringify(o)})`
    same((lib) => lib.intersects(a, b, o), `intersects${label}`)
    same((lib) => lib.subset(a, b, o), `subset${label}`)
    same((lib) => new lib.Comparator(a, o).intersects(new lib.Comparator(b, o), o), `Comparator#intersects${label}`)
  }
})

test('lists of versions', () => {
  const valid = versions.filter((v) => good.valid(v, true))
  for (let i = 0; i < N / 4; i++) {
    const list = Array.from({ length: 1 + Math.floor(rand() * 12) }, () => pick(valid))
    const r = rangeStr()
    const o = opt()
    const label = `(${JSON.stringify(list)}, ${JSON.stringify(r)}, ${JSON.stringify(o)})`
    same((lib) => lib.sort([...list], true), `sort${label}`)
    same((lib) => lib.rsort([...list], true), `rsort${label}`)
    same((lib) => lib.maxSatisfying(list, r, o), `maxSatisfying${label}`)
    same((lib) => lib.minSatisfying(list, r, o), `minSatisfying${label}`)
    same((lib) => lib.simplifyRange([...list], r, o), `simplifyRange${label}`)
  }
})
