'use strict'

const isPreleaseTag = (prerelease, tags) => {
  if (!prerelease || !prerelease.length || !tags || !tags.length) {
    return false
  }

  const firstTag = prerelease[0]
  const tag = typeof firstTag === 'number' ? String(firstTag) : firstTag

  return tags.includes(tag)
}

module.exports = isPreleaseTag
