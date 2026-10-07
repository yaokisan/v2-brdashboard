// The HTTP boundary accepts these application operations, never table names or SQL.
type Check = (value: unknown) => boolean
const has = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const text: Check = v => typeof v === 'string' && v.length <= 20000
const short: Check = v => typeof v === 'string' && v.length <= 300
export const uuid: Check = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
const bool: Check = v => typeof v === 'boolean'
const number: Check = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100000
const choice = (...values: string[]): Check => v => typeof v === 'string' && values.includes(v)
const nullable = (check: Check): Check => v => v === null || check(v)
const array = (check: Check): Check => v => Array.isArray(v) && v.length <= 500 && v.every(check)
function object(fields: Record<string, Check>, required: string[] = []): Check {
  return v => !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.entries(v).every(([key, value]) => has(fields, key) && fields[key](value))
    && required.every(key => has(v, key))
}
const project = {
  title: short, recordingDate: short, totalRecordingTime: short, location: short,
  address: text, locationMapUrl: text, hasAfterParty: bool, afterPartyStartTime: short,
  afterPartyLocation: text, afterPartyAddress: text, afterPartyMapUrl: text,
  afterPartyNote: text, afterPartyDeadline: short, entryMethod: text
}
const performer = {
  name: short, role: short, startTime: nullable(short), endTime: nullable(short),
  availableStartTime: nullable(short), availableEndTime: nullable(short), isTimeConfirmed: bool,
  belongings: nullable(text), programItems: nullable(text), sortOrder: number
}
const planPerformer = object({ performerId: uuid, role: short, customRole: short }, ['performerId', 'role'])
const plan = {
  title: short, scheduledTime: nullable(short), duration: short, scriptUrl: nullable(text),
  hasScript: bool, notes: nullable(text), referenceVideoUrl: nullable(text), isConfirmed: bool,
  performers: array(planPerformer)
}
const attendance = { name: short, status: choice('attending', 'not_attending'), comment: nullable(text) }
const proposal = {
  title: short, titleNote: nullable(text), recordingDateText: text, recordingTimeText: text,
  locationText: text, overview: nullable(text), youtubeUrl: nullable(text),
  youtubeEmbedId: nullable(short), videoDescription: nullable(text),
  appearanceFeeType: choice('promotional', 'paid', 'custom'), appearanceFeeText: nullable(text),
  transportationType: choice('self_expense', 'provided', 'custom'), transportationText: nullable(text),
  expenseNote: nullable(text), slug: short, isPublished: bool, expiresAt: nullable(short)
}
export const operationChecks: Record<string, Check[]> = {
  getProjects: [], getProject: [uuid],
  createProject: [object(project, ['title', 'recordingDate', 'totalRecordingTime', 'location'])],
  updateProject: [uuid, object(project)], deleteProject: [uuid], duplicateProject: [uuid],
  createPerformer: [uuid, object(performer, ['name', 'isTimeConfirmed'])],
  updatePerformer: [uuid, object(performer)],
  updatePerformerSortOrders: [array(object({ id: uuid, sortOrder: number }, ['id', 'sortOrder']))],
  deletePerformer: [uuid], createPlan: [uuid, object(plan, ['title', 'duration', 'hasScript', 'isConfirmed'])],
  updatePlan: [uuid, object(plan)], deletePlan: [uuid],
  addPerformerToPlan: [uuid, uuid, short], removePerformerFromPlan: [uuid, uuid], updatePlanPerformerRole: [uuid, uuid, short],
  createScheduleItem: [uuid, choice('break', 'preparation', 'custom'), short, short, number],
  getScheduleItems: [uuid], updateScheduleItem: [uuid, object({ title: short, start_time: short, duration: number })], deleteScheduleItem: [uuid],
  getAfterPartyAttendances: [uuid], createAfterPartyAttendance: [uuid, object(attendance, ['name', 'status'])],
  updateAfterPartyAttendance: [uuid, object(attendance)], deleteAfterPartyAttendance: [uuid],
  getProposals: [], getProposal: [uuid], getProposalBySlug: [short],
  createProposal: [object(proposal, ['title', 'recordingDateText', 'recordingTimeText', 'locationText', 'appearanceFeeType', 'transportationType', 'slug', 'isPublished'])],
  updateProposal: [uuid, object(proposal)], deleteProposal: [uuid], duplicateProposal: [uuid]
}
export function validOperation(operation: unknown, args: unknown): operation is string {
  if (typeof operation !== 'string' || !has(operationChecks, operation) || !Array.isArray(args)) return false
  const checks = operationChecks[operation]
  return args.length === checks.length && checks.every((check, i) => check(args[i]))
}
export const publicReads = new Set(['getProject', 'getScheduleItems', 'getAfterPartyAttendances', 'getProposalBySlug'])
export const publicWrites = new Set(['createAfterPartyAttendance', 'updateAfterPartyAttendance'])

export function attendanceOpen(project: { hasAfterParty?: boolean; afterPartyDeadline?: string }, now = Date.now()): boolean {
  if (!project.hasAfterParty) return false
  if (!project.afterPartyDeadline) return true
  const deadline = Date.parse(`${project.afterPartyDeadline}T23:59:59.999+09:00`)
  return Number.isFinite(deadline) && now <= deadline
}

export function proposalVisible(proposal: { isPublished: boolean; expiresAt?: string | null }, now = Date.now()): boolean {
  return proposal.isPublished && (!proposal.expiresAt || Date.parse(proposal.expiresAt) > now)
}
