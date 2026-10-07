const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Exercise the real route, signed sessions, validation and query construction.
// The only substitute is database I/O; this file never loads environment files.
const id = '10000000-0000-4000-8000-000000000001'
const other = '20000000-0000-4000-8000-000000000002'
const foreign = '30000000-0000-4000-8000-000000000003'
const credentials = { adminPassword: 'test-admin-only', sessionSecret: 'test-session-secret-never-production-123' }
process.env.ADMIN_PASSWORD = credentials.adminPassword
process.env.SESSION_SECRET = credentials.sessionSecret

function harness(initial = {}, forceResult) {
  const state = structuredClone(initial), calls = [], cache = new Map()
  let clients = 0
  function query(table) {
    const operations = []
    const q = new Proxy({}, { get(_, method) {
      if (method === 'then') return (resolve, reject) => Promise.resolve().then(() => {
        calls.push({ table, operations })
        if (forceResult) return forceResult({ table, operations })
        const op = name => operations.find(v => v[0] === name)?.[1]
        let all = state[table] || [], selected = all
        for (const [name, [field, value]] of operations) {
          if (['eq', 'is'].includes(name)) selected = selected.filter(row => row[field] === value)
          if (name === 'in') selected = selected.filter(row => value.includes(row[field]))
          if (name === 'gte') selected = selected.filter(row => row[field] >= value)
        }
        if (op('insert')) {
          const row = op('insert')[0]
          if (all.some(v => v.id === row.id)) return { data: null, error: { code: '23505', message: 'private database detail' } }
          selected = [structuredClone(row)]; state[table] = [...all, ...selected]
        } else if (op('update')) {
          for (const row of selected) Object.assign(row, op('update')[0])
        } else if (op('delete')) state[table] = all.filter(row => !selected.includes(row))
        const count = selected.length
        if (op('limit')) selected = selected.slice(0, op('limit')[0])
        if (op('range')) selected = selected.slice(op('range')[0], op('range')[1] + 1)
        const columns = op('select')?.[0]
        const data = columns && columns !== '*' && !columns.includes('(')
          ? selected.map(row => Object.fromEntries(columns.split(',').map(k => [k, row[k]])))
          : structuredClone(selected)
        return { data, count, error: null }
      }).then(resolve, reject)
      return (...args) => { operations.push([method, args]); return q }
    } })
    return q
  }
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }; cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    function localRequire(name) {
      if (name === 'server-only') return {}
      if (name === '@/lib/server/database') return {}
      if (name === '@/lib/supabase') return { getSupabase: () => { clients++; return { from: query } } }
      if (name.startsWith('@/')) return load(path.resolve(__dirname, '../src', name.slice(2) + '.ts'))
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name + '.ts'))
      return require(name)
    }
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports)
    return module.exports
  }
  const route = load(path.resolve(__dirname, '../src/app/api/data/route.ts'))
  const session = load(path.resolve(__dirname, '../src/lib/session.ts'))
  const model = load(path.resolve(__dirname, '../src/lib/server/cli-model.ts')).cliModel
  async function send(operation, args, headers = {}) {
    const request = new Request('https://br.example/api/data', { method: 'POST', headers: {
      origin: 'https://br.example', 'content-type': 'application/json',
      cookie: `br_admin_session=${session.createAdminSessionToken(credentials)}`, ...headers
    }, body: JSON.stringify({ operation, args }) })
    const response = await route.POST(request)
    return { status: response.status, body: await response.json(), headers: response.headers }
  }
  return { send, calls, state, model, get clients() { return clients } }
}
const read = (params = [], table = 'projects') => [{ table, params, count: true }]
const mutate = (method, data, params = [], table = 'projects') => [{ table, method, data, params }]

test('all CLI operations require a current signed administrator session and same origin before DB access', async () => {
  const h = harness()
  for (const operation of ['cliRead', 'cliMutate', 'cliContract']) {
    for (const cookie of ['', 'auth=true', 'br_admin_session=true']) assert.equal((await h.send(operation, [], { cookie })).status, 401)
    assert.equal((await h.send(operation, [], { origin: 'https://evil.example' })).status, 403)
    assert.equal((await h.send(operation, [], { 'sec-fetch-site': 'cross-site' })).status, 403)
  }
  assert.equal(h.clients, 0)
})

