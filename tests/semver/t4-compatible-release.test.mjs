import { semver, expect } from './helpers.mjs'

const { validRange, satisfies, toComparators, minVersion } = semver

expect('validRange ~=1.2', () => validRange('~=1.2'), '>=1.2.0 <2.0.0-0')
expect('validRange ~=1.2.3', () => validRange('~=1.2.3'), '>=1.2.3 <1.3.0-0')
expect('validRange ~=1', () => validRange('~=1'), '>=1.0.0 <2.0.0-0')
expect('validRange ~= 1.2', () => validRange('~= 1.2'), '>=1.2.0 <2.0.0-0')
expect('validRange ~=0.3', () => validRange('~=0.3'), '>=0.3.0 <1.0.0-0')
expect('validRange ~=1.2.3-beta.1', () => validRange('~=1.2.3-beta.1'), '>=1.2.3-beta.1 <1.3.0-0')
expect('validRange ~=1.2 includePrerelease', () => validRange('~=1.2', { includePrerelease: true }), '>=1.2.0-0 <2.0.0-0')
expect('validRange ~=1.2 || ^3.0.0', () => validRange('~=1.2 || ^3.0.0'), '>=1.2.0 <2.0.0-0||>=3.0.0 <4.0.0-0')
expect('validRange ~=1.2 <1.5.0', () => validRange('~=1.2 <1.5.0'), '>=1.2.0 <2.0.0-0 <1.5.0')
expect('toComparators ~=1.4', () => toComparators('~=1.4'), [['>=1.4.0', '<2.0.0-0']])
expect('minVersion ~=1.4.2', () => minVersion('~=1.4.2').version, '1.4.2')
expect('satisfies 1.9.0 ~=1.2', () => satisfies('1.9.0', '~=1.2'), true)
expect('satisfies 2.0.0 ~=1.2', () => satisfies('2.0.0', '~=1.2'), false)
expect('satisfies 1.1.9 ~=1.2', () => satisfies('1.1.9', '~=1.2'), false)
expect('satisfies 1.2.9 ~=1.2.3', () => satisfies('1.2.9', '~=1.2.3'), true)
expect('satisfies 1.3.0 ~=1.2.3', () => satisfies('1.3.0', '~=1.2.3'), false)

// Unchanged operators
expect('~1.2 unchanged', () => validRange('~1.2'), '>=1.2.0 <1.3.0-0')
expect('~>1.2 unchanged', () => validRange('~>1.2'), '>=1.2.0 <1.3.0-0')
expect('~1.2.3 unchanged', () => validRange('~1.2.3'), '>=1.2.3 <1.3.0-0')
expect('^1.2 unchanged', () => validRange('^1.2'), '>=1.2.0 <2.0.0-0')
expect('=1.2.3 unchanged', () => validRange('=1.2.3'), '1.2.3')
