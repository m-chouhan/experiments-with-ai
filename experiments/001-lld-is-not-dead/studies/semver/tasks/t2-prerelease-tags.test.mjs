import { semver, expect } from '../helpers.mjs'

const { satisfies, maxSatisfying, minSatisfying, Range } = semver
const rc = { prereleaseTags: ['rc'] }

expect('satisfies 1.3.0-rc.1 ^1.2.0 {rc}', () => satisfies('1.3.0-rc.1', '^1.2.0', rc), true)
expect('satisfies 1.3.0-rc ^1.2.0 {rc}', () => satisfies('1.3.0-rc', '^1.2.0', rc), true)
expect('satisfies 1.3.0-beta.1 ^1.2.0 {rc}', () => satisfies('1.3.0-beta.1', '^1.2.0', rc), false)
expect('satisfies 1.3.0-rcx.1 ^1.2.0 {rc}: tag must match exactly', () => satisfies('1.3.0-rcx.1', '^1.2.0', rc), false)
expect('satisfies 2.0.0-rc.1 ^1.2.0 {rc}: outside bounds', () => satisfies('2.0.0-rc.1', '^1.2.0', rc), false)
expect('satisfies 1.1.0-rc.1 ^1.2.0 {rc}: below bounds', () => satisfies('1.1.0-rc.1', '^1.2.0', rc), false)
expect('satisfies 1.3.0-beta.1 ^1.2.0 {rc, beta}', () => satisfies('1.3.0-beta.1', '^1.2.0', { prereleaseTags: ['rc', 'beta'] }), true)
expect('satisfies 1.5.0-rc.2 >=1.0.0 <2.0.0 {rc}', () => satisfies('1.5.0-rc.2', '>=1.0.0 <2.0.0', rc), true)
expect('satisfies 1.5.0-rc.2 1.x || 3.x {rc}', () => satisfies('1.5.0-rc.2', '1.x || 3.x', rc), true)
expect('Range#test 1.3.0-rc.1 ^1.2.0 {rc}', () => new Range('^1.2.0', rc).test('1.3.0-rc.1'), true)
expect('maxSatisfying picks the rc', () => maxSatisfying(['1.2.0', '1.3.0-rc.1', '1.3.0-beta.2'], '^1.2.0', rc), '1.3.0-rc.1')
expect('minSatisfying picks the rc', () => minSatisfying(['1.4.0', '1.3.0-rc.1', '1.2.5-beta.1'], '^1.2.0', rc), '1.3.0-rc.1')

// Unchanged behaviour
expect('without the option 1.3.0-rc.1 does not satisfy ^1.2.0', () => satisfies('1.3.0-rc.1', '^1.2.0'), false)
expect('without the option maxSatisfying skips the rc', () => maxSatisfying(['1.2.0', '1.3.0-rc.1'], '^1.2.0'), '1.2.0')
expect('same-tuple prerelease still allowed', () => satisfies('1.2.3-beta.2', '^1.2.3-beta.1', rc), true)
expect('includePrerelease still allows any prerelease', () => satisfies('1.3.0-beta.1', '^1.2.0', { includePrerelease: true, prereleaseTags: ['rc'] }), true)
expect('empty tag list changes nothing', () => satisfies('1.3.0-rc.1', '^1.2.0', { prereleaseTags: [] }), false)
