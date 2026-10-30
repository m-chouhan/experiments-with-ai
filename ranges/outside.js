'use strict'

const SemVer = require('../classes/semver')
const Comparator = require('../classes/comparator')
const { ANY } = Comparator
const Range = require('../classes/range')
const satisfies = require('../functions/satisfies')
const gt = require('../functions/gt')
const lt = require('../functions/lt')
const lte = require('../functions/lte')
const gte = require('../functions/gte')

const outside = (version, range, hilo, options) => {
  version = new SemVer(version, options)
  range = new Range(range, options)

  if (hilo === '>') {
    // If it satisfies the range it is not outside
    if (satisfies(version, range, options)) {
      return false
    }
    for (let i = 0; i < range.set.length; ++i) {
      const comparators = range.set[i]
      let high = null
      let low = null
      comparators.forEach((comparator) => {
        if (comparator.semver === ANY) {
          comparator = new Comparator('>=0.0.0')
        }
        high = high || comparator
        low = low || comparator
        if (gt(comparator.semver, high.semver, options)) {
          high = comparator
        } else if (lt(comparator.semver, low.semver, options)) {
          low = comparator
        }
      })
      // If the edge version comparator has a operator then our version
      // isn't outside it
      if (high.operator === '>' || high.operator === '>=') {
        return false
      }
      // If the lowest version comparator has an operator and our version
      // is less than it then it isn't outside the range
      if ((!low.operator || low.operator === '>') &&
          lte(version, low.semver)) {
        return false
      } else if (low.operator === '>=' && lt(version, low.semver)) {
        return false
      }
    }
    return true
  } else if (hilo === '<') {
    // If it satisfies the range it is not outside
    if (satisfies(version, range, options)) {
      return false
    }
    for (let i = 0; i < range.set.length; ++i) {
      const comparators = range.set[i]
      let high = null
      let low = null
      comparators.forEach((comparator) => {
        if (comparator.semver === ANY) {
          comparator = new Comparator('>=0.0.0')
        }
        high = high || comparator
        low = low || comparator
        if (lt(comparator.semver, high.semver, options)) {
          high = comparator
        } else if (gt(comparator.semver, low.semver, options)) {
          low = comparator
        }
      })
      // If the edge version comparator has a operator then our version
      // isn't outside it
      if (high.operator === '<' || high.operator === '<=') {
        return false
      }
      // If the lowest version comparator has an operator and our version
      // is less than it then it isn't outside the range
      if ((!low.operator || low.operator === '<') &&
          gte(version, low.semver)) {
        return false
      } else if (low.operator === '<=' && gt(version, low.semver)) {
        return false
      }
    }
    return true
  } else {
    throw new TypeError('Must provide a hilo val of "<" or ">"')
  }
}

module.exports = outside
