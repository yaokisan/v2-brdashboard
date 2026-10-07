import 'server-only'
import { cliModel, type CliField, type CliTable } from './cli-model'

export const CLI_VERSION = 'br-cli-v1'
export const cliOperations = new Set(['cliRead', 'cliMutate', 'cliContract'])
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
type Row = Record<string, unknown>
type Filter = { field: string; op: string; value: unknown }
// The Supabase client remains server-only. This narrow injectable boundary also
// lets tests prove the actual predicates sent to PostgREST without credentials.
type Client = { from: (table: string) => any }
export class CliDataError extends Error {
  constructor(public code: string, public status = 400) { super(code) }
}
function invalid(): never { throw new CliDataError('invalid_cli_request') }
function record(v: unknown): v is Row { return !!v && typeof v === 'object' && !Array.isArray(v) }
function shape(v: unknown, keys: string[], required: string[]): asserts v is Row {
  if (!record(v) || Object.keys(v).some(k => !keys.includes(k)) || required.some(k => !own(v, k))) invalid()
}
function tableSpec(table: unknown): [string, CliTable] {
  if (typeof table !== 'string' || !own(cliModel.tables, table)) invalid()
  return [table, cliModel.tables[table]]
}
function fieldValue(field: CliField, value: unknown): boolean {
  if (value === null) return field.nullable
  if (field.type === 'boolean') return typeof value === 'boolean'
  if (field.type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value) && value >= -2147483648 && value <= 2147483647
  if (typeof value !== 'string' || value.length > 20000) return false
  if (field.enum && !field.enum.includes(value)) return false
  if (field.format === 'uuid') return uuid(value)
  if (field.format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
  if (field.format === 'time') return /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(value)
  if (field.format === 'datetime') return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value))
  return true
}
function scalar(field: CliField, raw: string): unknown {
  let value: unknown = raw
  if (field.type === 'boolean') { if (!['true', 'false'].includes(raw)) invalid(); value = raw === 'true' }
  if (field.type === 'integer') { if (!/^-?\d+$/.test(raw)) invalid(); value = Number(raw) }
  if (!fieldValue(field, value)) invalid()
  return value
}
function inValues(raw: string): string[] {
  if (!raw.startsWith('(') || !raw.endsWith(')')) invalid()
  const content = raw.slice(1, -1)
  const values: string[] = []
  let token = '', quoted = false, escaped = false
  for (const char of content) {
    if (escaped) { token += char; escaped = false; continue }
    if (char === '\\' && quoted) { token += char; escaped = true; continue }
    if (char === '"') quoted = !quoted
    if (char === ',' && !quoted) { values.push(token.trim()); token = '' } else token += char
  }
  values.push(token.trim())
  if (quoted || escaped || values.length > 100 || values.some(v => !v)) invalid()
  return values.map(v => {
    if (v.startsWith('"')) { try { const parsed = JSON.parse(v); if (typeof parsed !== 'string') invalid(); return parsed } catch { return invalid() } }
    if (/[()"\\]/.test(v)) invalid()
    return v
  })
}
function parseFilter(spec: CliTable, field: string, raw: string, mutation: boolean): Filter {
  if (!own(spec.fields, field)) invalid()
  const dot = raw.indexOf('.'), op = raw.slice(0, dot), operand = raw.slice(dot + 1)
  const allowed = mutation ? ['eq', 'is'] : ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'is']
  if (dot < 1 || !allowed.includes(op)) invalid()
  const prop = spec.fields[field]
  if (op === 'is') {
    if (operand === 'null' && prop.nullable) return { field, op, value: null }
    if (prop.type === 'boolean' && ['true', 'false'].includes(operand)) return { field, op, value: operand === 'true' }
    return invalid()
  }
  if (op === 'like' || op === 'ilike') {
    if (prop.type !== 'string' || prop.format || operand.length > 20000) invalid()
    return { field, op, value: operand }
  }
  return { field, op, value: op === 'in' ? inValues(operand).map(v => scalar(prop, v)) : scalar(prop, operand) }
}
function pairs(value: unknown): [string, string][] {
  if (!Array.isArray(value) || value.length > 100 || value.some(pair => !Array.isArray(pair) || pair.length !== 2 || pair.some(v => typeof v !== 'string' || v.length > 20000))) invalid()
  return value as [string, string][]
}
function predicate(query: any, filters: Filter[]) {
  for (const { field, op, value } of filters) query = op === 'in' ? query.in(field, value) : query[op](field, value)
  return query
}
function resultRows(result: any): Row[] {
  if (result.error) throw new CliDataError(result.error.code === '23505' ? 'conflict' : 'database_unavailable', result.error.code === '23505' ? 409 : 503)
  if (!Array.isArray(result.data) || result.data.some((row: unknown) => !record(row))) throw new CliDataError('invalid_database_response', 503)
  return result.data
}
function readInput(input: unknown) {
  shape(input, ['table', 'params', 'count'], ['table', 'params', 'count'])
  if (typeof input.count !== 'boolean') invalid()
  const [table, spec] = tableSpec(input.table), filters: Filter[] = []
  const options: Record<string, string> = {}
  for (const [key, value] of pairs(input.params)) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) { if (own(options, key)) invalid(); options[key] = value }
    else filters.push(parseFilter(spec, key, value, false))
  }
  const columns = options.select === undefined || options.select === '*' ? Object.keys(spec.fields) : options.select.split(',')
  if (!columns.length || columns.some(c => !own(spec.fields, c)) || new Set(columns).size !== columns.length) invalid()
  const orders = (options.order || 'id.asc').split(',').map(order => {
    const [field, ...parts] = order.split('.')
    if (!own(spec.fields, field) || parts.some(p => !['asc', 'desc', 'nullsfirst', 'nullslast'].includes(p)) || parts.filter(p => ['asc', 'desc'].includes(p)).length > 1 || parts.filter(p => p.startsWith('nulls')).length > 1) invalid()
    return { field, ascending: !parts.includes('desc'), ...(parts.some(p => p.startsWith('nulls')) ? { nullsFirst: parts.includes('nullsfirst') } : {}) }
  })
  if (orders.length > Object.keys(spec.fields).length || new Set(orders.map(o => o.field)).size !== orders.length) invalid()
  if (!orders.some(o => o.field === 'id')) orders.push({ field: 'id', ascending: true })
  function bounded(key: string, fallback: number, maximum: number) {
    const value = options[key]
    if (value === undefined) return fallback
    if (!/^\d{1,5}$/.test(value) || Number(value) > maximum) invalid()
    return Number(value)
  }
  return { table, columns, filters, orders, limit: bounded('limit', 50, 200), offset: bounded('offset', 0, 10000), count: input.count }
}
function mutationInput(input: unknown) {
  shape(input, ['table', 'method', 'params', 'data'], ['table', 'method', 'params', 'data'])
  if (!['POST', 'PATCH', 'DELETE'].includes(input.method as string)) invalid()
  const method = input.method as string, [table, spec] = tableSpec(input.table)
  const filters = pairs(input.params).map(([field, value]) => parseFilter(spec, field, value, true))
  if (new Set(filters.map(f => f.field)).size !== filters.length) invalid()
  let data: Row = {}
  if (method === 'DELETE') { if (input.data !== null) invalid() }
  else {
    if (!record(input.data) || !Object.keys(input.data).length) invalid()
    data = { ...input.data }
    for (const [field, value] of Object.entries(data)) {
      if (!own(spec.fields, field) || !fieldValue(spec.fields[field], value) || ['created_at', 'updated_at'].includes(field) || (method === 'PATCH' && spec.immutable.includes(field))) invalid()
      if (spec.required_create.includes(field) && typeof value === 'string' && !value.trim()) invalid()
    }
    if (table === 'schedule_items' && own(data, 'duration') && (data.duration as number) <= 0) invalid()
  }
  if (method === 'POST') {
    if (filters.length || !uuid(data.id) || spec.required_create.some(field => !own(data, field))) invalid()
  } else {
    const id = filters.find(f => f.field === 'id')
    if (!id || id.op !== 'eq' || !uuid(id.value)) invalid()
    const required = method === 'DELETE' ? Object.keys(spec.fields) : [...Object.keys(data), ...(own(spec.fields, 'updated_at') ? ['updated_at'] : [])]
    if (required.some(field => !filters.some(f => f.field === field))) invalid()
    if (method === 'PATCH' && own(spec.fields, 'updated_at')) {
      const previous = filters.find(f => f.field === 'updated_at')!.value
      // Attendance/schedule migrations do not all install an update trigger.
      data.updated_at = new Date(Math.max(Date.now(), typeof previous === 'string' ? Date.parse(previous) + 1 : 0)).toISOString()
    }
  }
  return { table, spec, method, data, filters }
}
async function relations(client: Client, table: string, data: Row) {
  const parents: Record<string, Row> = {}
  for (const relation of cliModel.relations.filter(r => r.table === table)) {
    const result = await client.from(relation.references).select('id' + (table === 'plan_performers' ? ',project_id' : '')).eq('id', data[relation.field]).limit(2)
    const rows = resultRows(result)
    if (rows.length !== 1) throw new CliDataError('invalid_relation', 409)
    parents[relation.references] = rows[0]
  }
  if (table === 'plan_performers' && parents.plans.project_id !== parents.performers.project_id) throw new CliDataError('cross_project_assignment', 409)
}

