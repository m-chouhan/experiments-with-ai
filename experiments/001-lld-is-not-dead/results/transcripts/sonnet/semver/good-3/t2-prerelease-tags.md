# semver · good · t2-prerelease-tags · sonnet · run 3

34s · 5 turns · 4 tool calls · 56323 tokens · $0.071

## Step 1

**Tool:** Bash

```sh
git ls-files | grep -v '^test' | head -50; grep -rn "includePrerelease" --include=*.js . --exclude-dir=node_modules --exclude-dir=test | head -50
```

**Result:**

```
.gitignore
LICENSE
README.md
classes/comparator.js
classes/index.js
classes/range.js
classes/semver.js
functions/clean.js
functions/cmp.js
functions/coerce.js
functions/compare-build.js
functions/compare-loose.js
functions/compare.js
functions/diff.js
functions/eq.js
functions/gt.js
functions/gte.js
functions/inc.js
functions/lt.js
functions/lte.js
functions/major.js
functions/minor.js
functions/neq.js
functions/parse.js
functions/patch.js
functions/prerelease.js
functions/rcompare.js
functions/rsort.js
functions/satisfies.js
functions/sort.js
functions/truncate.js
functions/valid.js
index.js
internal/constants.js
internal/debug.js
internal/identifiers.js
internal/lrucache.js
internal/parse-options.js
internal/re.js
package-lock.json
package.json
preload.js
range.bnf
ranges/gtr.js
ranges/i…
```

## Step 2

**Tool:** Bash

```sh
cat internal/parse-options.js; grep -n "includePrerelease\|prerelease" classes/range.js classes/comparator.js ranges/*.js functions/satisfies.js; grep -n "includePrerelease" README.md
```

**Result:**

```
'use strict'

// parse out just the options we care about
const looseOption = Object.freeze({ loose: true })
const emptyOpts = Object.freeze({ })
const parseOptions = options => {
  if (!options) {
    return emptyOpts
  }

  if (typeof options !== 'object') {
    return looseOption
  }

  return options
}
module.exports = parseOptions
classes/range.js:13:        range.includePrerelease === !!options.includePrerelease
classes/range.js:31:    this.includePrerelease = !!options.includePrerelease
classes/range.js:107:      (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) |
classes/range.js:118:    range = range.replace(hr, hyphenReplace(this.options.includePrerelease))
classes/range.js:302:  // if we're including prereleases in the match, then the lower bound is
classes/range.js:30…
```

## Step 3

**Tool:** Bash

```sh
sed -n 1,40p classes/range.js; sed -n 520,580p classes/range.js; sed -n 80,125p classes/comparator.js; sed -n 205,222p README.md; sed -n 420,440p README.md; cat ranges/max-satisfying.js
```

**Result:**

```
'use strict'

const SPACE_CHARACTERS = /\s+/g

// hoisted class for cyclic dependency
class Range {
  constructor (range, options) {
    options = parseOptions(options)

    if (range instanceof Range) {
      if (
        range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease
      ) {
        return range
      } else {
        return new Range(range.raw, options)
      }
    }

    if (range instanceof Comparator) {
      // just put it in the set and return
      this.raw = range.value
      this.set = [[range]]
      this.formatted = undefined
      return this
    }

    this.options = options
    this.loose = !!options.loose
    this.includePrerelease = !!options.includePrerelease

    // First reduce all whitespace as much as possible so …
```

## Step 4

**Tool:** Bash

```sh
python3 - <<'E'
p='classes/range.js'
s=open(p).read()
s=s.replace("""        range.includePrerelease === !!options.includePrerelease
      ) {""","""        range.includePrerelease === !!options.includePrerelease &&
        samePrereleaseTags(range.options.prereleaseTags, options.prereleaseTags)
      ) {""")
s=s.replace("""const testSet = (set, version, options) => {""","""const samePrereleaseTags = (a, b) => {
  a = a || []
  b = b || []
  return a.length === b.length && a.every((t, i) => t === b[i])
}

const testSet = (set, version, options) => {""")
s=s.replace("""  if (version.prerelease.length && !options.includePrerelease) {
""","""  if (version.prerelease.length && !options.includePrerelease) {
    // Prerelease tags opted into by the user match anywhere in the bounds,
    // which the comparators above have already verified.
    if (options.prereleaseTags &&
        options.prereleaseTags.includes(version.prerelease[0])) {
      return true
    }

""")
open(p,'w').write(s)
p='README.md'
s=open(p).read()
s=s.replace("""range matching.

#### Prerelease Identifiers""","""range matching.

Alternatively, set the `prereleaseTags` option to an array of strings
to opt in to specific prerelease tags.  A prerelease version whose first
prerelease identifier is one of these tags matches any range whose
bounds it falls within, without needing a prerelease comparator on the
same `[major, minor, patch]` tuple.  Other prereleases follow the rules
above.

```javascript
semver.satisfi…
```

**Result:**

```
true false false false
1.3.0-rc.1 1.4.0
true
npm notice run semver@7.8.5 test
npm notice run tap --no-coverage
sh: tap: command not found
```

## Step 5

**Says:** I added `prereleaseTags`, and it works through `satisfies`, `maxSatisfying`, `minSatisfying` and `Range#test`. I couldn't run the test suite because `tap` isn't installed here, so I only ran a few manual checks.

The manual checks gave these results:
- `1.3.0-rc.1` against `^1.2.0` with `['rc']` is `true`.
- `1.3.0-beta.1` against `^1.2.0` with `['rc']` is `false`.
- `2.0.0-rc.1` against `^1.2.0` with `['rc']` is `false`.
- `1.3.0-rc.1` against `^1.2.0` without the option is `false`, as before.
- `maxSatisfying(['1.2.0','1.3.0-rc.1'], '^1.2.0', …)` returns `1.3.0-rc.1`.
- `minSatisfying(['1.3.0-rc.1','1.4.0'], '>=1.3.0', …)` returns `1.4.0`. `1.3.0-rc.1` sorts below `1.3.0`, so it is outside that range's bounds.

**What changed:**
- **Matching:** the check is in `testSet` in `classes/range.js`. After the range's bounds pass and `includePrerelease` is unset, a version whose first prerelease identifier is in `prereleaseTags` matches. Without the option, nothing changes.
- **Range reuse:** `new Range(existingRange, opts)` used to return the same object whenever `loose` and `includePrerelease` matched, so it would have ignored a different `prereleaseTags`. It now builds a new `Range` when the tags differ. I checked this with `new Range(new Range('^1.2.0'), { prereleaseTags: ['rc'] })`.
- **README:** I added a paragraph with examples to the prerelease section and an entry in the options list.

I didn't add tests to the repo.

## Outcome

Hidden tests: 17/17 passed. Upstream suite: pass (22923 passed, 0 failed). 2 files changed, 31 insertions(+), 1 deletion(-)
