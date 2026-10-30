'use strict'

// true if the version's first prerelease identifier is one of the
// options.prereleaseTags, which makes it exempt from the prerelease
// restriction (it still has to be within the range's bounds)
const hasAllowedPrereleaseTag = (version, options) => {
  const tags = options && options.prereleaseTags
  return Array.isArray(tags) &&
    version.prerelease.length > 0 &&
    tags.includes(version.prerelease[0])
}

module.exports = hasAllowedPrereleaseTag
