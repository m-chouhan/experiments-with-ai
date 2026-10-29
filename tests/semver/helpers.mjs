// Loads the semver build under test (PROJECT_DIR) and gives a compact Given/When/Then check.
import { test } from 'node:test'
import assert from 'node:assert'
import path from 'node:path'
import { createRequire } from 'node:module'

const dir = process.env.PROJECT_DIR
if (!dir) throw new Error('set PROJECT_DIR to the semver project to test')
export const semver = createRequire(import.meta.url)(path.resolve(dir))

// expect('valid("V1.2.3")', () => semver.valid('V1.2.3'), '1.2.3')
export const expect = (when, fn, then) => test(`${when} → ${JSON.stringify(then)}`, () => {
  assert.deepStrictEqual(fn(), then)
})
