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

const digit = /[0-9]/

// compare two runs of digits by numeric value, without precision loss
const compareDigitRuns = (a, b) => {
  a = a.replace(/^0+/, '')
  b = b.replace(/^0+/, '')
  return a.length !== b.length ? (a.length < b.length ? -1 : 1)
    : a === b ? 0
    : a < b ? -1
    : 1
}

// Like compareIdentifiers, but runs of digits inside alphanumeric
// identifiers compare as numbers: rc9 < rc10.  Purely numeric identifiers
// still sort before alphanumeric ones.
const compareNaturalIdentifiers = (a, b) => {
  if (numeric.test(a) || numeric.test(b)) {
    return compareIdentifiers(a, b)
  }

  a = String(a)
  b = String(b)
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    const ca = a[i]
    const cb = b[j]
    if (digit.test(ca) && digit.test(cb)) {
      let ie = i
      let je = j
      while (ie < a.length && digit.test(a[ie])) {
        ie++
      }
      while (je < b.length && digit.test(b[je])) {
        je++
      }
      const c = compareDigitRuns(a.slice(i, ie), b.slice(j, je))
      if (c) {
        return c
      }
      i = ie
      j = je
    } else if (ca !== cb) {
      return ca < cb ? -1 : 1
    } else {
      i++
      j++
    }
  }

  // one is a prefix of the other, or they are numerically equal
  // (rc01 vs rc1), in which case fall back to the plain ordering
  return i < a.length ? 1
    : j < b.length ? -1
    : compareIdentifiers(a, b)
}

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  compareNaturalIdentifiers,
  rcompareIdentifiers,
}
