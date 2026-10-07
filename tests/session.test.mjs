import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { ADMIN_SESSION_DURATION_SECONDS, createAdminSessionToken, verifyAdminSessionToken, passwordsMatch } from '../src/lib/session.ts'

const credentials = { adminPassword: 'test-password-only', sessionSecret: 'test-session-secret-with-32-characters' }
const now = 1_800_000_000

test('a valid signed session expires at 24 hours', () => {
  const token = createAdminSessionToken(credentials, now)
  assert.equal(verifyAdminSessionToken(token, credentials, now), true)
  assert.equal(verifyAdminSessionToken(token, credentials, now + ADMIN_SESSION_DURATION_SECONDS - 1), true)
  assert.equal(verifyAdminSessionToken(token, credentials, now + ADMIN_SESSION_DURATION_SECONDS), false)
})

test('changing the password or session secret invalidates existing sessions', () => {
  const token = createAdminSessionToken(credentials, now)
  assert.equal(verifyAdminSessionToken(token, { ...credentials, adminPassword: 'different' }, now), false)
  assert.equal(verifyAdminSessionToken(token, { ...credentials, sessionSecret: 'another-test-session-secret-long-enough' }, now), false)
})

test('legacy cookies and malformed or tampered tokens are rejected', () => {
  const token = createAdminSessionToken(credentials, now)
  const [payload, signature] = token.split('.')
  const changedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), exp: now + 86401 })).toString('base64url')
  for (const candidate of [undefined, '', 'true', 'auth=true', 'a.b', `${token}.extra`, `${changedPayload}.${signature}`, `${payload}.${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`, 'x'.repeat(1025)]) {
    assert.equal(verifyAdminSessionToken(candidate, credentials, now), false)
  }
})

test('unconfigured credentials fail closed', () => {
  const token = createAdminSessionToken(credentials, now)
  for (const invalid of [{ ...credentials, adminPassword: '' }, { ...credentials, sessionSecret: '' }, { ...credentials, sessionSecret: 'short' }]) {
    assert.equal(verifyAdminSessionToken(token, invalid, now), false)
    assert.throws(() => createAdminSessionToken(invalid, now))
  }
})

test('even signed sessions with a future issue time or invalid duration are rejected', () => {
  const key = createHmac('sha256', credentials.sessionSecret).update('br-admin-session:v1\0').update(credentials.adminPassword).digest()
  const sign = value => {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url')
    return `${payload}.${createHmac('sha256', key).update(payload).digest('base64url')}`
  }
  const base = { v: 1, iat: now, exp: now + 86400, nonce: 'a'.repeat(22) }
  assert.equal(verifyAdminSessionToken(sign({ ...base, iat: now + 120, exp: now + 86520 }), credentials, now), false)
  assert.equal(verifyAdminSessionToken(sign({ ...base, exp: now + 86401 }), credentials, now), false)
})

test('sessions have independent nonces and passwords require an exact match', () => {
  assert.notEqual(createAdminSessionToken(credentials, now), createAdminSessionToken(credentials, now))
  assert.equal(passwordsMatch('same', 'same'), true)
  assert.equal(passwordsMatch('same', 'different'), false)
  assert.equal(passwordsMatch('', 'configured-password'), false)
})
