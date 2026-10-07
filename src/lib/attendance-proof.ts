import { createHmac, timingSafeEqual } from 'node:crypto'

export const attendanceCookie = (id: string) => `br_att_${id}`
export const attendanceMaxAge = 180 * 24 * 60 * 60

function signature(body: string, secret: string) {
  return createHmac('sha256', secret).update(`attendance-v1:${body}`).digest('base64url')
}
export function createAttendanceProof(projectId: string, id: string, secret: string, now = Date.now()): string {
  if (secret.length < 32) throw new Error('Session secret is not configured')
  const body = `${projectId}.${id}.${Math.floor(now / 1000) + attendanceMaxAge}`
  return `${body}.${signature(body, secret)}`
}
export function validAttendanceProof(token: string | undefined, projectId: string, id: string, secret: string, now = Date.now()): boolean {
  if (!token || secret.length < 32 || token.length > 300) return false
  const [project, row, expires, mac, extra] = token.split('.')
  if (extra !== undefined || project !== projectId || row !== id || !/^\d+$/.test(expires || '') || Number(expires) <= now / 1000 || !/^[A-Za-z0-9_-]{43}$/.test(mac || '')) return false
  const expected = signature(`${project}.${row}.${expires}`, secret)
  return mac.length === expected.length && timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
}
