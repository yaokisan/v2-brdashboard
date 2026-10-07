import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'br_admin_session'
export const ADMIN_SESSION_DURATION_SECONDS = 24 * 60 * 60

export type AdminSessionCredentials = { adminPassword: string; sessionSecret: string }

function signingKey(credentials: AdminSessionCredentials): Buffer {
  return createHmac('sha256', credentials.sessionSecret)
    .update('br-admin-session:v1\0').update(credentials.adminPassword).digest()
}

export function validSessionCredentials(credentials: AdminSessionCredentials): boolean {
  return credentials.adminPassword.length > 0 && credentials.sessionSecret.length >= 32
}

export function passwordsMatch(candidate: string, expected: string): boolean {
  return timingSafeEqual(createHash('sha256').update(candidate).digest(), createHash('sha256').update(expected).digest())
}

export function createAdminSessionToken(credentials: AdminSessionCredentials, now = Math.floor(Date.now() / 1000)): string {
  if (!validSessionCredentials(credentials)) throw new Error('Admin authentication is not configured')
  const payload = Buffer.from(JSON.stringify({
    v: 1, iat: now, exp: now + ADMIN_SESSION_DURATION_SECONDS, nonce: randomBytes(16).toString('base64url'),
  })).toString('base64url')
  const signature = createHmac('sha256', signingKey(credentials)).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyAdminSessionToken(token: string | undefined, credentials: AdminSessionCredentials, now = Math.floor(Date.now() / 1000)): boolean {
  if (!validSessionCredentials(credentials) || !token || token.length > 1024) return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [payload, signature] = parts
  if (!/^[A-Za-z0-9_-]+$/.test(payload) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return false
  try {
    const providedSignature = Buffer.from(signature, 'base64url')
    if (providedSignature.toString('base64url') !== signature) return false
    const expectedSignature = createHmac('sha256', signingKey(credentials)).update(payload).digest()
    if (providedSignature.length !== expectedSignature.length || !timingSafeEqual(providedSignature, expectedSignature)) return false
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return session?.v === 1 && Number.isSafeInteger(session.iat) && Number.isSafeInteger(session.exp)
      && session.exp - session.iat === ADMIN_SESSION_DURATION_SECONDS && session.iat <= now + 60 && session.exp > now
      && typeof session.nonce === 'string' && /^[A-Za-z0-9_-]{22}$/.test(session.nonce)
  } catch {
    return false
  }
}
