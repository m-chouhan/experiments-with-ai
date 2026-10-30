'use strict'

const { test } = require('tap')
const semver = require('../')

const o = { naturalPrerelease: true }

test('naturalPrerelease orders digit runs numerically', t => {
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10', o), -1)
  t.equal(semver.compare('1.0.0-rc9', '1.0.0-rc10'), 1, 'unchanged without option')
  t.equal(semver.rcompare('1.0.0-rc9', '1.0.0-rc10', o), 1)
  t.equal(semver.compareBuild('1.0.0-alpha2', '1.0.0-alpha11', o), -1)
  t.ok(semver.lt('1.0.0-alpha2', '1.0.0-alpha11', o))
  t.ok(semver.lte('1.0.0-alpha2', '1.0.0-alpha11', o))
  t.ok(semver.gt('1.0.0-alpha11', '1.0.0-alpha2', o))
  t.ok(semver.gte('1.0.0-alpha11', '1.0.0-alpha2', o))
  t.ok(semver.neq('1.0.0-rc9', '1.0.0-rc10', o))
  t.notOk(semver.eq('1.0.0-rc9', '1.0.0-rc10', o))
  t.equal(semver.compare('1.0.0-rc1.a2', '1.0.0-rc1.a10', o), -1)
  t.equal(semver.compare('1.0.0-x2y10', '1.0.0-x2y9', o), 1)
  t.end()
})

test('naturalPrerelease keeps other ordering rules', t => {
  t.equal(semver.compare('1.0.0-1', '1.0.0-rc1', o), -1, 'numeric before alphanumeric')
  t.equal(semver.compare('1.0.0-rc1+b2', '1.0.0-rc1+b10', o), 0)
  t.equal(semver.compareBuild('1.0.0-rc1+b2', '1.0.0-rc1+b10', o), 1, 'build is not natural')
  t.end()
})

test('naturalPrerelease in sorting and ranges', t => {
  const l = ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2']
  const op = { naturalPrerelease: true, includePrerelease: true }
  t.strictSame(semver.sort(l.slice(), o), ['1.0.0-rc2', '1.0.0-rc9', '1.0.0-rc10'])
  t.strictSame(semver.rsort(l.slice(), o), ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc2'])
  t.equal(semver.maxSatisfying(l, '>=1.0.0-rc1', op), '1.0.0-rc10')
  t.equal(semver.minSatisfying(l, '>=1.0.0-rc1', op), '1.0.0-rc2')
  t.ok(semver.satisfies('1.0.0-rc10', '>1.0.0-rc9', o))
  t.notOk(semver.satisfies('1.0.0-rc10', '>1.0.0-rc9'), 'not cached across options')
  t.ok(semver.satisfies(new semver.SemVer('1.0.0-rc10'), '>1.0.0-rc9', o))
  t.end()
})
