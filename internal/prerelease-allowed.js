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
