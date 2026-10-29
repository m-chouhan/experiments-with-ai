'use strict'

const SemVer = require('../classes/semver')
const Range = require('../classes/range')
const Comparator = require('../classes/comparator')

const minSatisfying = (versions, range, options) => {
  let min = null
  let minSV = null
  let rangeObj = null
  try {
    rangeObj = new Range(range, options)
  } catch (er) {
    return null
  }
  versions.forEach((v) => {
    let ok = false
    if (v) {
      let sv = v
      let parsed = true
      if (typeof sv === 'string') {
        try {
          sv = new SemVer(sv, rangeObj.options)
        } catch (er) {
          parsed = false
        }
      }
      for (let i = 0; parsed && !ok && i < rangeObj.set.length; i++) {
        const set = rangeObj.set[i]
        let pass = true
        for (let j = 0; j < set.length; j++) {
          if (!set[j].test(sv)) {
            pass = false
            break
          }
        }
        if (pass && sv.prerelease.length && !rangeObj.options.includePrerelease) {
          pass = false
          // Check if the prerelease tag is in the prereleaseTags array
          const prereleaseTags = rangeObj.options.prereleaseTags || []
          if (prereleaseTags.length > 0 && sv.prerelease.length > 0 &&
            prereleaseTags.includes(String(sv.prerelease[0]))) {
            pass = true
          } else {
            // only allow a prerelease if some comparator in this set has one on the same tuple
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
    if (ok) {
      if (!min || minSV.compare(v) === 1) {
        min = v
        minSV = new SemVer(min, options)
      }
    }
  })
  return min
}

module.exports = minSatisfying
