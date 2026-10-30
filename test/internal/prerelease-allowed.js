'use strict'

const t = require('tap')
const satisfies = require('../../functions/satisfies')
const maxSatisfying = require('../../ranges/max-satisfying')
const minSatisfying = require('../../ranges/min-satisfying')
const Range = require('../../classes/range')

const opts = { prereleaseTags: ['rc'] }

t.test('prereleaseTags', t => {
  t.equal(satisfies('1.3.0-rc.1', '^1.2.0', opts), true)
  t.equal(satisfies('1.3.0-beta.1', '^1.2.0', opts), false)
  t.equal(satisfies('2.0.0-rc.1', '^1.2.0', opts), false)
  t.equal(satisfies('1.3.0-rc.1', '^1.2.0'), false)
  t.equal(maxSatisfying(['1.2.0', '1.3.0-rc.1'], '^1.2.0', opts), '1.3.0-rc.1')
  t.equal(minSatisfying(['1.3.0-rc.1', '1.4.0'], '>=1.2.0', opts), '1.3.0-rc.1')
  t.equal(new Range('^1.2.0', opts).test('1.3.0-rc.1'), true)
  t.equal(new Range(new Range('^1.2.0'), opts).test('1.3.0-rc.1'), true)
  t.end()
})
