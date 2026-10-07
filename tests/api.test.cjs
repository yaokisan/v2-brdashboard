const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Compile the real route and auth modules; only database I/O is replaced.
function harness(overrides = {}, row = null) {
  const calls = []
  const db = new Proxy(overrides, { get(target, op) { return async (...args) => { calls.push({ op, args }); return op in target ? target[op](...args) : true } } })
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    function scopedRequire(name) {
      if (name === 'server-only') return {}
      if (name === '@/lib/server/database') return db
      if (name === '@/lib/supabase') return { getSupabase: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }) }) }) }
      if (name.startsWith('@/')) return load(path.resolve(__dirname, '../src', name.slice(2) + '.ts'))
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'))
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(scopedRequire, module, module.exports)
    return module.exports
  }
  return { route: load(path.resolve(__dirname, '../src/app/api/data/route.ts')), load, calls }
}
const project = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
process.env.ADMIN_PASSWORD = 'test-password-only'
process.env.SESSION_SECRET = 'test-session-secret-not-a-real-secret'
const credentials = { adminPassword: process.env.ADMIN_PASSWORD, sessionSecret: process.env.SESSION_SECRET }
function request(operation, args, headers = {}) {
  return new Request('https://br.example/api/data', { method: 'POST', headers: { origin: 'https://br.example', 'content-type': 'application/json', ...headers }, body: JSON.stringify({ operation, args }) })
}

test('every admin operation rejects no session and the old forged cookie without database access', async () => {
  for (const cookie of ['', 'auth=true', 'br_admin_session=true']) {
    const { route, calls } = harness()
    for (const [op, args] of [['getProjects', []], ['getProposals', []], ['getProposal', [id]], ['deleteProject', [id]], ['updatePerformer', [id, { name: 'attacker' }]], ['deleteAfterPartyAttendance', [id]]]) {
      assert.equal((await route.POST(request(op, args, { cookie }))).status, 401)
    }
    assert.equal(calls.length, 0)
  }
})

test('a signed admin session permits CRUD, but cross-origin, invalid input and expired sessions do not', async () => {
  const { route, load, calls } = harness()
  const { createAdminSessionToken } = load(path.resolve(__dirname, '../src/lib/session.ts'))
  const cookie = `br_admin_session=${createAdminSessionToken(credentials)}`
  assert.equal((await route.POST(request('deleteProject', [id], { cookie }))).status, 200)
  assert.equal(calls[0].op, 'deleteProject')
  assert.equal((await route.POST(request('deleteProject', [id], { cookie, origin: 'https://evil.example' }))).status, 403)
  assert.equal((await route.POST(request('updateScheduleItem', [id, { project_id: project }], { cookie }))).status, 400)
  const old = createAdminSessionToken(credentials, Math.floor(Date.now() / 1000) - 86401)
  assert.equal((await route.POST(request('deleteProject', [id], { cookie: `br_admin_session=${old}` }))).status, 401)
  assert.equal(calls.length, 1)
})

test('public project reads are scoped and public attendance hides other people’s comments and edit rights', async () => {
  const { route, calls } = harness({ getProject: () => ({ id: project, hasAfterParty: true }), getAfterPartyAttendances: () => [{ id, projectId: project, name: 'Example', status: 'attending', comment: 'private' }] })
  const response = await route.POST(request('getAfterPartyAttendances', [project]))
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.data[0].comment, undefined)
  assert.equal(body.data[0].canEdit, false)
  assert.deepEqual(calls.map(call => call.args), [[project], [project]])
})

test('public attendance cannot edit another response or submit after the server deadline', async () => {
  const { route, calls, load } = harness({ getProject: () => ({ hasAfterParty: true, afterPartyDeadline: '2000-01-01' }) }, { id, project_id: project })
  assert.equal((await route.POST(request('updateAfterPartyAttendance', [id, { status: 'attending' }]))).status, 403)
  const { createAttendanceProof } = load(path.resolve(__dirname, '../src/lib/attendance-proof.ts'))
  const cookie = `br_att_${id}=${createAttendanceProof(project, id, credentials.sessionSecret)}`
  assert.equal((await route.POST(request('updateAfterPartyAttendance', [id, { status: 'attending' }], { cookie }))).status, 403)
  assert.equal((await route.POST(request('createAfterPartyAttendance', [project, { name: 'Example', status: 'attending' }]))).status, 403)
  assert.equal(calls.some(call => call.op.startsWith('create') || call.op.startsWith('update')), false)
})

test('a new response receives an HttpOnly edit cookie and an owned response can be updated', async () => {
  const { route, calls } = harness({ getProject: () => ({ hasAfterParty: true }), getAfterPartyAttendances: () => [], createAfterPartyAttendance: () => ({ id, projectId: project }) }, { id, project_id: project })
  const response = await route.POST(request('createAfterPartyAttendance', [project, { name: 'Example', status: 'attending' }]))
  assert.equal(response.status, 200)
  const setCookie = response.headers.get('set-cookie')
  assert.match(setCookie, /HttpOnly/i)
  assert.match(setCookie, /Path=\/api\/data/i)
  const cookie = setCookie.split(';')[0]
  assert.equal((await route.POST(request('updateAfterPartyAttendance', [id, { status: 'not_attending' }], { cookie }))).status, 200)
  assert.equal(calls.at(-1).op, 'updateAfterPartyAttendance')
})
