'use strict'

const numeric = /^[0-9]+$/

const digits = /([0-9]+)/

// compare two digit runs by numeric value without risking precision loss
const compareDigitRuns = (a, b) => {
  a = a.replace(/^0+(?=[0-9])/, '')
  b = b.replace(/^0+(?=[0-9])/, '')
  return a.length !== b.length ? (a.length < b.length ? -1 : 1)
    : a === b ? 0
    : a < b ? -1
    : 1
}

// split on digit runs, so even indexes are text and odd indexes are digits
const compareNatural = (a, b) => {
  const as = String(a).split(digits)
  const bs = String(b).split(digits)
  const len = Math.min(as.length, bs.length)
  for (let i = 0; i < len; i++) {
    if (as[i] === bs[i]) {
      continue
    }
    return i % 2 ? compareDigitRuns(as[i], bs[i]) : as[i] < bs[i] ? -1 : 1
  }
  return as.length === bs.length ? 0 : as.length < bs.length ? -1 : 1
}

const compareIdentifiers = (a, b, natural) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1
  }

  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  if (natural && !anum && !bnum) {
    // identifiers that are numerically equal but spelled differently
    // (rc01 vs rc1) fall back to the plain comparison to stay distinct
    const n = compareNatural(a, b)
    if (n !== 0) {
      return n
    }
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

const rcompareIdentifiers = (a, b, natural) => compareIdentifiers(b, a, natural)

module.exports = {
  compareIdentifiers,
  rcompareIdentifiers,
}
