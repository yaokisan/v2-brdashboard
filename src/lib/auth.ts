import 'server-only'

import { NextResponse } from 'next/server'
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_DURATION_SECONDS, createAdminSessionToken, validSessionCredentials, verifyAdminSessionToken } from './session'
import { isSameOriginRequest } from './request-origin'

export { ADMIN_SESSION_COOKIE, isSameOriginRequest }

export function getAdminSessionCredentials() {
  const credentials = { adminPassword: process.env.ADMIN_PASSWORD ?? '', sessionSecret: process.env.SESSION_SECRET ?? '' }
  return validSessionCredentials(credentials) ? credentials : null
}

export function hasAdminSessionToken(token: string | undefined): boolean {
  const credentials = getAdminSessionCredentials()
  return credentials !== null && verifyAdminSessionToken(token, credentials)
}

export function hasAdminSession(request: Request): boolean {
  const values = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim())
    .filter(value => value.startsWith(`${ADMIN_SESSION_COOKIE}=`))
  if (values.length !== 1) return false
  return hasAdminSessionToken(values[0].slice(ADMIN_SESSION_COOKIE.length + 1))
}

export function requireAdminSession(request: Request): NextResponse | null {
  if (hasAdminSession(request)) return null
  return NextResponse.json({ error: 'ログインが必要です' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
}

export function requireAdminMutation(request: Request): NextResponse | null {
  const unauthorized = requireAdminSession(request)
  if (unauthorized) return unauthorized
  if (isSameOriginRequest(request)) return null
  return NextResponse.json({ error: '不正なリクエストです' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
}

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }

export function setAdminSessionCookie(response: NextResponse): void {
  const credentials = getAdminSessionCredentials()
  if (!credentials) throw new Error('Admin authentication is not configured')
  response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(credentials), { ...cookieOptions, maxAge: ADMIN_SESSION_DURATION_SECONDS })
  response.cookies.set('auth', '', { ...cookieOptions, maxAge: 0 })
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...cookieOptions, maxAge: 0 })
  response.cookies.set('auth', '', { ...cookieOptions, maxAge: 0 })
}
