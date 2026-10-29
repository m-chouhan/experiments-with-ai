import { semver, expect } from './helpers.mjs'

const { valid, parse, clean, satisfies, validRange, Comparator, intersects, gt } = semver

// Versions
expect('valid V1.2.3', () => valid('V1.2.3'), '1.2.3')
expect('valid V1.2.3-beta.1+build', () => valid('V1.2.3-beta.1+build'), '1.2.3-beta.1')
expect('parse V1.2.3 major/minor/patch', () => { const v = parse('V1.2.3'); return [v.major, v.minor, v.patch] }, [1, 2, 3])
expect('loose valid =V1.2.3', () => valid('=V1.2.3', true), '1.2.3')
expect('loose valid " V1.2.3"', () => valid(' V1.2.3', true), '1.2.3')
expect('clean " V1.2.3 "', () => clean(' V1.2.3 '), '1.2.3')
expect('clean =V1.2.3', () => clean('=V1.2.3'), '1.2.3')
expect('compare across prefixes gt(V1.2.4, v1.2.3)', () => gt('V1.2.4', 'v1.2.3'), true)

// Ranges and comparators
expect('satisfies V1.2.3 ^1.0.0', () => satisfies('V1.2.3', '^1.0.0'), true)
expect('satisfies 1.2.3 ^V1.0.0', () => satisfies('1.2.3', '^V1.0.0'), true)
expect('satisfies 1.2.3 >=V1.0.0 <V2', () => satisfies('1.2.3', '>=V1.0.0 <V2'), true)
expect('satisfies 2.1.0 >=V1.0.0 <V2', () => satisfies('2.1.0', '>=V1.0.0 <V2'), false)
expect('satisfies 1.5.0 V1.0.0 - V2.0.0', () => satisfies('1.5.0', 'V1.0.0 - V2.0.0'), true)
expect('validRange ~V1.2', () => validRange('~V1.2'), '>=1.2.0 <1.3.0-0')
expect('validRange ^V1.2.3', () => validRange('^V1.2.3'), '>=1.2.3 <2.0.0-0')
expect('validRange V1.x', () => validRange('V1.x'), '>=1.0.0 <2.0.0-0')
expect('validRange V1.2.3', () => validRange('V1.2.3'), '1.2.3')
expect('Comparator >=V1.2.3 value', () => new Comparator('>=V1.2.3').value, '>=1.2.3')
expect('Comparator V1.2.3 tests 1.2.3', () => new Comparator('V1.2.3').test('1.2.3'), true)
expect('intersects ^V1.0.0 ^1.5.0', () => intersects('^V1.0.0', '^1.5.0'), true)

// Unchanged behaviour
expect('lowercase v still valid', () => valid('v1.2.3'), '1.2.3')
expect('other letters still invalid', () => valid('X1.2.3'), null)
expect('double prefix still invalid in strict mode', () => valid('VV1.2.3'), null)
expect('~1.2 unchanged', () => validRange('~1.2'), '>=1.2.0 <1.3.0-0')
