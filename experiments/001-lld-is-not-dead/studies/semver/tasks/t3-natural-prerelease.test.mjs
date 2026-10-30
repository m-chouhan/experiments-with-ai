import { semver, expect } from '../helpers.mjs'

const { compare, rcompare, compareBuild, gt, gte, lt, lte, eq, neq, sort, rsort, maxSatisfying, minSatisfying, satisfies } = semver
const nat = { naturalPrerelease: true }

expect('compare rc10 rc9 natural', () => compare('1.0.0-rc10', '1.0.0-rc9', nat), 1)
expect('compare alpha2 alpha11 natural', () => compare('1.0.0-alpha2', '1.0.0-alpha11', nat), -1)
expect('compare rc.2.beta10 rc.2.beta9 natural', () => compare('1.0.0-rc.2.beta10', '1.0.0-rc.2.beta9', nat), 1)
expect('compare a1b10 a1b9 natural', () => compare('1.0.0-a1b10', '1.0.0-a1b9', nat), 1)
expect('rcompare rc10 rc9 natural', () => rcompare('1.0.0-rc10', '1.0.0-rc9', nat), -1)
expect('compareBuild rc10 rc9 natural', () => compareBuild('1.0.0-rc10+b', '1.0.0-rc9+a', nat), 1)
expect('gt rc10 rc9 natural', () => gt('1.0.0-rc10', '1.0.0-rc9', nat), true)
expect('gte rc10 rc9 natural', () => gte('1.0.0-rc10', '1.0.0-rc9', nat), true)
expect('lt rc10 rc9 natural', () => lt('1.0.0-rc10', '1.0.0-rc9', nat), false)
expect('lte rc10 rc9 natural', () => lte('1.0.0-rc10', '1.0.0-rc9', nat), false)
expect('eq rc10 rc9 natural', () => eq('1.0.0-rc10', '1.0.0-rc9', nat), false)
expect('neq rc10 rc9 natural', () => neq('1.0.0-rc10', '1.0.0-rc9', nat), true)
expect('sort natural', () => sort(['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc1', '1.0.0'], nat), ['1.0.0-rc1', '1.0.0-rc9', '1.0.0-rc10', '1.0.0'])
expect('rsort natural', () => rsort(['1.0.0-rc9', '1.0.0-rc10', '1.0.0-rc1'], nat), ['1.0.0-rc10', '1.0.0-rc9', '1.0.0-rc1'])
expect('maxSatisfying natural', () => maxSatisfying(['1.0.0-rc9', '1.0.0-rc10', '1.0.0-rc2'], '>=1.0.0-rc1', nat), '1.0.0-rc10')
expect('minSatisfying natural', () => minSatisfying(['1.0.0-rc10', '1.0.0-rc9'], '>=1.0.0-rc1', nat), '1.0.0-rc9')
expect('satisfies rc10 >rc9 natural', () => satisfies('1.0.0-rc10', '>1.0.0-rc9', nat), true)
expect('satisfies rc10 <rc9 natural', () => satisfies('1.0.0-rc10', '<1.0.0-rc9', nat), false)

// Unchanged ordering rules
expect('numeric identifiers still sort before alphanumeric', () => compare('1.0.0-1', '1.0.0-rc1', nat), -1)
expect('plain words still compare as text', () => compare('1.0.0-alpha', '1.0.0-beta', nat), -1)
expect('release still sorts after prerelease', () => compare('1.0.0', '1.0.0-rc10', nat), 1)
expect('build metadata still compares as text', () => compareBuild('1.0.0+b10', '1.0.0+b9', nat), -1)

// Without the option, plain text order is kept
expect('compare rc10 rc9 default', () => compare('1.0.0-rc10', '1.0.0-rc9'), -1)
expect('sort default', () => sort(['1.0.0-rc10', '1.0.0-rc9']), ['1.0.0-rc10', '1.0.0-rc9'])
expect('satisfies rc10 >rc9 default', () => satisfies('1.0.0-rc10', '>1.0.0-rc9'), false)
