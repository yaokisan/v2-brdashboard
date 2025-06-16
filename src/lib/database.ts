import { supabase } from './supabase'
import { Project, Performer, Plan, PlanPerformer } from '@/types'

// プロジェクト関連
export async function getProjects(): Promise<Project[]> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      *,
      performers (*),
      plans (
        *,
        plan_performers (
          performer_id,
          role
        )
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    return []
  }

  return projects.map(transformProjectFromDB)
}

export async function getProject(projectId: string): Promise<Project | null> {
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      performers (*),
      plans (
        *,
        plan_performers (
          performer_id,
          role
        )
      )
    `)
    .eq('id', projectId)
    .single()

  if (error) {
    console.error('Error fetching project:', error)
    return null
  }

  return transformProjectFromDB(project)
}

export async function createProject(projectData: Omit<Project, 'id' | 'performers' | 'plans' | 'createdAt' | 'updatedAt'>): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      title: projectData.title,
      recording_date: projectData.recordingDate,
      total_recording_time: projectData.totalRecordingTime,
      location: projectData.location,
      address: projectData.address,
      location_map_url: projectData.locationMapUrl
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating project:', error)
    return null
  }

  return {
    id: data.id,
    title: data.title,
    recordingDate: data.recording_date,
    totalRecordingTime: data.total_recording_time,
    location: data.location,
    address: data.address,
    locationMapUrl: data.location_map_url,
    performers: [],
    plans: [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  }
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  const updateData: any = {}
  
  if (updates.title) updateData.title = updates.title
  if (updates.recordingDate) updateData.recording_date = updates.recordingDate
  if (updates.totalRecordingTime) updateData.total_recording_time = updates.totalRecordingTime
  if (updates.location) updateData.location = updates.location
  if (updates.address !== undefined) updateData.address = updates.address
  if (updates.locationMapUrl !== undefined) updateData.location_map_url = updates.locationMapUrl

  const { error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', projectId)

  if (error) {
    console.error('Error updating project:', error)
    return null
  }

  return getProject(projectId)
}

export async function deleteProject(projectId: string): Promise<boolean> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) {
    console.error('Error deleting project:', error)
    return false
  }

  return true
}

// 出演者関連
export async function createPerformer(projectId: string, performerData: Omit<Performer, 'id' | 'assignedPlans'>): Promise<Performer | null> {
  const { data, error } = await supabase
    .from('performers')
    .insert({
      project_id: projectId,
      name: performerData.name,
      role: performerData.role,
      start_time: performerData.startTime,
      end_time: performerData.endTime,
      is_time_confirmed: performerData.isTimeConfirmed,
      belongings: performerData.belongings
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating performer:', error)
    return null
  }

  return transformPerformerFromDB(data)
}

export async function updatePerformer(performerId: string, updates: Partial<Performer>): Promise<boolean> {
  const updateData: any = {}
  
  if (updates.name) updateData.name = updates.name
  if (updates.role !== undefined) updateData.role = updates.role
  if (updates.startTime !== undefined) updateData.start_time = updates.startTime
  if (updates.endTime !== undefined) updateData.end_time = updates.endTime
  if (updates.isTimeConfirmed !== undefined) updateData.is_time_confirmed = updates.isTimeConfirmed
  if (updates.belongings !== undefined) updateData.belongings = updates.belongings

  const { error } = await supabase
    .from('performers')
    .update(updateData)
    .eq('id', performerId)

  if (error) {
    console.error('Error updating performer:', error)
    return false
  }

  return true
}

export async function deletePerformer(performerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('performers')
    .delete()
    .eq('id', performerId)

  if (error) {
    console.error('Error deleting performer:', error)
    return false
  }

  return true
}

// 企画関連
export async function createPlan(projectId: string, planData: Omit<Plan, 'id' | 'performers'>): Promise<Plan | null> {
  const { data, error } = await supabase
    .from('plans')
    .insert({
      project_id: projectId,
      title: planData.title,
      scheduled_time: planData.scheduledTime || null,
      duration: planData.duration,
      script_url: planData.scriptUrl || null,
      has_script: planData.hasScript,
      notes: planData.notes || null,
      reference_video_url: planData.referenceVideoUrl || null,
      is_confirmed: planData.isConfirmed
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating plan:', error)
    return null
  }

  return {
    id: data.id,
    title: data.title,
    scheduledTime: data.scheduled_time,
    duration: data.duration,
    scriptUrl: data.script_url,
    hasScript: data.has_script,
    notes: data.notes,
    referenceVideoUrl: data.reference_video_url,
    isConfirmed: data.is_confirmed,
    performers: []
  }
}

export async function updatePlan(planId: string, updates: Partial<Plan>): Promise<boolean> {
  const updateData: any = {}
  
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.scheduledTime !== undefined) updateData.scheduled_time = updates.scheduledTime || null
  if (updates.duration !== undefined) updateData.duration = updates.duration
  if (updates.scriptUrl !== undefined) updateData.script_url = updates.scriptUrl || null
  if (updates.hasScript !== undefined) updateData.has_script = updates.hasScript
  if (updates.notes !== undefined) updateData.notes = updates.notes || null
  if (updates.referenceVideoUrl !== undefined) updateData.reference_video_url = updates.referenceVideoUrl || null
  if (updates.isConfirmed !== undefined) updateData.is_confirmed = updates.isConfirmed

  // Update basic plan data first
  const { error } = await supabase
    .from('plans')
    .update(updateData)
    .eq('id', planId)

  if (error) {
    console.error('Error updating plan:', error)
    return false
  }

  // Handle performers update if provided
  if (updates.performers !== undefined) {
    // First, delete all existing performers for this plan
    const { error: deleteError } = await supabase
      .from('plan_performers')
      .delete()
      .eq('plan_id', planId)
    
    if (deleteError) {
      console.error('Error deleting existing performers:', deleteError)
      return false
    }

    // Then, insert new performers if any
    if (updates.performers.length > 0) {
      const performerData = updates.performers.map(p => ({
        plan_id: planId,
        performer_id: p.performerId,
        role: p.role
      }))

      const { error: insertError } = await supabase
        .from('plan_performers')
        .insert(performerData)
      
      if (insertError) {
        console.error('Error inserting performers:', insertError)
        return false
      }
    }
  }

  return true
}

export async function deletePlan(planId: string): Promise<boolean> {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)

  if (error) {
    console.error('Error deleting plan:', error)
    return false
  }

  return true
}

// 企画出演者関連
export async function addPerformerToPlan(planId: string, performerId: string, role: string): Promise<boolean> {
  const { error } = await supabase
    .from('plan_performers')
    .insert({
      plan_id: planId,
      performer_id: performerId,
      role: role
    })

  if (error) {
    console.error('Error adding performer to plan:', error)
    return false
  }

  return true
}

export async function removePerformerFromPlan(planId: string, performerId: string): Promise<boolean> {
  const { error } = await supabase
    .from('plan_performers')
    .delete()
    .eq('plan_id', planId)
    .eq('performer_id', performerId)

  if (error) {
    console.error('Error removing performer from plan:', error)
    return false
  }

  return true
}

export async function updatePlanPerformerRole(planId: string, performerId: string, role: string): Promise<boolean> {
  const { error } = await supabase
    .from('plan_performers')
    .update({ role })
    .eq('plan_id', planId)
    .eq('performer_id', performerId)

  if (error) {
    console.error('Error updating plan performer role:', error)
    return false
  }

  return true
}

// ヘルパー関数
function transformProjectFromDB(dbProject: any): Project {
  return {
    id: dbProject.id,
    title: dbProject.title,
    recordingDate: dbProject.recording_date,
    totalRecordingTime: dbProject.total_recording_time,
    location: dbProject.location,
    address: dbProject.address,
    locationMapUrl: dbProject.location_map_url,
    performers: dbProject.performers?.map(transformPerformerFromDB) || [],
    plans: dbProject.plans?.map((plan: any) => ({
      id: plan.id,
      title: plan.title,
      scheduledTime: plan.scheduled_time,
      duration: plan.duration,
      scriptUrl: plan.script_url,
      hasScript: plan.has_script,
      notes: plan.notes,
      referenceVideoUrl: plan.reference_video_url,
      isConfirmed: plan.is_confirmed,
      performers: plan.plan_performers?.map((pp: any) => ({
        performerId: pp.performer_id,
        role: pp.role
      })) || []
    })) || [],
    createdAt: dbProject.created_at,
    updatedAt: dbProject.updated_at
  }
}

function transformPerformerFromDB(dbPerformer: any): Performer {
  return {
    id: dbPerformer.id,
    name: dbPerformer.name,
    role: dbPerformer.role,
    startTime: dbPerformer.start_time,
    endTime: dbPerformer.end_time,
    isTimeConfirmed: dbPerformer.is_time_confirmed,
    belongings: dbPerformer.belongings,
    assignedPlans: [] // この情報は別途取得が必要
  }
}

// スケジュールアイテム（休憩・準備時間）関連
export async function createScheduleItem(projectId: string, type: 'break' | 'preparation', title: string, startTime: string, duration: number): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_items')
    .insert({
      project_id: projectId,
      type,
      title,
      start_time: startTime,
      duration
    })

  if (error) {
    console.error('Error creating schedule item:', error)
    return false
  }

  return true
}

export async function getScheduleItems(projectId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('schedule_items')
    .select('*')
    .eq('project_id', projectId)
    .order('start_time')

  if (error) {
    console.error('Error fetching schedule items:', error)
    return []
  }

  return data || []
}

export async function updateScheduleItem(itemId: string, updates: { title?: string; start_time?: string; duration?: number }): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_items')
    .update(updates)
    .eq('id', itemId)

  if (error) {
    console.error('Error updating schedule item:', error)
    return false
  }

  return true
}

export async function deleteScheduleItem(itemId: string): Promise<boolean> {
  const { error } = await supabase
    .from('schedule_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting schedule item:', error)
    return false
  }

  return true
}