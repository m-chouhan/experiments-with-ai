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

// Compare two non-numeric identifiers in natural order: runs of digits
// compare as numbers, everything else compares as plain strings.
const chunks = /[0-9]+|[^0-9]+/g
const compareNaturalIdentifiers = (a, b) => {
  const as = String(a).match(chunks)
  const bs = String(b).match(chunks)
  const len = Math.min(as.length, bs.length)
  for (let i = 0; i < len; i++) {
    let x = as[i]
    let y = bs[i]
    if (numeric.test(x) && numeric.test(y)) {
      x = x.replace(/^0+(?=[0-9])/, '')
      y = y.replace(/^0+(?=[0-9])/, '')
      // compare by length first so arbitrarily long runs stay exact
      if (x.length !== y.length) {
        return x.length < y.length ? -1 : 1
      }
    }
    if (x !== y) {
      return x < y ? -1 : 1
    }
  }
  if (as.length !== bs.length) {
    return as.length < bs.length ? -1 : 1
  }
  // numerically equal (e.g. rc01 vs rc1): fall back to a stable string order
  return a === b ? 0 : a < b ? -1 : 1
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  compareNaturalIdentifiers,
  rcompareIdentifiers,
}
