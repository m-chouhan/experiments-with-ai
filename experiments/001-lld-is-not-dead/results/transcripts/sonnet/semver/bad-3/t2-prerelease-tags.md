# semver · bad · t2-prerelease-tags · sonnet · run 3

58s · 13 turns · 12 tool calls · 205531 tokens · $0.140

## Step 1

**Tool:** Bash

```sh
ls && cat classes/range.js | grep -n "prerelease\|includePrerelease" ; grep -rn "includePrerelease" --include=*.js . -l | grep -v node_modules; cat internal/parse-options.js
```

**Result:**

```
50:        range.includePrerelease === !!options.includePrerelease
68:    this.includePrerelease = !!options.includePrerelease
143:    const memoKey = ((this.options.includePrerelease && 1) | (this.options.loose && 2)) + ':' + range
152:    const incPr = this.options.includePrerelease
281:          // if we're including prereleases in the match, then we need
282:          // to fix this to -0, the lowest possible prerelease value
440:      if (version.prerelease.length && !this.options.includePrerelease) {
441:        // Find the set of versions that are allowed to have prereleases
450:          if (set[j].semver.prerelease.length > 0) {
(eval):1: no matches found: --include=*.js
'use strict'

// parse out just the options we care about
const looseOption = Object.freeze({ loose: true })
co…
```

## Step 2

**Tool:** Bash

```sh
sed -n 40,75p classes/range.js; sed -n 135,150p classes/range.js; sed -n 425,470p classes/range.js; grep -n "includePrerelease" -r . --exclude-dir=node_modules --exclude-dir=test --exclude-dir=.git | grep -v "^./classes/range.js"
```

**Result:**

```
constructor (range, options) {
    if (!options) {
      options = Object.freeze({})
    } else if (typeof options !== 'object') {
      options = Object.freeze({ loose: true })
    }

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

    // First reduce all whitespace as much …
```

## Step 3

**Tool:** Bash

```sh
cat functions/satisfies.js ranges/max-satisfying.js; sed -n 20,50p ranges/min-satisfying.js; sed -n 130,160p classes/comparator.js; sed -n 420,435p README.md; grep -n "Range.*test\|rangeCache" classes/range.js | head
```

**Result:**

```
'use strict'

const Range = require('../classes/range')
const Comparator = require('../classes/comparator')
const SemVer = require('../classes/semver')

const satisfies = (version, range, options) => {
  try {
    range = new Range(range, options)
  } catch (er) {
    return false
  }
  let ok = false
  if (version) {
    let sv = version
    let parsed = true
    if (typeof sv === 'string') {
      try {
        sv = new SemVer(sv, range.options)
      } catch (er) {
        parsed = false
      }
    }
    for (let i = 0; parsed && !ok && i < range.set.length; i++) {
      const set = range.set[i]
      let pass = true
      for (let j = 0; j < set.length; j++) {
        if (!set[j].test(sv)) {
          pass = false
          break
        }
      }
      if (pass && sv.prerelease.lengt…
```

## Step 4

**Tool:** Bash

```sh
cat > internal/prerelease-allowed.js <<'EOF'
'use strict'

const Comparator = require('../classes/comparator')

// Whether a version that already passed every comparator in `set` may match,
// given that it has a prerelease and includePrerelease is not set.
const prereleaseAllowed = (version, set, options) => {
  const tags = options && options.prereleaseTags
  if (tags && tags.length && tags.includes(version.prerelease[0])) {
    return true
  }
  // only allow a prerelease if some comparator in this set has one on the same tuple
  for (let j = 0; j < set.length; j++) {
    if (set[j].semver !== Comparator.ANY && set[j].semver.prerelease.length > 0 &&
      set[j].semver.major === version.major &&
      set[j].semver.minor === version.minor &&
      set[j].semver.patch === version.patch) {
      return true
    }
  }
  return false
}

module.exports = prereleaseAllowed
EOF
python3 - <<'EOF'
import re
for f,rv in [('functions/satisfies.js','range'),('ranges/max-satisfying.js','rangeObj'),('ranges/min-satisfying.js','rangeObj')]:
    s=open(f).read()
    s=re.sub(r"( *)// only allow a prerelease if some.*?\n( *)pass = false\n.*?\n\2\}\n(?=\s*ok = pass)",
      lambda m: f"{m.group(1)}pass = prereleaseAllowed(sv, set, {rv}.options)\n" if False else "@@",s,flags=re.S) if False else s
    open(f,'w').write(s)
EOF
grep -n "only allow" -A12 ranges/min-satisfying.js | head -20
```

