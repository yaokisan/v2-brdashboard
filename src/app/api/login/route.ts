import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getAdminSessionCredentials, isSameOriginRequest, setAdminSessionCookie } from '@/lib/auth'
import { passwordsMatch } from '@/lib/session'

export const runtime = 'nodejs'

const MAX_BODY_BYTES = 4096
const failures = new Map<string, { count: number; expiresAt: number }>()

// Per-process slowdown is defense in depth, not a distributed rate limiter.
// Configure production edge rate limiting as serverless instances do not share it.
function failureBucket(request: Request): string {
  const address = process.env.VERCEL === '1'
    ? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    : 'local'
  return createHash('sha256').update(address).digest('hex')
}

async function slowFailedLogin(request: Request): Promise<void> {
  const now = Date.now()
  for (const [key, entry] of Array.from(failures.entries())) {
    if (entry.expiresAt <= now) failures.delete(key)
  }
  const key = failureBucket(request)
  const previous = failures.get(key)
  const count = previous ? previous.count + 1 : 1
  if (failures.size >= 2048 && !previous) failures.delete(failures.keys().next().value!)
  failures.set(key, { count: Math.min(count, 10), expiresAt: now + 10 * 60 * 1000 })
  await new Promise(resolve => setTimeout(resolve, Math.min(250 * count, 2000)))
}

async function readLoginBody(request: Request): Promise<unknown> {
  const length = request.headers.get('content-length')
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) throw new Error('Invalid body')
  if (!request.body) throw new Error('Missing body')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) {
        await reader.cancel()
        throw new Error('Invalid body')
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: '不正なリクエストです' }, { status: 403, headers })
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return NextResponse.json({ error: 'JSON形式で送信してください' }, { status: 415, headers })
  }
  const credentials = getAdminSessionCredentials()
  if (!credentials) return NextResponse.json({ error: 'ログイン設定を確認してください' }, { status: 503, headers })

  let password: string
  try {
    const body = await readLoginBody(request)
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('Invalid body')
    const candidate = (body as { password?: unknown }).password
    if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 1024) throw new Error('Invalid password')
    password = candidate
  } catch {
    return NextResponse.json({ error: '入力内容を確認してください' }, { status: 400, headers })
  }
  if (!passwordsMatch(password, credentials.adminPassword)) {
    await slowFailedLogin(request)
    return NextResponse.json({ error: 'パスワードが間違っています' }, { status: 401, headers })
  }
  failures.delete(failureBucket(request))
  const response = NextResponse.json({ ok: true }, { headers })
  setAdminSessionCookie(response)
  return response
}
