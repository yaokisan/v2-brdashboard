import test from 'node:test'
import assert from 'node:assert/strict'
import { isSameOriginRequest } from '../src/lib/request-origin.ts'

const check = (url, headers) => isSameOriginRequest(new Request(url, { method: 'POST', headers }))

test('public Host is accepted when Next uses an internal hostname', () => {
  assert.equal(check('http://localhost:3107/api/login', { host: '127.0.0.1:3107', origin: 'http://127.0.0.1:3107' }), true)
  assert.equal(check('https://internal.example/api/data', { host: 'br.example', origin: 'https://br.example' }), true)
  assert.equal(check('http://localhost:3107/api/login', { host: '[::1]:3107', origin: 'http://[::1]:3107' }), true)
})

test('request URL remains the fallback for Requests without a Host header', () => {
  assert.equal(check('https://br.example/api/data', { origin: 'https://br.example' }), true)
})

test('cross-site origins, protocol/port mismatches and forwarded-host overrides are rejected', () => {
  for (const origin of ['https://evil.example', 'http://br.example', 'https://br.example:444', 'null', 'https://br.example/path', 'https://br.example, https://evil.example']) {
    assert.equal(check('https://internal.example/api/data', { host: 'br.example', origin }), false)
  }
  assert.equal(check('https://internal.example/api/data', { host: 'br.example', origin: 'https://br.example', 'sec-fetch-site': 'cross-site' }), false)
  assert.equal(check('https://internal.example/api/data', { host: 'br.example', origin: 'https://evil.example', 'x-forwarded-host': 'evil.example' }), false)
  assert.equal(check('https://br.example/api/data', { host: 'br.example' }), false)
})

test('invalid Host syntax cannot create a matching origin', () => {
  for (const host of ['', 'br.example/ignored', 'user@br.example', 'br.example, evil.example', 'br.example?ignored', 'br.example#ignored', 'br.example\\ignored']) {
    assert.equal(check('https://internal.example/api/data', { host, origin: 'https://br.example' }), false)
  }
})