**Result:**

```
38:          // only allow a prerelease if some comparator in this set has one on the same tuple
39-          pass = false
40-          for (let j = 0; j < set.length; j++) {
41-            if (set[j].semver !== Comparator.ANY && set[j].semver.prerelease.length > 0 &&
42-              set[j].semver.major === sv.major &&
43-              set[j].semver.minor === sv.minor &&
44-              set[j].semver.patch === sv.patch) {
45-              pass = true
46-              break
47-            }
48-          }
49-        }
50-        ok = pass
```

## Step 5

**Tool:** Bash

```sh
python3 - <<'EOF'
import re
for f,rv in [('functions/satisfies.js','range'),('ranges/max-satisfying.js','rangeObj'),('ranges/min-satisfying.js','rangeObj')]:
    s=open(f).read()
    pat=re.compile(r"( *)// only allow a prerelease.*?\n *pass = false\n *for .*?\n *\}\n(?= *ok = pass)",re.S)
    m=pat.search(s)
    ind=m.group(1)
    s=s[:m.start()]+f"{ind}pass = prereleaseAllowed(sv, set, {rv}.options)\n"+ind[:-2]+"}\n"+s[m.end():] if False else s
    # simpler: replace body between the if line and 'ok = pass'
    pat=re.compile(r"( *)// only allow a prerelease.*?\n( *)pass = false\n.*?\n\1\}\n(?=\s*ok = pass)".replace(r"\1",r"(?:\1)"),re.S)
    open(f,'w').write(s)
EOF
git status --short
```

**Result:**

```
?? internal/prerelease-allowed.js
```

## Step 6

**Says:** Regex edits kept failing, so I'll edit the three files directly.

**Tool:** Bash

```sh
python3 - <<'EOF'
for f,rv in [('functions/satisfies.js','range'),('ranges/max-satisfying.js','rangeObj'),('ranges/min-satisfying.js','rangeObj')]:
    lines=open(f).read().split('\n')
    a=next(i for i,l in enumerate(lines) if 'only allow a prerelease' in l)
    b=next(i for i in range(a,len(lines)) if lines[i].strip()=='ok = pass')
    ind=lines[a][:len(lines[a])-len(lines[a].lstrip())]
    # lines a..b-2 are comment..for-loop; b-1 is closing brace of if
    lines[a:b-1]=[f"{ind}pass = prereleaseAllowed(sv, set, {rv}.options)"]
    s='\n'.join(lines).replace("const Comparator = require('../classes/comparator')","const prereleaseAllowed = require('../internal/prerelease-allowed')")
    open(f,'w').write(s)
EOF
git diff functions ranges/min-satisfying.js | head -60
```

**Result:**

```
diff --git a/functions/satisfies.js b/functions/satisfies.js
index 27ce13f..6ec01e3 100644
--- a/functions/satisfies.js
+++ b/functions/satisfies.js
@@ -1,7 +1,7 @@
 'use strict'
 
 const Range = require('../classes/range')
-const Comparator = require('../classes/comparator')
+const prereleaseAllowed = require('../internal/prerelease-allowed')
 const SemVer = require('../classes/semver')
 
 const satisfies = (version, range, options) => {
@@ -31,17 +31,7 @@ const satisfies = (version, range, options) => {
         }
       }
       if (pass && sv.prerelease.length && !range.options.includePrerelease) {
-        // only allow a prerelease if some comparator in this set has one on the same tuple
-        pass = false
-        for (let j = 0; j < set.length; j++) {
-          if (set[j].semve…
```

## Step 7

