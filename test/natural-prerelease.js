'use strict'

const { test } = require('tap')
const semver = require('../')

const o = { naturalPrerelease: true }

test('naturalPrerelease ordering', (t) => {
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10', o), -1)
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10'), 1)
  t.equal(semver.rcompare('1.0.0-rc9', '1.0.0-rc10', o), 1)
  t.ok(semver.lt('1.0.0-alpha2', '1.0.0-alpha11', o))
  t.ok(semver.lte('1.0.0-alpha2', '1.0.0-alpha11', o))
  t.ok(semver.gt('1.0.0-alpha11', '1.0.0-alpha2', o))
  t.ok(semver.gte('1.0.0-alpha11', '1.0.0-alpha2', o))
  t.ok(semver.neq('1.0.0-rc01', '1.0.0-rc1', o))
  t.ok(semver.eq('1.0.0-rc1', '1.0.0-rc1', o))
  t.ok(semver.lt('1.0.0-1', '1.0.0-a1', o), 'numeric before alphanumeric')
  t.equal(semver.compareBuild('1.0.0-rc1+2', '1.0.0-rc1+10', o), -1,
    'build metadata unchanged (numeric ids)')
  // an existing SemVer object must not leak its own options
  t.equal(semver.compare(new semver.SemVer('1.0.0-rc9'), '1.0.0-rc10', o), -1)
  t.end()
})

test('naturalPrerelease sort and ranges', (t) => {
  const list = ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2']
  t.same(semver.sort(list.slice(), o), ['1.0.0-rc2', '1.0.0-rc9', '1.0.0-rc10'])
  t.same(semver.rsort(list.slice(), o), ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2'])
  const ro = { ...o, includePrerelease: true }
  t.equal(semver.maxSatisfying(list, '>=1.0.0-rc1', ro), '1.0.0-rc10')
  t.equal(semver.minSatisfying(list, '>=1.0.0-rc1', ro), '1.0.0-rc2')
  t.ok(semver.satisfies('1.0.0-rc9', '>=1.0.0-rc2 <1.0.0-rc10', o))
  t.notOk(semver.satisfies('1.0.0-rc9', '>=1.0.0-rc2 <1.0.0-rc10'))
  t.end()
})