test('raw reads are bounded, allowlisted, deterministically ordered and retain exact counts', async () => {
  const h = harness({ projects: [{ id, title: 'A', private_new_column: 'never returned' }, { id: other, title: 'B' }] })
  const r = await h.send('cliRead', read([['select', 'id,title'], ['limit', '1'], ['offset', '1'], ['order', 'title.desc']]))
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.data, { version: 'br-cli-v1', rows: [{ id: other, title: 'B' }], total: 2 })
  assert.match(r.headers.get('cache-control'), /no-store/)
  assert.deepEqual(h.calls[0].operations.filter(v => v[0] === 'order'), [['order', ['title', { ascending: false }]], ['order', ['id', { ascending: true }]]])
  const all = await h.send('cliRead', read([['select', '*']]))
  assert.equal(all.body.data.rows[0].private_new_column, undefined)
  assert.notEqual(h.calls[1].operations.find(v => v[0] === 'select')[1][0], '*')
})

test('unknown tables/columns, embedded queries, filter injection and unbounded reads fail before DB', async () => {
  const h = harness()
  const bad = [read([], 'auth.users'), read([], '__proto__'), read([['select', 'id,performers(*)']]), read([['or', '(id.eq.x)']]),
    read([['id', 'not.eq.' + id]]), read([['limit', '201']]), read([['offset', '10001']]), read([['limit', '1'], ['limit', '2']]),
    read([['order', 'id.asc;drop']]), read([['order', 'id.asc.desc']]), read([['id', 'in.()']]), read([['id', 'in.(' + id + '),or(true)']])]
  for (const args of bad) assert.equal((await h.send('cliRead', args)).status, 400)
  assert.equal(h.clients, 0)
})

test('read filters are parsed as known scalar values, including quoted in values', async () => {
  const h = harness({ projects: [{ id, title: 'A,B' }] })
  const r = await h.send('cliRead', read([['title', 'in.("A,B","C")'], ['id', 'eq.' + id], ['limit', '0']]))
  assert.equal(r.status, 200)
  assert.deepEqual(r.body.data.rows, [])
  assert.equal(r.body.data.total, 1)
  assert.deepEqual(h.calls[0].operations.find(v => v[0] === 'in'), ['in', ['title', ['A,B', 'C']]])
})

test('create preserves a client-prepared UUID and never upserts or accepts timestamp/extra fields', async () => {
  const h = harness()
  const data = { id, title: 'New', recording_date: '2026-10-07', total_recording_time: '1h', location: 'Studio' }
  assert.equal((await h.send('cliMutate', mutate('POST', { ...data, created_at: '2026-10-07T00:00:00Z' }))).status, 400)
  assert.equal((await h.send('cliMutate', mutate('POST', { ...data, secret: 'not accepted' }))).status, 400)
  assert.equal(h.clients, 0)
  const created = await h.send('cliMutate', mutate('POST', data))
  assert.equal(created.status, 200)
  assert.equal(created.body.data.rows[0].id, id)
  const duplicate = await h.send('cliMutate', mutate('POST', data))
  assert.equal(duplicate.status, 409)
  assert.equal(duplicate.body.code, 'conflict')
  assert.ok(!JSON.stringify(duplicate.body).includes('private database detail'))
})