**Says:** Now Range#test, the Range-reuse check, and the README.

**Tool:** Bash

```sh
python3 - <<'EOF'
s=open('classes/range.js').read()
a=s.index("        // Find the set of versions that are allowed")
b=s.index("        // Version has a -pre, but it's not one of the ones we like.\n        continue\n")
end=b+len("        // Version has a -pre, but it's not one of the ones we like.\n        continue\n")
s=s[:a]+"""        // Prereleases are allowed if their first identifier is in
        // prereleaseTags, or if a comparator in the set has a prerelease on
        // the same major.minor.patch (e.g. ^1.2.3-pr.1 allows `1.2.3-pr.2`
        // but `1.2.4-alpha.notready` is NOT allowed).
        if (prereleaseAllowed(version, set, this.options)) {
          return true
        }
        continue
"""+s[end:]
s=s.replace("""        range.includePrerelease === !!options.includePrerelease
""","""        range.includePrerelease === !!options.includePrerelease &&
        sameTags(range.options.prereleaseTags, options.prereleaseTags)
""")
s=s.replace("const rangeCache = new Map()","""const rangeCache = new Map()
const sameTags = (a, b) => {
  a = a || []
  b = b || []
  return a.length === b.length && a.every((t, i) => t === b[i])
}""",1)
s=s.replace("const Comparator = require('./comparator')\n","const Comparator = require('./comparator')\nconst prereleaseAllowed = require('../internal/prerelease-allowed')\n")
open('classes/range.js','w').write(s)
r=open('README.md').read()
r=r.replace("""  explicitly opted into.

Strict-mode""","""  explicitly opted into.
- `prereleas…
```

**Result:**

```
module.exports = Range

