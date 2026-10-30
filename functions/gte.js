'use strict'

const SemVer = require('../classes/semver')
const { compareNaturalIdentifiers } = require('../internal/identifiers')

const gte = (a, b, loose) => {
  const x = new SemVer(a, loose)
  const y = new SemVer(b, loose)
  let c = 0
  if (x.version !== y.version) {
    if (x.major !== y.major) {
      c = x.major < y.major ? -1 : 1
    } else if (x.minor !== y.minor) {
      c = x.minor < y.minor ? -1 : 1
    } else if (x.patch !== y.patch) {
      c = x.patch < y.patch ? -1 : 1
    } else if (x.prerelease.length && !y.prerelease.length) {
      c = -1
    } else if (!x.prerelease.length && y.prerelease.length) {
      c = 1
    } else {
      for (let i = 0; ; i++) {
        let p = x.prerelease[i]
        let q = y.prerelease[i]
        if (p === undefined && q === undefined) {
          c = 0
          break
        } else if (q === undefined) {
          c = 1
          break
        } else if (p === undefined) {
          c = -1
          break
        } else if (p === q) {
          continue
        }
        if (typeof p === 'number' && typeof q === 'number') {
          c = p < q ? -1 : 1
          break
        }
        const pnum = /^[0-9]+$/.test(p)
        const qnum = /^[0-9]+$/.test(q)
        if (pnum && qnum) {
          p = +p
          q = +q
        }
        if (x.naturalPrerelease && !pnum && !qnum) {
          c = compareNaturalIdentifiers(p, q)
        } else {
          c = p === q ? 0 : (pnum && !qnum) ? -1 : (qnum && !pnum) ? 1 : p < q ? -1 : 1
        }
        break
      }
    }
  }
  return c >= 0
}

module.exports = gte
