// Browser-side facade. Credentials and database queries live only on the server.
type Operations = typeof import('./server/database')

async function call<K extends keyof Operations>(operation: K, args: Parameters<Operations[K]>): Promise<Awaited<ReturnType<Operations[K]>>> {
  const response = await fetch('/api/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ operation, args })
  })
  const result = await response.json()
  if (!response.ok) {
    if (response.status === 401 && window.location.pathname.startsWith('/admin')) window.location.assign('/')
    throw new Error(result.error || 'データの処理に失敗しました')
  }
  return result.data
}

export const getProjects = (...args: Parameters<Operations['getProjects']>): ReturnType<Operations['getProjects']> => call('getProjects', args)
export const getProject = (...args: Parameters<Operations['getProject']>): ReturnType<Operations['getProject']> => call('getProject', args)
export const createProject = (...args: Parameters<Operations['createProject']>): ReturnType<Operations['createProject']> => call('createProject', args)
export const updateProject = (...args: Parameters<Operations['updateProject']>): ReturnType<Operations['updateProject']> => call('updateProject', args)
export const deleteProject = (...args: Parameters<Operations['deleteProject']>): ReturnType<Operations['deleteProject']> => call('deleteProject', args)
export const duplicateProject = (...args: Parameters<Operations['duplicateProject']>): ReturnType<Operations['duplicateProject']> => call('duplicateProject', args)
export const createPerformer = (...args: Parameters<Operations['createPerformer']>): ReturnType<Operations['createPerformer']> => call('createPerformer', args)
export const updatePerformer = (...args: Parameters<Operations['updatePerformer']>): ReturnType<Operations['updatePerformer']> => call('updatePerformer', args)
export const updatePerformerSortOrders = (...args: Parameters<Operations['updatePerformerSortOrders']>): ReturnType<Operations['updatePerformerSortOrders']> => call('updatePerformerSortOrders', args)
export const deletePerformer = (...args: Parameters<Operations['deletePerformer']>): ReturnType<Operations['deletePerformer']> => call('deletePerformer', args)
export const createPlan = (...args: Parameters<Operations['createPlan']>): ReturnType<Operations['createPlan']> => call('createPlan', args)
export const updatePlan = (...args: Parameters<Operations['updatePlan']>): ReturnType<Operations['updatePlan']> => call('updatePlan', args)
export const deletePlan = (...args: Parameters<Operations['deletePlan']>): ReturnType<Operations['deletePlan']> => call('deletePlan', args)
export const addPerformerToPlan = (...args: Parameters<Operations['addPerformerToPlan']>): ReturnType<Operations['addPerformerToPlan']> => call('addPerformerToPlan', args)
export const removePerformerFromPlan = (...args: Parameters<Operations['removePerformerFromPlan']>): ReturnType<Operations['removePerformerFromPlan']> => call('removePerformerFromPlan', args)
export const updatePlanPerformerRole = (...args: Parameters<Operations['updatePlanPerformerRole']>): ReturnType<Operations['updatePlanPerformerRole']> => call('updatePlanPerformerRole', args)
export const createScheduleItem = (...args: Parameters<Operations['createScheduleItem']>): ReturnType<Operations['createScheduleItem']> => call('createScheduleItem', args)
export const getScheduleItems = (...args: Parameters<Operations['getScheduleItems']>): ReturnType<Operations['getScheduleItems']> => call('getScheduleItems', args)
export const updateScheduleItem = (...args: Parameters<Operations['updateScheduleItem']>): ReturnType<Operations['updateScheduleItem']> => call('updateScheduleItem', args)
export const deleteScheduleItem = (...args: Parameters<Operations['deleteScheduleItem']>): ReturnType<Operations['deleteScheduleItem']> => call('deleteScheduleItem', args)
export const getAfterPartyAttendances = (...args: Parameters<Operations['getAfterPartyAttendances']>): ReturnType<Operations['getAfterPartyAttendances']> => call('getAfterPartyAttendances', args)
export const createAfterPartyAttendance = (...args: Parameters<Operations['createAfterPartyAttendance']>): ReturnType<Operations['createAfterPartyAttendance']> => call('createAfterPartyAttendance', args)
export const updateAfterPartyAttendance = (...args: Parameters<Operations['updateAfterPartyAttendance']>): ReturnType<Operations['updateAfterPartyAttendance']> => call('updateAfterPartyAttendance', args)
export const deleteAfterPartyAttendance = (...args: Parameters<Operations['deleteAfterPartyAttendance']>): ReturnType<Operations['deleteAfterPartyAttendance']> => call('deleteAfterPartyAttendance', args)
export const getProposals = (...args: Parameters<Operations['getProposals']>): ReturnType<Operations['getProposals']> => call('getProposals', args)
export const getProposal = (...args: Parameters<Operations['getProposal']>): ReturnType<Operations['getProposal']> => call('getProposal', args)
export const getProposalBySlug = (...args: Parameters<Operations['getProposalBySlug']>): ReturnType<Operations['getProposalBySlug']> => call('getProposalBySlug', args)
export const createProposal = (...args: Parameters<Operations['createProposal']>): ReturnType<Operations['createProposal']> => call('createProposal', args)
export const updateProposal = (...args: Parameters<Operations['updateProposal']>): ReturnType<Operations['updateProposal']> => call('updateProposal', args)
export const deleteProposal = (...args: Parameters<Operations['deleteProposal']>): ReturnType<Operations['deleteProposal']> => call('deleteProposal', args)
export const duplicateProposal = (...args: Parameters<Operations['duplicateProposal']>): ReturnType<Operations['duplicateProposal']> => call('duplicateProposal', args)
