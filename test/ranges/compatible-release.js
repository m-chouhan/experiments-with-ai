'use strict'

const { test } = require('tap')
const toComparators = require('../../ranges/to-comparators')
const satisfies = require('../../functions/satisfies')
const minVersion = require('../../ranges/min-version')

test('compatible release comparators test', (t) => {
  // [range, comparators]
  [
    // Basic compatible release ranges
    ['~=1.2.3', [['>=1.2.3', '<1.3.0-0']]],
    ['~=1.2', [['>=1.2.0', '<2.0.0-0']]],
    ['~=1', [['>=1.0.0', '<2.0.0-0']]],

    // With leading v
    ['~=1.2.3', [['>=1.2.3', '<1.3.0-0']]],

    // Edge cases with zero
    ['~=0', [['<1.0.0-0']]],
    ['~=0.2', [['>=0.2.0', '<1.0.0-0']]],
    ['~=0.2.3', [['>=0.2.3', '<0.3.0-0']]],

    // With prerelease
    ['~=1.2.3-beta.2', [['>=1.2.3-beta.2', '<1.3.0-0']]],
    ['~=1.2.0-rc.1', [['>=1.2.0-rc.1', '<1.3.0-0']]],

    // With spaces
    ['~= 1.2.3', [['>=1.2.3', '<1.3.0-0']]],
    ['~= 1.2', [['>=1.2.0', '<2.0.0-0']]],
    ['~= 1', [['>=1.0.0', '<2.0.0-0']]],
  ].forEach(([pre, wanted]) => {
    const found = toComparators(pre)
    const jw = JSON.stringify(wanted)
    t.same(found, wanted, `toComparators(${pre}) === ${jw}`)
  })

  t.end()
})

test('compatible release satisfies test', (t) => {
  // [version, range, expected]
  [
    // ~=1.2.3 tests
    ['1.2.3', '~=1.2.3', true],
    ['1.2.4', '~=1.2.3', true],
    ['1.2.5', '~=1.2.3', true],
    ['1.3.0', '~=1.2.3', false],
    ['1.1.0', '~=1.2.3', false],
    ['2.0.0', '~=1.2.3', false],

    // ~=1.2 tests
    ['1.2.0', '~=1.2', true],
    ['1.2.5', '~=1.2', true],
    ['1.5.0', '~=1.2', true],
    ['2.0.0', '~=1.2', false],
    ['1.0.0', '~=1.2', false],

    // ~=1 tests
    ['1.0.0', '~=1', true],
    ['1.5.0', '~=1', true],
    ['1.99.99', '~=1', true],
    ['2.0.0', '~=1', false],
    ['0.9.9', '~=1', false],

    // ~=0.2.3 tests
    ['0.2.3', '~=0.2.3', true],
    ['0.2.4', '~=0.2.3', true],
    ['0.3.0', '~=0.2.3', false],
    ['0.1.0', '~=0.2.3', false],

    // ~=0.2 tests
    ['0.2.0', '~=0.2', true],
    ['0.2.5', '~=0.2', true],
    ['0.5.0', '~=0.2', true],
    ['1.0.0', '~=0.2', false],
    ['0.1.0', '~=0.2', false],

    // ~=0 tests
    ['0.0.0', '~=0', true],
    ['0.5.0', '~=0', true],
    ['0.99.99', '~=0', true],
    ['1.0.0', '~=0', false],

    // Prerelease tests
    ['1.2.3-beta.1', '~=1.2.3-beta.1', true],
    ['1.2.3-beta.2', '~=1.2.3-beta.1', true],
    ['1.2.4', '~=1.2.3-beta.1', true],
    ['1.3.0', '~=1.2.3-beta.1', false],
  ].forEach(([version, range, expected]) => {
    const found = satisfies(version, range)
    t.equal(found, expected, `satisfies(${version}, ${range}) === ${expected}`)
  })

  t.end()
})

test('compatible release minVersion test', (t) => {
  // [range, expected]
  [
    ['~=1.2.3', '1.2.3'],
    ['~=1.2', '1.2.0'],
    ['~=1', '1.0.0'],
    ['~=0.2.3', '0.2.3'],
    ['~=0.2', '0.2.0'],
    ['~=0', '0.0.0'],
    ['~=1.2.3-beta.2', '1.2.3-beta.2'],
  ].forEach(([range, expected]) => {
    const found = minVersion(range)
    t.equal(found.version, expected, `minVersion(${range}) === ${expected}`)
  })

  t.end()
})
