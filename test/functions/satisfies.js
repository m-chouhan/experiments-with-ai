'use strict'

const { test } = require('tap')
const satisfies = require('../../functions/satisfies')
const Range = require('../../classes/range')
const maxSatisfying = require('../../ranges/max-satisfying')
const minSatisfying = require('../../ranges/min-satisfying')
const rangeInclude = require('../fixtures/range-include.js')
const rangeExclude = require('../fixtures/range-exclude.js')
test('range tests', t => {
  t.plan(rangeInclude.length)
  rangeInclude.forEach(([range, ver, options]) =>
    t.ok(satisfies(ver, range, options), `${range} satisfied by ${ver}`))
})

test('negative range tests', t => {
  t.plan(rangeExclude.length)
  rangeExclude.forEach(([range, ver, options]) =>
    t.notOk(satisfies(ver, range, options), `${range} not satisfied by ${ver}`))
})

test('invalid ranges never satisfied (but do not throw)', t => {
  const cases = [
    ['blerg', '1.2.3'],
    ['git+https://user:password0123@github.com/foo', '123.0.0', true],
    ['^1.2.3', '2.0.0-pre'],
    ['0.x', undefined],
    ['*', undefined],
  ]
  t.plan(cases.length)
  cases.forEach(([range, ver]) =>
    t.notOk(satisfies(ver, range), `${range} not satisfied because invalid`))
})

test('prereleaseTags option', t => {
  const o = { prereleaseTags: ['rc'] }
  t.equal(satisfies('1.3.0-rc.1', '^1.2.0', o), true)
  t.equal(satisfies('1.3.0-beta.1', '^1.2.0', o), false)
  t.equal(satisfies('2.0.0-rc.1', '^1.2.0', o), false)
  t.equal(satisfies('1.3.0-rc.1', '^1.2.0'), false)
  t.equal(new Range('^1.2.0').test('1.3.0-rc.1'), false)
  t.equal(new Range('^1.2.0', o).test('1.3.0-rc.1'), true)
  t.equal(new Range(new Range('^1.2.0'), o).test('1.3.0-rc.1'), true)
  t.equal(maxSatisfying(['1.2.0', '1.3.0-rc.1', '1.3.0-beta.1'], '^1.2.0', o), '1.3.0-rc.1')
  t.equal(minSatisfying(['1.3.0-rc.1', '1.3.0-beta.1'], '^1.2.0', o), '1.3.0-rc.1')
  t.end()
})
