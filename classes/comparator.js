'use strict'

const NUM = '0|[1-9]\\d{0,256}'
const NUMLOOSE = '\\d{1,256}'
const NONNUM = '\\d{0,256}[a-zA-Z-][a-zA-Z0-9-]{0,250}'
const PREID = '(?:' + NONNUM + '|' + NUM + ')'
const PREIDLOOSE = '(?:' + NONNUM + '|' + NUMLOOSE + ')'
const PRE = '(?:-(' + PREID + '(?:\\.' + PREID + ')*))'
const PRELOOSE = '(?:-?(' + PREIDLOOSE + '(?:\\.' + PREIDLOOSE + ')*))'
const BUILD = '(?:\\+([a-zA-Z0-9-]{1,250}(?:\\.[a-zA-Z0-9-]{1,250})*))'
const FULLPLAIN = 'v?(' + NUM + ')\\.(' + NUM + ')\\.(' + NUM + ')' + PRE + '?' + BUILD + '?'
const LOOSEPLAIN = '[v=\\s]*(' + NUMLOOSE + ')\\.(' + NUMLOOSE + ')\\.(' + NUMLOOSE + ')' + PRELOOSE + '?' + BUILD + '?'

const COMPARATOR_RE = new RegExp('^((?:<|>)?=?)\\s{0,1}(' + FULLPLAIN + ')$|^$')
const COMPARATORLOOSE_RE = new RegExp('^((?:<|>)?=?)\\s{0,1}(' + LOOSEPLAIN + ')$|^$')

const ANY = Symbol('SemVer ANY')
// hoisted class for cyclic dependency
class Comparator {
  static get ANY () {
    return ANY
  }

  constructor (comp, options) {
    if (!options) {
      options = Object.freeze({})
    } else if (typeof options !== 'object') {
      options = Object.freeze({ loose: true })
    }

    if (comp instanceof Comparator) {
      if (comp.loose === !!options.loose &&
        !!comp.options.naturalPrerelease === !!options.naturalPrerelease) {
        return comp
      } else {
        comp = comp.value
      }
    }

    comp = comp.trim().split(/\s+/).join(' ')
    debug('comparator', comp, options)
    this.options = options
    this.loose = !!options.loose
    this.parse(comp)

    if (this.semver === ANY) {
      this.value = ''
    } else {
      this.value = this.operator + this.semver.version
    }

    debug('comp', this)
  }

  parse (comp) {
    const r = this.options.loose ? COMPARATORLOOSE_RE : COMPARATOR_RE
    const m = comp.match(r)

    if (!m) {
      throw new TypeError(`Invalid comparator: ${comp}`)
    }

    this.operator = m[1] !== undefined ? m[1] : ''
    if (this.operator === '=') {
      this.operator = ''
    }

    // if it literally is just '>' or '' then allow anything.
    if (!m[2]) {
      this.semver = ANY
    } else {
      this.semver = new SemVer(m[2], this.options)
    }
  }

  toString () {
    return this.value
  }

  test (version) {
    debug('Comparator.test', version, this.options.loose)

    if (this.semver === ANY || version === ANY) {
      return true
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    switch (this.operator) {
      case '===':
        return version.version === this.semver.version
      case '!==':
        return version.version !== this.semver.version
      case '':
      case '=':
      case '==':
        return version.compare(this.semver) === 0
      case '!=':
        return version.compare(this.semver) !== 0
      case '>':
        return version.compare(this.semver) > 0
      case '>=':
        return version.compare(this.semver) >= 0
      case '<':
        return version.compare(this.semver) < 0
      case '<=':
        return version.compare(this.semver) <= 0
      default:
        throw new TypeError(`Invalid operator: ${this.operator}`)
    }
  }

  intersects (comp, options) {
    if (!(comp instanceof Comparator)) {
      throw new TypeError('a Comparator is required')
    }

    if (this.operator === '') {
      if (this.value === '') {
        return true
      }
      return new Range(comp.value, options).test(this.value)
    } else if (comp.operator === '') {
      if (comp.value === '') {
        return true
      }
      return new Range(this.value, options).test(comp.semver)
    }

    if (!options) {
      options = Object.freeze({})
    } else if (typeof options !== 'object') {
      options = Object.freeze({ loose: true })
    }

    // Special cases where nothing can possibly be lower
    if (options.includePrerelease &&
      (this.value === '<0.0.0-0' || comp.value === '<0.0.0-0')) {
      return false
    }
    if (!options.includePrerelease &&
      (this.value.startsWith('<0.0.0') || comp.value.startsWith('<0.0.0'))) {
      return false
    }

    // Same direction increasing (> or >=)
    if (this.operator.startsWith('>') && comp.operator.startsWith('>')) {
      return true
    }
    // Same direction decreasing (< or <=)
    if (this.operator.startsWith('<') && comp.operator.startsWith('<')) {
      return true
    }
    // same SemVer and both sides are inclusive (<= or >=)
    if (
      (this.semver.version === comp.semver.version) &&
      this.operator.includes('=') && comp.operator.includes('=')) {
      return true
    }
    // opposite directions less than
    if (this.semver.compare(comp.semver) < 0 &&
      this.operator.startsWith('>') && comp.operator.startsWith('<')) {
      return true
    }
    // opposite directions greater than
    if (this.semver.compare(comp.semver) > 0 &&
      this.operator.startsWith('<') && comp.operator.startsWith('>')) {
      return true
    }
    return false
  }
}

module.exports = Comparator

const debug = require('../internal/debug')
const SemVer = require('./semver')
const Range = require('./range')
