'use strict'

const numeric = /^[0-9]+$/
const chunks = /\d+|\D+/g

// compare strings where each run of digits is compared as a number
const compareNatural = (a, b) => {
  const as = a.match(chunks)
  const bs = b.match(chunks)
  const len = Math.min(as.length, bs.length)
  for (let i = 0; i < len; i++) {
    const x = as[i]
    const y = bs[i]
    if (x === y) {
      continue
    }
    if (numeric.test(x) && numeric.test(y)) {
      // compare as numbers without losing precision on long digit runs
      const xs = x.replace(/^0+/, '')
      const ys = y.replace(/^0+/, '')
      if (xs.length !== ys.length) {
        return xs.length < ys.length ? -1 : 1
      }
      if (xs !== ys) {
        return xs < ys ? -1 : 1
      }
      continue
    }
    return x < y ? -1 : 1
  }
  if (as.length !== bs.length) {
    return as.length < bs.length ? -1 : 1
  }
  // numerically equal (eg, leading zeros), fall back to a stable order
  return a === b ? 0 : a < b ? -1 : 1
}

const compareIdentifiers = (a, b, natural) => {
  if (typeof a === 'number' && typeof b === 'number') {
    return a === b ? 0 : a < b ? -1 : 1
  }

  const anum = numeric.test(a)
  const bnum = numeric.test(b)

  if (natural && !anum && !bnum) {
    return compareNatural(a, b)
  }

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

const rcompareIdentifiers = (a, b) => compareIdentifiers(b, a)

module.exports = {
  compareIdentifiers,
  rcompareIdentifiers,
}