const Comparator = require('./comparator')
const prereleaseAllowed = require('../internal/prerelease-allowed')
const SemVer = require('./semver')
true false false false
1.3.0-rc.1 1.4.0 false true
npm notice run semver@7.8.5 npx
npm notice run 'tap'
sh: tap: command not found
npm error syscall open
npm error path /Users/mahendrachouhan/.npm/_cacache/tmp/***
npm error errno EPERM
npm error
npm error Your cache folder contains root-owned files, due to a bug in previous versions of npm which has since been addressed.
npm error
npm error To permanently fix this problem, please run:
npm error   sudo chown -R 501:20 "/Users/mahendrachouhan/.npm"
npm error Log files were not written due to an error writing to the directory: /Users/mahendrachouhan/.npm/_logs
npm error You c…
```

## Step 8

**Tool:** Bash

```sh
ls test test/classes | head -30; ls node_modules 2>&1 | head -3
```

**Result:**

```
test:
classes
fixtures
functions
integration
internal
ranges
index.js
preload.js

test/classes:
comparator.js
index.js
range.js
semver.js
@babel
@istanbuljs
@jridgewell
```

## Step 9

**Tool:** Bash

```sh
head -8 test/functions/satisfies.js; cat > test/internal/prerelease-allowed.js <<'EOF'
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
  t.equal(minSatisfying(['1.3.0-rc.1', '1.4.0'], '>=1.3.0', opts), '1.3.0-rc.1')
  t.equal(new Range('^1.2.0', opts).test('1.3.0-rc.1'), true)
  t.equal(new Range(new Range('^1.2.0'), opts).test('1.3.0-rc.1'), true)
  t.end()
})
EOF
node test/internal/prerelease-allowed.js 2>&1 | tail -5
```

**Result:**

```
'use strict'

const { test } = require('tap')
const satisfies = require('../../functions/satisfies')
const rangeInclude = require('../fixtures/range-include.js')
const rangeExclude = require('../fixtures/range-exclude.js')
test('range tests', t => {
  t.plan(rangeInclude.length)
not ok 1 - prereleaseTags # time=6.975ms

1..1
# failed 1 test
# time=7.792ms
```

## Step 10

**Tool:** Bash

```sh
node test/internal/prerelease-allowed.js 2>&1 | head -30
```

**Result:**

```
TAP version 13
# Subtest: prereleaseTags
    ok 1 - should be equal
    ok 2 - should be equal
    ok 3 - should be equal
    ok 4 - should be equal
    ok 5 - should be equal
    not ok 6 - should be equal
      ---
      compare: ===
      at:
        line: 17
        column: 5
        file: test/internal/prerelease-allowed.js
        type: Test
      stack: |
        Test.<anonymous> (test/internal/prerelease-allowed.js:17:5)
        Object.<anonymous> (test/internal/prerelease-allowed.js:11:3)
      source: >2
          t.equal(maxSatisfying(['1.2.0', '1.3.0-rc.1'], '^1.2.0', opts), '1.3.0-rc.1')
          t.equal(minSatisfying(['1.3.0-rc.1', '1.4.0'], '>=1.3.0', opts), '1.3.0-rc.1')
        ----^
          t.equal(new Range('^1.2.0', opts).test('1.3.0-rc.1'), true)
          t.equal(n…
```

## Step 11

**Says:** That failure is a mistake in my test, not the code: `1.3.0-rc.1` is below `>=1.3.0`, so it's correctly out of bounds. I'll fix the test.

**Tool:** Bash

```sh
sed -i "s/'>=1.3.0', opts/'>=1.2.0', opts/" test/internal/prerelease-allowed.js && node test/internal/prerelease-allowed.js | tail -4; for f in test/functions/satisfies.js test/classes/range.js test/ranges/*satisfying.js; do node $f | grep -E "^# (failed|pass)|not ok" | head -3; done; npx --no-install eslint . | tail
```

**Result:**

```
sed: 2: "test/internal/prereleas ...": undefined label 'est/internal/prerelease-allowed.js'
npm error code EPERM
npm error syscall open
npm error path /Users/mahendrachouhan/.npm/_cacache/tmp/***
npm error errno EPERM
npm error
npm error Your cache folder contains root-owned files, due to a bug in previous versions of npm which has since been addressed.
npm error
npm error To permanently fix this problem, please run:
npm error   sudo chown -R 501:20 "/Users/mahendrachouhan/.npm"
npm error Log files were not written due to an error writing to the directory: /Users/mahendrachouhan/.npm/_logs
npm error You can rerun the command with `--loglevel=verbose` to see the logs in your terminal
```

## Step 12

**Tool:** Bash

```sh
sed -i '' "s/'>=1.3.0', opts/'>=1.2.0', opts/" test/internal/prerelease-allowed.js && node test/internal/prerelease-allowed.js | tail -3; for f in test/functions/satisfies.js test/classes/range.js test/ranges/*satisfying.js; do node $f | grep -E "^# (failed|pass)|not ok" | head -3; done; echo done
```

**Result:**

```
1..1
# time=3.917ms
done
```

## Step 13

**Says:** `prereleaseTags` now works for `satisfies`, `maxSatisfying`, `minSatisfying` and `Range#test`. The new test file and the existing satisfies, range and max/min-satisfying test files all pass when run directly with node.

I didn't run the full tap suite or eslint. `npx` fails here with an npm cache permission error, so I ran the test files individually.

Your three examples behave as specified, and without the option nothing changes.

- **Shared check:** `satisfies`, `maxSatisfying` and `minSatisfying` each had their own copy of the prerelease check. I moved it into one helper, `internal/prerelease-allowed.js`, and made all four places use it. The helper accepts a prerelease if its first identifier is in `prereleaseTags`, and otherwise applies the old same-`major.minor.patch` rule.
- **Range reuse:** `new Range(existingRange, options)` used to hand back the existing range whenever `loose` and `includePrerelease` matched. That would have silently ignored a new `prereleaseTags`, so it now also compares the tags.
- **README:** I documented the option in the options list.
- **Tests:** The new test is `test/internal/prerelease-allowed.js`. It covers your three examples plus `maxSatisfying`, `minSatisfying`, `Range#test` and passing an existing `Range` instance with the option.

I haven't committed anything.

## Outcome

Hidden tests: 17/17 passed. Upstream suite: pass (22923 passed, 0 failed). 7 files changed, 75 insertions(+), 55 deletions(-)
