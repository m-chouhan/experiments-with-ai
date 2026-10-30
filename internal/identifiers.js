'use strict'

const numeric = /^[0-9]+$/
const chunks = /[0-9]+|[^0-9]+/g

// compare digit runs as numbers without losing precision on huge values
const compareDigits = (a, b) => {
  a = a.replace(/^0+(?=.)/, '')
  b = b.replace(/^0+(?=.)/, '')
  return a.length !== b.length ? (a.length < b.length ? -1 : 1)
    : a === b ? 0
    : a < b ? -1
    : 1
}

// alphanumeric identifiers only: digit runs compare numerically
const compareNatural = (a, b) => {
  const as = String(a).match(chunks)
  const bs = String(b).match(chunks)
  for (let i = 0; i < as.length && i < bs.length; i++) {
    const x = as[i]
    const y = bs[i]
    if (x === y) {
      continue
    }
    const c = /^[0-9]/.test(x) && /^[0-9]/.test(y) ? compareDigits(x, y)
      : x < y ? -1
      : 1
    if (c !== 0) {
      return c
    }
  }
  if (as.length !== bs.length) {
    return as.length < bs.length ? -1 : 1
  }
  // numerically equal (eg rc01 vs rc1), keep a stable total order
  return a === b ? 0 : a < b ? -1 : 1
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
    return compareNatural(a, b)
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
