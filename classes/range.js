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

const XID = NUM + '|x|X|\\*'
const XIDLOOSE = NUMLOOSE + '|x|X|\\*'
const XRANGEPLAIN = '[v=\\s]*(' + XID + ')(?:\\.(' + XID + ')(?:\\.(' + XID + ')(?:' + PRE + ')?' + BUILD + '?)?)?'
const XRANGEPLAINLOOSE = '[v=\\s]*(' + XIDLOOSE + ')(?:\\.(' + XIDLOOSE + ')(?:\\.(' + XIDLOOSE + ')(?:' + PRELOOSE + ')?' + BUILD + '?)?)?'

const HYPHEN_RE = new RegExp('^\\s{0,1}(' + XRANGEPLAIN + ')\\s{1,1}-\\s{1,1}(' + XRANGEPLAIN + ')\\s{0,1}$')
const HYPHENLOOSE_RE = new RegExp('^\\s{0,1}(' + XRANGEPLAINLOOSE + ')\\s{1,1}-\\s{1,1}(' + XRANGEPLAINLOOSE + ')\\s{0,1}$')
const COMPTRIM_RE = new RegExp('(\\s{0,1})((?:<|>)?=?)\\s{0,1}(' + LOOSEPLAIN + '|' + XRANGEPLAIN + ')', 'g')
const TILDETRIM_RE = /(\s{0,1})(?:~>?)\s{1,1}/g
const CARETTRIM_RE = /(\s{0,1})(?:\^)\s{1,1}/g
const TILDE_RE = new RegExp('^(?:~>?)' + XRANGEPLAIN + '$')
const TILDELOOSE_RE = new RegExp('^(?:~>?)' + XRANGEPLAINLOOSE + '$')
const CARET_RE = new RegExp('^(?:\\^)' + XRANGEPLAIN + '$')
const CARETLOOSE_RE = new RegExp('^(?:\\^)' + XRANGEPLAINLOOSE + '$')
const XRANGE_RE = new RegExp('^((?:<|>)?=?)\\s{0,1}' + XRANGEPLAIN + '$')
const XRANGELOOSE_RE = new RegExp('^((?:<|>)?=?)\\s{0,1}' + XRANGEPLAINLOOSE + '$')
const COMPARATORLOOSE_RE = new RegExp('^((?:<|>)?=?)\\s{0,1}(' + LOOSEPLAIN + ')$|^$')
const BUILD_RE = new RegExp(BUILD)
// unbounded global build-metadata stripper used by parseRange
const BUILDSTRIP_RE = /(?:\+([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*))/g

// parsed ranges, oldest first, at most 1000
const rangeCache = new Map()

// hoisted class for cyclic dependency
class Range {
  constructor (range, options) {
    if (!options) {
      options = Object.freeze({})
    } else if (typeof options !== 'object') {
      options = Object.freeze({ loose: true })
    }

    if (range instanceof Range) {
      const tagsA = range.options.prereleaseTags
      const tagsB = options.prereleaseTags
      const tagsSame = ((!tagsA || tagsA.length === 0) && (!tagsB || tagsB.length === 0)) ||
        (tagsA && tagsB && tagsA.length === tagsB.length && tagsA.every((v, i) => v === tagsB[i]))
      if (
        range.loose === !!options.loose &&
        range.includePrerelease === !!options.includePrerelease &&
        tagsSame
      ) {
        return range
      } else {
        return new Range(range.raw, options)
      }
    }

    if (range instanceof Comparator) {
      // just put it in the set and return
      this.raw = range.value
      this.set = [[range]]
      this.formatted = undefined
      return this
    }

    this.options = options
    this.loose = !!options.loose
    this.includePrerelease = !!options.includePrerelease

    // First reduce all whitespace as much as possible so we do not have to rely
    // on potentially slow regexes like \s*. This is then stored and used for
    // future error messages as well.
    this.raw = range.trim().replace(/\s+/g, ' ')

    // split on ||, parse each part, throw out the empty ones
    const set = []
    for (const part of this.raw.split('||')) {
      const comps = this.parseRange(part.trim())
      if (comps.length) {
        set.push(comps)
      }
    }
    this.set = set

    if (!this.set.length) {
      throw new TypeError(`Invalid SemVer Range: ${this.raw}`)
    }

    // if we have any that are not the null set, throw out null sets.
    if (this.set.length > 1) {
      // keep the first one, in case they're all null sets
      const first = this.set[0]
      this.set = this.set.filter(c => c[0].value !== '<0.0.0-0')
      if (this.set.length === 0) {
        this.set = [first]
      } else if (this.set.length > 1) {
        // if we have any that are *, then the range is just *
        for (const c of this.set) {
          if (c.length === 1 && c[0].value === '') {
            this.set = [c]
            break
          }
        }
      }
    }

    this.formatted = undefined
  }

  get range () {
    if (this.formatted === undefined) {
      this.formatted = ''
      for (let i = 0; i < this.set.length; i++) {
        if (i > 0) {
          this.formatted += '||'
        }
        const comps = this.set[i]
        for (let k = 0; k < comps.length; k++) {
          if (k > 0) {
            this.formatted += ' '
          }
          this.formatted += comps[k].toString().trim()
        }
      }
    }
    return this.formatted
  }

  format () {
    return this.range
  }

  toString () {
    return this.range
  }

  parseRange (range) {
    // strip build metadata so it can't bleed into the version
    range = range.replace(BUILDSTRIP_RE, '')

    // memoize range parsing for performance.
    // this is a very hot path, and fully deterministic.
    const memoKey = ((this.options.includePrerelease && 1) | (this.options.loose && 2)) + ':' + range
    const cached = rangeCache.get(memoKey)
    if (cached !== undefined) {
      rangeCache.delete(memoKey)
      rangeCache.set(memoKey, cached)
      return cached
    }

    const loose = this.options.loose
    const incPr = this.options.includePrerelease

    // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
    range = range.replace(loose ? HYPHENLOOSE_RE : HYPHEN_RE, ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (!fM || fM.toLowerCase() === 'x' || fM === '*') {
        from = ''
      } else if (!fm || fm.toLowerCase() === 'x' || fm === '*') {
        from = `>=${fM}.0.0${incPr ? '-0' : ''}`
      } else if (!fp || fp.toLowerCase() === 'x' || fp === '*') {
        from = `>=${fM}.${fm}.0${incPr ? '-0' : ''}`
      } else if (fpr) {
        from = `>=${from}`
      } else {
        from = `>=${from}${incPr ? '-0' : ''}`
      }

      if (!tM || tM.toLowerCase() === 'x' || tM === '*') {
        to = ''
      } else if (!tm || tm.toLowerCase() === 'x' || tm === '*') {
        to = `<${+tM + 1}.0.0-0`
      } else if (!tp || tp.toLowerCase() === 'x' || tp === '*') {
        to = `<${tM}.${+tm + 1}.0-0`
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`
      } else {
        to = `<=${to}`
      }

      return `${from} ${to}`.trim()
    })

    // `> 1.2.3 < 1.2.5` => `>1.2.3 <1.2.5`
    range = range.replace(COMPTRIM_RE, '$1$2$3')
    // `~ 1.2.3` => `~1.2.3`
    range = range.replace(TILDETRIM_RE, '$1~')
    // `^ 1.2.3` => `^1.2.3`
    range = range.replace(CARETTRIM_RE, '$1^')

    // At this point, the range is completely trimmed and
    // ready to be split into comparators.
    const z = incPr ? '-0' : ''
    const parts = []
    for (let comp of range.split(' ')) {
      comp = comp.replace(BUILD_RE, '')

      // ^ --> * (any, kinda silly)
      // ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0-0
      // ^2.0, ^2.0.x --> >=2.0.0 <3.0.0-0
      // ^1.2, ^1.2.x --> >=1.2.0 <2.0.0-0
      // ^1.2.3 --> >=1.2.3 <2.0.0-0
      // ^1.2.0 --> >=1.2.0 <2.0.0-0
      // ^0.0.1 --> >=0.0.1 <0.0.2-0
      // ^0.1.0 --> >=0.1.0 <0.2.0-0
      comp = comp.trim().split(/\s+/).map((c) => c.replace(loose ? CARETLOOSE_RE : CARET_RE, (_, M, m, p, pr) => {
        let ret
        if (!M || M.toLowerCase() === 'x' || M === '*') {
          ret = ''
        } else if (!m || m.toLowerCase() === 'x' || m === '*') {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
        } else if (!p || p.toLowerCase() === 'x' || p === '*') {
          if (M === '0') {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`
          }
        } else if (pr) {
          if (M === '0') {
            if (m === '0') {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`
          }
        } else {
          if (M === '0') {
            if (m === '0') {
              ret = `>=${M}.${m}.${p} <${M}.${m}.${+p + 1}-0`
            } else {
              ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`
          }
        }
        return ret
      })).join(' ')

      // ~, ~> --> * (any, kinda silly)
      // ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0-0
      // ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0-0
      // ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0-0
      // ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0-0
      // ~0.0.1 --> >=0.0.1 <0.1.0-0
      comp = comp.trim().split(/\s+/).map((c) => c.replace(loose ? TILDELOOSE_RE : TILDE_RE, (_, M, m, p, pr) => {
        let ret
        if (!M || M.toLowerCase() === 'x' || M === '*') {
          ret = ''
        } else if (!m || m.toLowerCase() === 'x' || m === '*') {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`
        } else if (!p || p.toLowerCase() === 'x' || p === '*') {
          ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`
        } else if (pr) {
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`
        }
        return ret
      })).join(' ')

      // 1.x, >=1.2.x, <1.x etc
      comp = comp.split(/\s+/).map((c) => {
        c = c.trim()
        return c.replace(loose ? XRANGELOOSE_RE : XRANGE_RE, (ret, gtlt, M, m, p, pr) => {
          const xM = !M || M.toLowerCase() === 'x' || M === '*'
          const xm = xM || !m || m.toLowerCase() === 'x' || m === '*'
          const xp = xm || !p || p.toLowerCase() === 'x' || p === '*'
          if ((xM && !(!m || m.toLowerCase() === 'x' || m === '*')) ||
            ((!m || m.toLowerCase() === 'x' || m === '*') && p && !(p.toLowerCase() === 'x' || p === '*'))) {
            return c
          }

          if (gtlt === '=' && xp) {
            gtlt = ''
          }

          // if we're including prereleases in the match, then we need
          // to fix this to -0, the lowest possible prerelease value
          pr = incPr ? '-0' : ''

          if (xM) {
            if (gtlt === '>' || gtlt === '<') {
              // nothing is allowed
              ret = '<0.0.0-0'
            } else {
              // nothing is forbidden
              ret = '*'
            }
          } else if (gtlt && xp) {
            // we know patch is an x, because we have any x at all.
            // replace X with 0
            if (xm) {
              m = 0
            }
            p = 0

            if (gtlt === '>') {
              // >1 => >=2.0.0
              // >1.2 => >=1.3.0
              gtlt = '>='
              if (xm) {
                M = +M + 1
                m = 0
                p = 0
              } else {
                m = +m + 1
                p = 0
              }
            } else if (gtlt === '<=') {
              // <=0.7.x is actually <0.8.0, since any 0.7.x should
              // pass.  Similarly, <=7.x is actually <8.0.0, etc.
              gtlt = '<'
              if (xm) {
                M = +M + 1
              } else {
                m = +m + 1
              }
            }

            if (gtlt === '<') {
              pr = '-0'
            }

            ret = `${gtlt + M}.${m}.${p}${pr}`
          } else if (xm) {
            ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`
          } else if (xp) {
            ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`
          }
          return ret
        })
      }).join(' ')

      // Because * is AND-ed with everything else in the comparator,
      // and '' means "any version", just remove the *s entirely.
      comp = comp.trim().replace(/(<|>)?=?\s{0,1}\*/, '')
      parts.push(comp)
    }

    let rangeList = parts.join(' ').split(/\s+/).map((comp) => {
      // >=0.0.0 is equivalent to *
      return comp.trim().replace(incPr ? /^\s{0,1}>=\s{0,1}0\.0\.0-0\s{0,1}$/ : /^\s{0,1}>=\s{0,1}0\.0\.0\s{0,1}$/, '')
    })

    if (loose) {
      // in loose mode, throw out any that are not valid comparators
      rangeList = rangeList.filter(comp => !!comp.match(COMPARATORLOOSE_RE))
    }

    // if any comparators are the null set, then replace with JUST null set
    // if more than one comparator, remove any * comparators
    // also, don't include the same comparator more than once
    const rangeMap = new Map()
    const comparators = rangeList.map(comp => new Comparator(comp, this.options))
    for (const comp of comparators) {
      if (comp.value === '<0.0.0-0') {
        return [comp]
      }
      rangeMap.set(comp.value, comp)
    }
    if (rangeMap.size > 1 && rangeMap.has('')) {
      rangeMap.delete('')
    }

    const result = [...rangeMap.values()]
    if (!rangeCache.delete(memoKey)) {
      if (rangeCache.size >= 1000) {
        rangeCache.delete(rangeCache.keys().next().value)
      }
      rangeCache.set(memoKey, result)
    }
    return result
  }

  intersects (range, options) {
    if (!(range instanceof Range)) {
      throw new TypeError('a Range is required')
    }

    return this.set.some((thisComparators) => {
      // can anything satisfy all of this set?
      let ok = true
      let rest = thisComparators.slice()
      let current = rest.pop()
      while (ok && rest.length) {
        ok = rest.every((other) => current.intersects(other, options))
        current = rest.pop()
      }
      if (!ok) {
        return false
      }
      return range.set.some((rangeComparators) => {
        // and all of that set?
        let ok2 = true
        rest = rangeComparators.slice()
        current = rest.pop()
        while (ok2 && rest.length) {
          ok2 = rest.every((other) => current.intersects(other, options))
          current = rest.pop()
        }
        return ok2 && thisComparators.every((thisComparator) => {
          return rangeComparators.every((rangeComparator) => {
            return thisComparator.intersects(rangeComparator, options)
          })
        })
      })
    })
  }

  // if ANY of the sets match ALL of its comparators, then pass
  test (version) {
    if (!version) {
      return false
    }

    if (typeof version === 'string') {
      try {
        version = new SemVer(version, this.options)
      } catch (er) {
        return false
      }
    }

    for (let i = 0; i < this.set.length; i++) {
      const set = this.set[i]
      let pass = true
      for (let j = 0; j < set.length; j++) {
        if (!set[j].test(version)) {
          pass = false
          break
        }
      }
      if (!pass) {
        continue
      }
      if (version.prerelease.length && !this.options.includePrerelease) {
        // Check if the prerelease tag is in the prereleaseTags array
        const prereleaseTags = this.options.prereleaseTags || []
        if (prereleaseTags.length > 0 && version.prerelease.length > 0 &&
          prereleaseTags.includes(String(version.prerelease[0]))) {
          return true
        }
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for (let j = 0; j < set.length; j++) {
          if (set[j].semver === Comparator.ANY) {
            continue
          }
          if (set[j].semver.prerelease.length > 0) {
            const allowed = set[j].semver
            if (allowed.major === version.major &&
                allowed.minor === version.minor &&
                allowed.patch === version.patch) {
              return true
            }
          }
        }
        // Version has a -pre, but it's not one of the ones we like.
        continue
      }
      return true
    }
    return false
  }
}

module.exports = Range

const Comparator = require('./comparator')
const SemVer = require('./semver')
