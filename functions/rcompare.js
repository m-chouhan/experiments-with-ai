'use strict'

const SemVer = require('../classes/semver')

const rcompare = (b, a, loose) => {
  const x = new SemVer(a, loose)
  const y = new SemVer(b, loose)
  const c = x.compare(y)
  return c
}

module.exports = rcompare
