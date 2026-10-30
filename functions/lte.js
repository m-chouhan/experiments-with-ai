'use strict'

const SemVer = require('../classes/semver')

const lte = (a, b, loose) => {
  const x = new SemVer(a, loose)
  const y = new SemVer(b, loose)
  const c = x.compare(y)
  return c <= 0
}

module.exports = lte
