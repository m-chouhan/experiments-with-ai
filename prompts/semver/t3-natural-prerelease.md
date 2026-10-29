Add an option `naturalPrerelease`. When it is set, alphanumeric prerelease identifiers compare in natural order: runs of digits inside an identifier compare as numbers, so `1.0.0-rc9` < `1.0.0-rc10` and `1.0.0-alpha2` < `1.0.0-alpha11`.

Everything else about ordering stays the same: purely numeric identifiers still sort before alphanumeric ones, and build metadata is unaffected.

It must apply everywhere versions are ordered when the option is passed: `compare`, `rcompare`, `compareBuild`, `gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `sort`, `rsort`, `maxSatisfying`, `minSatisfying`, and range checks such as `satisfies`. Without the option, behaviour is unchanged. Keep the README up to date.