test('PATCH requires every changed-column comparison plus timestamp in the same atomic query', async () => {
  const stamp = '2026-10-07T00:00:00Z'
  const h = harness({ projects: [{ id, title: 'Before', updated_at: stamp }] })
  const conditions = [['id', 'eq.' + id], ['title', 'eq.Before'], ['updated_at', 'eq.' + stamp]]
  assert.equal((await h.send('cliMutate', mutate('PATCH', { title: 'After' }, conditions.slice(0, 2)))).status, 400)
  assert.equal((await h.send('cliMutate', mutate('PATCH', { updated_at: stamp }, conditions))).status, 400)
  assert.equal(h.clients, 0)
  const changed = await h.send('cliMutate', mutate('PATCH', { title: 'After' }, conditions))
  assert.equal(changed.status, 200)
  assert.equal(changed.body.data.rows[0].title, 'After')
  assert.ok(Date.parse(changed.body.data.rows[0].updated_at) > Date.parse(stamp))
  assert.deepEqual(h.calls[0].operations.filter(v => v[0] === 'eq'), [['eq', ['id', id]], ['eq', ['title', 'Before']], ['eq', ['updated_at', stamp]]])
  assert.equal((await h.send('cliMutate', mutate('PATCH', { title: 'Again' }, conditions))).status, 409)
  assert.equal(h.state.projects[0].title, 'After')
})

test('DELETE protects every column, including rows with no updated_at, and cannot remove a changed row', async () => {
  const row = { id, plan_id: other, performer_id: foreign, role: 'host', created_at: null }
  const h = harness({ plan_performers: [row] })
  const conditions = Object.entries(row).map(([k, v]) => [k, v === null ? 'is.null' : 'eq.' + v])
  assert.equal((await h.send('cliMutate', mutate('DELETE', null, conditions.slice(0, 3), 'plan_performers'))).status, 400)
  h.state.plan_performers[0].role = 'guest'
  assert.equal((await h.send('cliMutate', mutate('DELETE', null, conditions, 'plan_performers'))).status, 409)
  assert.equal(h.state.plan_performers.length, 1)
  conditions.find(v => v[0] === 'role')[1] = 'eq.guest'
  const deleted = await h.send('cliMutate', mutate('DELETE', null, conditions, 'plan_performers'))
  assert.equal(deleted.status, 200)
  assert.equal(deleted.body.data.rows[0].id, id)
  assert.equal(h.state.plan_performers.length, 0)
})

test('parent IDs are immutable and cross-project performer assignments are refused before insertion', async () => {
  const h = harness({ plans: [{ id: other, project_id: id }], performers: [{ id: foreign, project_id: foreign }] })
  assert.equal((await h.send('cliMutate', mutate('PATCH', { project_id: id }, [['id', 'eq.' + other]], 'plans'))).status, 400)
  const r = await h.send('cliMutate', mutate('POST', { id, plan_id: other, performer_id: foreign, role: 'host' }, [], 'plan_performers'))
  assert.equal(r.status, 409)
  assert.equal(r.body.code, 'cross_project_assignment')
  assert.ok(h.calls.every(call => !call.operations.some(v => v[0] === 'insert')))
})

test('contract checks seven tables and fixed relationships but exposes names only, never probe values', async () => {
  const h = harness({ projects: [{ id, title: 'sensitive', new_column: 'secret' }] })
  const r = await h.send('cliContract', [])
  assert.equal(r.status, 200)
  assert.equal(r.body.data.version, 'br-cli-v1')
  assert.equal(r.body.data.complete, true)
  assert.equal(r.body.data.relationshipProbe, 1)
  assert.equal(Object.keys(r.body.data.tables).length, 7)
  assert.deepEqual(r.body.data.tables.projects, ['id', 'new_column', 'title'])
  assert.equal(r.body.data.emptyTables.length, 6)
  assert.ok(!JSON.stringify(r.body).includes('sensitive'))
  assert.ok(!JSON.stringify(r.body).includes('secret'))
  assert.equal(h.calls.at(-1).operations.find(v => v[0] === 'limit')[1][0], 0)
})

test('probe failures and incomplete exact counts fail closed without leaking database errors', async () => {
  let h = harness({}, () => ({ data: null, error: { message: 'secret database configuration' } }))
  let r = await h.send('cliContract', [])
  assert.equal(r.status, 503)
  assert.ok(!JSON.stringify(r.body).includes('secret'))
  h = harness({}, () => ({ data: [], count: null, error: null }))
  r = await h.send('cliRead', read())
  assert.equal(r.status, 503)
})
