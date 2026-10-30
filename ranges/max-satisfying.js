'use strict'

const SemVer = require('../classes/semver')
const Range = require('../classes/range')
const prereleaseAllowed = require('../internal/prerelease-allowed')

const maxSatisfying = (versions, range, options) => {
  let max = null
  let maxSV = null
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
          pass = prereleaseAllowed(sv, set, rangeObj.options)
        }
        ok = pass
      }
    }
    if (ok) {
      if (!max || maxSV.compare(v) === -1) {
        max = v
        maxSV = new SemVer(max, options)
      }
    }
  })
  return max
}

module.exports = maxSatisfying
