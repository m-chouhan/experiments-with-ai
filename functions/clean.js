'use strict'

const parse = require('./parse')
const clean = (version, options) => {
  const s = parse(version.trim().replace(/^[=vV]+/, ''), options)
  return s ? s.version : null
}
module.exports = clean
