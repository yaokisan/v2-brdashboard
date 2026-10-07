import { NextResponse } from 'next/server'
import { hasAdminSession, isSameOriginRequest } from '@/lib/auth'
import * as db from '@/lib/server/database'
import { getSupabase } from '@/lib/supabase'
import { validOperation, publicReads, publicWrites, attendanceOpen } from '@/lib/data-policy'
import { attendanceCookie, attendanceMaxAge, createAttendanceProof, validAttendanceProof } from '@/lib/attendance-proof'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function reply(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
function cookie(request: Request, name: string) {
  return request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
}
function owns(request: Request, projectId: string, id: string) {
  return validAttendanceProof(cookie(request, attendanceCookie(id)), projectId, id, process.env.SESSION_SECRET || '')
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return reply({ error: '許可されていないリクエストです' }, 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) return reply({ error: 'JSONが必要です' }, 415)
  try {
    // Bound the streamed body as well as Content-Length (which may be absent).
    const reader = request.body?.getReader()
    if (!reader) return reply({ error: '入力が必要です' }, 400)
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 256 * 1024) { await reader.cancel(); return reply({ error: '入力が大きすぎます' }, 413) }
      chunks.push(value)
    }
    let payload
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return reply({ error: '入力形式が不正です' }, 400) }
    const { operation, args } = payload || {}
    if (!validOperation(operation, args)) return reply({ error: '操作または入力が不正です' }, 400)
    const admin = hasAdminSession(request)
    if (!admin && !publicReads.has(operation) && !publicWrites.has(operation)) return reply({ error: '管理者ログインが必要です' }, 401)

    // Public links grant access only to that project, never a list of all projects.
    if (!admin && operation === 'getAfterPartyAttendances') {
      const project = await db.getProject(args[0])
      if (!project?.hasAfterParty) return reply({ data: [] })
      const rows = await db.getAfterPartyAttendances(args[0])
      const visible = rows.map(row => ({ ...row, canEdit: owns(request, row.projectId, row.id) }))
        .filter(row => row.status === 'attending' || row.canEdit)
        .map(row => ({ ...row, comment: row.canEdit ? row.comment : undefined }))
      return reply({ data: visible })
    }
    if (!admin && publicWrites.has(operation)) {
      if ((process.env.SESSION_SECRET || '').length < 32) return reply({ error: 'サーバー設定を確認してください' }, 503)
      let projectId = args[0]
      if (operation === 'updateAfterPartyAttendance') {
        const { data: row, error } = await getSupabase().from('after_party_attendances').select('id,project_id').eq('id', args[0]).maybeSingle()
        if (error) return reply({ error: '回答を確認できませんでした' }, 503)
        if (!row || !owns(request, row.project_id, row.id)) return reply({ error: '別の端末や以前の回答の変更はスタッフへご連絡ください' }, 403)
        projectId = row.project_id
      }
      const project = await db.getProject(projectId)
      if (!project || !attendanceOpen(project)) return reply({ error: '受付期間を過ぎているか、受付がありません' }, 403)
      const input = args[1]
      if (input.name !== undefined) input.name = input.name.trim()
      if (input.name === '' || (input.comment?.length || 0) > 2000 || (input.name?.length || 0) > 100) return reply({ error: 'お名前・コメントを確認してください' }, 400)
      if (operation === 'createAfterPartyAttendance') {
        const rows = await db.getAfterPartyAttendances(projectId)
        const normalized = (value: string) => value.replace(/\s+/g, '').toLowerCase()
        if (rows.some(row => normalized(row.name) === normalized(input.name))) return reply({ error: '同じお名前の回答があります。元の端末で変更するか、スタッフへご連絡ください' }, 409)
        const created = await db.createAfterPartyAttendance(projectId, input)
        if (!created) return reply({ error: '回答を保存できませんでした' }, 500)
        const response = reply({ data: { ...created, canEdit: true } })
        response.cookies.set(attendanceCookie(created.id), createAttendanceProof(projectId, created.id, process.env.SESSION_SECRET!), {
          httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/data', maxAge: attendanceMaxAge
        })
        return response
      }
    }

    // Dispatch only the validated application operation. Arbitrary Supabase calls are not exposed.
    const operationFn = db[operation as keyof typeof db] as (...values: unknown[]) => Promise<unknown>
    const data = await operationFn(...args)
    return reply({ data })
  } catch {
    // Never return PostgREST error details, request bodies, or server configuration.
    return reply({ error: '処理に失敗しました。時間をおいてお試しください' }, 500)
  }
}
