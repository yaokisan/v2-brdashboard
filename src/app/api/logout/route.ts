import { NextResponse } from 'next/server'
import { clearAdminSessionCookie, isSameOriginRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403, headers })
  const response = NextResponse.json({ ok: true }, { headers })
  clearAdminSessionCookie(response)
  return response
}
