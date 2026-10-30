'use strict'

const { test } = require('tap')
const semver = require('../../')

const o = { naturalPrerelease: true }
// [greater, lesser]
const pairs = [
  ['1.0.0-rc10', '1.0.0-rc9'],
  ['1.0.0-alpha11', '1.0.0-alpha2'],
  ['1.0.0-rc.1a10', '1.0.0-rc.1a9'],
  ['1.0.0-rc10', '1.0.0-rc2'],
  ['1.0.0-rc1', '1.0.0-1'],
  ['1.0.0-rc1', '1.0.0-rc'],
  ['1.0.0-rc2', '1.0.0-rc1b'],
  ['1.0.0-rc1', '1.0.0-rc01'],
]

test('natural prerelease ordering', t => {
  for (const [hi, lo] of pairs) {
    t.equal(semver.compare(hi, lo, o), 1, `compare ${hi} ${lo}`)
    t.equal(semver.compare(lo, hi, o), -1, `compare ${lo} ${hi}`)
    t.equal(semver.rcompare(hi, lo, o), -1, `rcompare ${hi} ${lo}`)
    t.equal(semver.compareBuild(hi, lo, o), 1, `compareBuild ${hi} ${lo}`)
    t.ok(semver.gt(hi, lo, o), `gt ${hi} ${lo}`)
    t.ok(semver.gte(hi, lo, o), `gte ${hi} ${lo}`)
    t.ok(semver.lt(lo, hi, o), `lt ${lo} ${hi}`)
    t.ok(semver.lte(lo, hi, o), `lte ${lo} ${hi}`)
    t.ok(semver.neq(lo, hi, o), `neq ${lo} ${hi}`)
    t.notOk(semver.eq(lo, hi, o), `eq ${lo} ${hi}`)
    t.ok(new semver.SemVer(hi, o).compare(lo) > 0, `SemVer#compare ${hi} ${lo}`)
    // instances created without the option still honour the option
    t.ok(semver.gt(new semver.SemVer(hi), new semver.SemVer(lo), o), `instances ${hi} ${lo}`)
  }
  t.end()
})

test('default behaviour is unchanged', t => {
  t.equal(semver.compare('1.0.0-rc10', '1.0.0-rc9'), -1)
  t.equal(semver.compare('1.0.0-alpha11', '1.0.0-alpha2'), -1)
  t.equal(semver.compare('1.0.0-rc10', '1.0.0-rc9', { naturalPrerelease: false }), -1)
  t.end()
})

test('numeric identifiers still sort before alphanumeric ones', t => {
  t.equal(semver.compare('1.0.0-9', '1.0.0-a1', o), -1)
  t.equal(semver.compare('1.0.0-10', '1.0.0-9', o), 1)
  t.equal(semver.compare('1.0.0-rc.10', '1.0.0-rc.9', o), 1)
  t.end()
})

test('build metadata is unaffected', t => {
  t.equal(semver.compare('1.0.0-rc1+b10', '1.0.0-rc1+b9', o), 0)
  t.equal(semver.compareBuild('1.0.0-rc1+b10', '1.0.0-rc1+b9', o), -1)
  t.equal(semver.compareBuild(new semver.SemVer('1.0.0-rc1+a'), '1.0.0-rc1+b', o), -1)
  t.end()
})

test('sort, rsort, min/maxSatisfying', t => {
  const list = ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2', '1.0.0']
  t.same(semver.sort(list.slice(), o), ['1.0.0-rc2', '1.0.0-rc9', '1.0.0-rc10', '1.0.0'])
  t.same(semver.rsort(list.slice(), o), ['1.0.0', '1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2'])
  const pre = list.slice(0, 3)
  t.equal(semver.maxSatisfying(pre, '>=1.0.0-0', { ...o, includePrerelease: true }), '1.0.0-rc10')
  t.equal(semver.minSatisfying(pre, '>=1.0.0-rc0', o), '1.0.0-rc2')
  t.equal(semver.maxSatisfying(pre, '>=1.0.0-rc0', { includePrerelease: true }), '1.0.0-rc9')
  t.end()
})

test('ranges', t => {
  t.ok(semver.satisfies('1.0.0-rc10', '>1.0.0-rc9', o))
  t.notOk(semver.satisfies('1.0.0-rc10', '>1.0.0-rc9'))
  t.ok(semver.satisfies('1.0.0-rc9', '<1.0.0-rc10', o))
  t.notOk(semver.satisfies('1.0.0-rc9', '<1.0.0-rc10'))
  // range cache must not leak across option sets
  t.ok(semver.satisfies('1.0.0-rc10', '>=1.0.0-rc9 <1.0.0', o))
  t.notOk(semver.satisfies('1.0.0-rc10', '>=1.0.0-rc9 <1.0.0'))
  const r = new semver.Range('>1.0.0-rc9')
  t.ok(new semver.Range(r, o).test('1.0.0-rc10'))
  t.notOk(r.test('1.0.0-rc10'))
  t.end()
})
