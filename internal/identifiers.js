'use strict'

const numeric = /^[0-9]+$/
const compareIdentifiers = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1
  }

  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (anum && bnum) {
    a = +a
    b = +b
  }

  return a === b ? 0
    : (anum && !bnum) ? -1
    : (bnum && !anum) ? 1
    : a < b ? -1
    : 1
}

const chunks = /[0-9]+|[^0-9]+/g
const compareDigits = (a, b) => {
  a = a.replace(/^0+(?=.)/, '')
  b = b.replace(/^0+(?=.)/, '')
  return a.length !== b.length ? (a.length < b.length ? -1 : 1)
    : a === b ? 0
    : a < b ? -1
    : 1
}

// like compareIdentifiers, but runs of digits inside alphanumeric identifiers
// compare as numbers, so rc9 < rc10.  Purely numeric identifiers are
// unchanged, and still sort before alphanumeric ones.
const compareIdentifiersNatural = (a, b) => {
  if (numeric.test(a) || numeric.test(b)) {
    return compareIdentifiers(a, b)
  }

  const as = String(a).match(chunks) || []
  const bs = String(b).match(chunks) || []
  const len = Math.min(as.length, bs.length)
  for (let i = 0; i < len; i++) {
    const x = as[i]
    const y = bs[i]
    const r = numeric.test(x) && numeric.test(y)
      ? compareDigits(x, y)
      : x === y ? 0 : x < y ? -1 : 1
    if (r !== 0) {
      return r
    }
  }
  // fewer chunks sorts first; otherwise break ties (rc01 vs rc1) lexically
  return as.length === bs.length ? compareIdentifiers(a, b)
    : as.length < bs.length ? -1
    : 1
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  compareIdentifiersNatural,
  rcompareIdentifiers,
}
