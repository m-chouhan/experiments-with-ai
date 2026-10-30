'use strict'

const SemVer = require('../classes/semver')

const compareBuild = (a, b, loose) => {
  const x = new SemVer(a, loose)
  const y = new SemVer(b, loose)
  return x.compare(y) || x.compareBuild(y)
}

module.exports = compareBuild
