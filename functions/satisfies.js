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
      if (pass && sv.prerelease.length && !range.options.includePrerelease) {
        // Check if prerelease tag is in the prereleaseTags list
        if (range.options.prereleaseTags && range.options.prereleaseTags.length > 0) {
          const prereleaseTags = range.options.prereleaseTags
          const versionTag = sv.prerelease[0]
          if (prereleaseTags.includes(versionTag)) {
            pass = true
          } else {
            pass = false
          }
        } else {
          // only allow a prerelease if some comparator in this set has one on the same tuple
          pass = false
          for (let j = 0; j < set.length; j++) {
            if (set[j].semver !== Comparator.ANY && set[j].semver.prerelease.length > 0 &&
              set[j].semver.major === sv.major &&
              set[j].semver.minor === sv.minor &&
              set[j].semver.patch === sv.patch) {
              pass = true
              break
            }
          }
        }
      }
      ok = pass
    }
  }
  return ok
}

module.exports = satisfies
