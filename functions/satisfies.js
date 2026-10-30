'use strict'

const Range = require('../classes/range')
const prereleaseAllowed = require('../internal/prerelease-allowed')
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
      if (pass && sv.prerelease.length && !range.options.includePrerelease) {
        pass = prereleaseAllowed(sv, set, range.options)
      }
      ok = pass
    }
  }
  return ok
}

module.exports = satisfies
