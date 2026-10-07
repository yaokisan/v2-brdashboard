import test from 'node:test'
import assert from 'node:assert/strict'
import { validOperation, attendanceOpen, proposalVisible } from '../src/lib/data-policy.ts'
import { createAttendanceProof, validAttendanceProof } from '../src/lib/attendance-proof.ts'

const project = '10000000-0000-4000-8000-000000000001'
const row = '20000000-0000-4000-8000-000000000001'
const secret = 'test-secret-not-a-production-secret-123'

test('unknown operations, non-UUID selectors and unlisted fields cannot reach the database', () => {
  for (const [operation, args] of [['__proto__', []], ['constructor', []], ['from', ['projects']], ['getProject', ['%']], ['getProject', [null]], ['getProjects', [project]], ['updateScheduleItem', [row, { project_id: project }]], ['updateProposal', [row, { is_published: true }]]]) {
    assert.equal(validOperation(operation, args), false)
  }
  assert.equal(validOperation('getProject', [project]), true)
  assert.equal(validOperation('updateScheduleItem', [row, { duration: 30 }]), true)
  assert.equal(validOperation('updateScheduleItem', [row, { duration: -1 }]), false)
})

test('public attendance cutoff uses Japan time and fails closed on invalid dates', () => {
  const configured = { hasAfterParty: true, afterPartyDeadline: '2026-10-07' }
  assert.equal(attendanceOpen(configured, Date.parse('2026-10-07T14:59:59Z')), true)
  assert.equal(attendanceOpen(configured, Date.parse('2026-10-07T15:00:00Z')), false)
  assert.equal(attendanceOpen({ hasAfterParty: false }), false)
  assert.equal(attendanceOpen({ hasAfterParty: true, afterPartyDeadline: 'bad' }), false)
})

test('unpublished, expired and malformed-expiry proposals are not public', () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  assert.equal(proposalVisible({ isPublished: false }, now), false)
  assert.equal(proposalVisible({ isPublished: true, expiresAt: '2026-10-06' }, now), false)
  assert.equal(proposalVisible({ isPublished: true, expiresAt: 'bad' }, now), false)
  assert.equal(proposalVisible({ isPublished: true, expiresAt: '2026-11-01' }, now), true)
})

test('attendance edit proof cannot be moved to another person/project, tampered, or reused after expiry', () => {
  const now = Date.parse('2026-10-07T00:00:00Z')
  const token = createAttendanceProof(project, row, secret, now)
  assert.equal(validAttendanceProof(token, project, row, secret, now), true)
  assert.equal(validAttendanceProof(token, row, row, secret, now), false)
  assert.equal(validAttendanceProof(token, project, project, secret, now), false)
  assert.equal(validAttendanceProof(`${token}x`, project, row, secret, now), false)
  assert.equal(validAttendanceProof(token, project, row, secret, now + 181 * 86400000), false)
  assert.equal(validAttendanceProof(token, project, row, '', now), false)
})
