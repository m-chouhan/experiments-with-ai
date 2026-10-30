Add an option `prereleaseTags`, an array of strings.

When a version with a prerelease is checked against a range and `includePrerelease` is not set, a version whose first prerelease identifier is one of these tags matches whenever it is within the range's bounds. Other prereleases keep today's rules.

- `satisfies('1.3.0-rc.1', '^1.2.0', { prereleaseTags: ['rc'] })` is `true`
- `satisfies('1.3.0-beta.1', '^1.2.0', { prereleaseTags: ['rc'] })` is still `false`
- `satisfies('2.0.0-rc.1', '^1.2.0', { prereleaseTags: ['rc'] })` is still `false` (outside the bounds)

It must work for everything that checks versions against ranges (`satisfies`, `maxSatisfying`, `minSatisfying`, `Range#test`, ...). Without the option, behaviour is unchanged. Keep the README up to date.