export async function runCliOperation(operation: string, args: unknown, getClient: () => Client) {
  if (!Array.isArray(args) || !cliOperations.has(operation) || args.length !== (operation === 'cliContract' ? 0 : 1)) invalid()
  if (operation === 'cliRead') {
    const input = readInput(args[0]), client = getClient()
    let query = client.from(input.table).select(input.columns.join(','), input.count ? { count: 'exact' } : undefined)
    query = predicate(query, input.filters)
    for (const { field, ...options } of input.orders) query = query.order(field, options)
    query = input.limit === 0 ? query.limit(0) : query.range(input.offset, input.offset + input.limit - 1)
    const result = await query, rows = resultRows(result)
    if (input.count && (!Number.isSafeInteger(result.count) || result.count < 0)) throw new CliDataError('invalid_database_response', 503)
    return { version: CLI_VERSION, rows, total: input.count ? result.count : null }
  }
  if (operation === 'cliMutate') {
    const input = mutationInput(args[0]), client = getClient()
    if (input.method === 'POST') await relations(client, input.table, input.data)
    let query = client.from(input.table)
    query = input.method === 'POST' ? query.insert(input.data) : input.method === 'PATCH' ? query.update(input.data) : query.delete()
    const result = await predicate(query, input.filters).select(Object.keys(input.spec.fields).join(','))
    const rows = resultRows(result)
    if (rows.length === 0) throw new CliDataError('concurrent_change', 409)
    const id = input.method === 'POST' ? input.data.id : input.filters.find(f => f.field === 'id')!.value
    if (rows.length !== 1 || typeof rows[0].id !== 'string' || rows[0].id.toLowerCase() !== (id as string).toLowerCase()) throw new CliDataError('write_not_verified', 503)
    // CLI durably records intent and performs a separate read-after verification.
    // Parent-row CAS cannot atomically protect concurrent cascade-child changes.
    return { version: CLI_VERSION, rows, total: null }
  }
  const client = getClient(), tables: Record<string, string[]> = {}, emptyTables: string[] = []
  for (const [table, spec] of Object.entries(cliModel.tables)) {
    // Inspect column names only. Never return these wildcard-probe row values.
    const rows = resultRows(await client.from(table).select('*').limit(1))
    if (rows.length) tables[table] = Object.keys(rows[0]).sort()
    else {
      resultRows(await client.from(table).select(Object.keys(spec.fields).join(',')).limit(0))
      tables[table] = Object.keys(spec.fields).sort(); emptyTables.push(table)
    }
  }
  resultRows(await client.from('projects').select('id,performers(id),plans(id,plan_performers(id)),schedule_items(id),after_party_attendances(id)').limit(0))
  return { version: CLI_VERSION, tables, emptyTables, relationshipProbe: 1, complete: true }
}
