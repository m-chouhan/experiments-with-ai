'use strict'

const SemVer = require('../classes/semver')
const parse = require('./parse')

const PRE = '(?:-((?:\\d{0,256}[a-zA-Z-][a-zA-Z0-9-]{0,250}|0|[1-9]\\d{0,256})(?:\\.(?:\\d{0,256}[a-zA-Z-][a-zA-Z0-9-]{0,250}|0|[1-9]\\d{0,256}))*))'
const BUILD = '(?:\\+([a-zA-Z0-9-]{1,250}(?:\\.[a-zA-Z0-9-]{1,250})*))'
const COERCEPLAIN = '(^|[^\\d])(\\d{1,16})(?:\\.(\\d{1,16}))?(?:\\.(\\d{1,16}))?'
const COERCE = COERCEPLAIN + '(?:$|[^\\d])'
const COERCEFULL = COERCEPLAIN + '(?:' + PRE + ')?(?:' + BUILD + ')?(?:$|[^\\d])'
const COERCE_RE = new RegExp(COERCE)
const COERCEFULL_RE = new RegExp(COERCEFULL)
const COERCERTL_RE = new RegExp(COERCE, 'g')
const COERCERTLFULL_RE = new RegExp(COERCEFULL, 'g')

const coerce = (version, options) => {
  if (version instanceof SemVer) {
    return version
  }

  if (typeof version === 'number') {
    version = String(version)
  }

  if (typeof version !== 'string') {
    return null
  }

  options = options || {}

  let match = null
  if (!options.rtl) {
    match = version.match(options.includePrerelease ? COERCEFULL_RE : COERCE_RE)
  } else {
    // Find the right-most coercible string that does not share
    // a terminus with a more left-ward coercible string.
    // Eg, '1.2.3.4' wants to coerce '2.3.4', not '3.4' or '4'
    // With includePrerelease option set, '1.2.3.4-rc' wants to coerce '2.3.4-rc', not '2.3.4'
    //
    // Walk through the string checking with a /g regexp
    // Manually set the index so as to pick up overlapping matches.
    // Stop when we get a match that ends at the string end, since no
    // coercible string can be more right-ward without the same terminus.
    const coerceRtlRegex = options.includePrerelease ? COERCERTLFULL_RE : COERCERTL_RE
    let next
    while ((next = coerceRtlRegex.exec(version)) &&
        (!match || match.index + match[0].length !== version.length)
    ) {
      if (!match ||
            next.index + next[0].length !== match.index + match[0].length) {
        match = next
      }
      coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length
    }
    // leave it in a clean state
    coerceRtlRegex.lastIndex = -1
  }

  if (match === null) {
    return null
  }

  const major = match[2]
  const minor = match[3] || '0'
  const patch = match[4] || '0'
  const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : ''
  const build = options.includePrerelease && match[6] ? `+${match[6]}` : ''

  return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options)
}
module.exports = coerce
