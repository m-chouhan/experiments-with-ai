'use strict'

const t = require('tap')
const semver = require('../../')
const o = { naturalPrerelease: true }

t.test('natural prerelease ordering', t => {
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10', o), -1)
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10'), 1)
  t.equal(semver.rcompare('1.0.0-alpha2', '1.0.0-alpha11', o), 1)
  t.equal(semver.compareBuild('1.0.0-rc9+b', '1.0.0-rc10+a', o), -1)
  t.ok(semver.lt('1.0.0-alpha2', '1.0.0-alpha11', o))
  t.ok(semver.lte('1.0.0-rc9', '1.0.0-rc10', o))
  t.ok(semver.gt('1.0.0-rc10', '1.0.0-rc9', o))
  t.ok(semver.gte('1.0.0-rc10', '1.0.0-rc9', o))
  t.ok(semver.neq('1.0.0-rc10', '1.0.0-rc9', o))
  t.ok(semver.eq('1.0.0-rc10', '1.0.0-rc10', o))
  // numeric before alphanumeric, plain strings unaffected
  t.equal(semver.compare('1.0.0-1', '1.0.0-a', o), -1)
  t.equal(semver.compare('1.0.0-rc.2', '1.0.0-rc.10', o), -1)
  t.equal(semver.compare('1.0.0-rc', '1.0.0-rc1', o), -1)
  t.equal(semver.compare('1.0.0-a1b2', '1.0.0-a1b10', o), -1)
  t.equal(semver.compare('1.0.0-rc1', '1.0.0-rc01', o), 1)
  t.end()
})

t.test('sort, rsort, satisfying, ranges', t => {
  const list = ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2']
  t.same(semver.sort([...list], o), ['1.0.0-rc2', '1.0.0-rc9', '1.0.0-rc10'])
  t.same(semver.rsort([...list], o), ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2'])
  const ro = { ...o, includePrerelease: true }
  t.equal(semver.maxSatisfying(list, '>=1.0.0-rc1', ro), '1.0.0-rc10')
  t.equal(semver.minSatisfying(list, '>=1.0.0-rc1', ro), '1.0.0-rc2')
  t.ok(semver.satisfies('1.0.0-rc10', '>=1.0.0-rc9', o))
  t.notOk(semver.satisfies('1.0.0-rc10', '>=1.0.0-rc9'))
  t.notOk(semver.satisfies('1.0.0-rc10', '<1.0.0-rc9', o))
  // an existing SemVer object does not carry stale options
  const v = new semver.SemVer('1.0.0-rc10')
  t.ok(semver.gt(v, '1.0.0-rc9', o))
  t.notOk(semver.gt(v, '1.0.0-rc9'))
  t.end()
})
