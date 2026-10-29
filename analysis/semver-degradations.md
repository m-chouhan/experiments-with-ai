# How `projects/bad` was made from `projects/good` (node-semver 7.8.5)

The public API, deep module paths (`semver/functions/gt` etc.), behaviour and the
upstream test suite (51 suites, 22,923 asserts) are unchanged. `tests/semver/equivalence.test.mjs`
checks good and bad give identical results or errors across fixtures plus seeded random input.
Only debug logging (`NODE_DEBUG=semver`) differs: bad logs less.

| Change | File(s) | Ousterhout red flag |
|---|---|---|
| Version grammar re-declared as local regex fragments in each consumer instead of `internal/re.js` (which stays, only for the public `re`/`src`/`tokens` exports) | `classes/semver.js`, `classes/comparator.js`, `classes/range.js`, `functions/coerce.js` | Information leakage, change amplification, unknown unknowns (editing `re.js` changes nothing) |
| Options normalisation pasted inline; `internal/parse-options.js` left unused | `classes/*.js` | Duplicated knowledge |
| Identifier ordering pasted inline; `internal/identifiers.js` used only for exports | `classes/semver.js` | Duplicated knowledge |
| Limits as magic numbers (256, 9007199254740991) instead of `internal/constants.js` | `classes/semver.js` | Information leakage |
| `cmp`'s operator switch copied into `Comparator#test`, so operator meaning lives in two places | `classes/comparator.js` | Change amplification |
| LRU cache inlined into `Range#parseRange`; `internal/lrucache.js` left unused | `classes/range.js` | Shallow, conjoined code |
| Caret, tilde, x-range, star, hyphen and `>=0.0.0` desugaring merged into one long `parseRange` with the `isX` test pasted ~20 times | `classes/range.js` | Conjoined methods, cognitive load |
| Version ordering pasted into each of `compare`, `rcompare`, `compareBuild`, `eq`, `neq`, `gt`, `gte`, `lt`, `lte` | `functions/*.js` | Change amplification |
| Range matching incl. the prerelease rule pasted into `Range#test`, `satisfies`, `maxSatisfying`, `minSatisfying` | `classes/range.js`, `functions/satisfies.js`, `ranges/*-satisfying.js` | Change amplification, unknown unknowns |
| `outside` written out once per direction | `ranges/outside.js` | Duplication |

Measured with `node analysis/measure.mjs good bad`.
