'use strict'

// true if the version's first prerelease identifier is listed in
// options.prereleaseTags
const hasAllowedTag = (version, options) => {
  const tags = options && options.prereleaseTags
  return Array.isArray(tags) && tags.includes(version.prerelease[0])
}
module.exports = hasAllowedTag
