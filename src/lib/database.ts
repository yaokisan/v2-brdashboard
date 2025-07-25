import { supabase } from './supabase'
import { Project, Performer, Plan, PlanPerformer, Proposal } from '@/types'

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

export async function duplicateProject(projectId: string): Promise<Project | null> {
  try {
    // 元のプロジェクトを取得
    const originalProject = await getProject(projectId)
    if (!originalProject) return null

    // 新しいプロジェクトを作成
    const newProject = await createProject({
      title: `${originalProject.title}（コピー）`,
      recordingDate: originalProject.recordingDate,
      totalRecordingTime: originalProject.totalRecordingTime,
      location: originalProject.location,
      address: originalProject.address,
      locationMapUrl: originalProject.locationMapUrl
    })
    if (!newProject) return null

    // 出演者IDのマッピングを保存
    const performerIdMap = new Map<string, string>()

    // 出演者を複製
    for (const performer of originalProject.performers) {
      const newPerformer = await createPerformer(newProject.id, {
        name: performer.name,
        role: performer.role,
        startTime: performer.startTime,
        endTime: performer.endTime,
        availableStartTime: performer.availableStartTime,
        availableEndTime: performer.availableEndTime,
        isTimeConfirmed: performer.isTimeConfirmed,
        belongings: performer.belongings,
        programItems: performer.programItems
      })
      if (newPerformer) {
        performerIdMap.set(performer.id, newPerformer.id)
      }
    }

    // 企画を複製
    for (const plan of originalProject.plans) {
      const newPlan = await createPlan(newProject.id, {
        title: plan.title,
        scheduledTime: plan.scheduledTime,
        duration: plan.duration,
        scriptUrl: plan.scriptUrl,
        hasScript: plan.hasScript,
        notes: plan.notes,
        referenceVideoUrl: plan.referenceVideoUrl,
        isConfirmed: plan.isConfirmed
      })
      if (newPlan) {
        // 企画出演者の関連を複製
        for (const planPerformer of plan.performers) {
          const newPerformerId = performerIdMap.get(planPerformer.performerId)
          if (newPerformerId) {
            await addPerformerToPlan(newPlan.id, newPerformerId, planPerformer.role)
          }
        }
      }
    }

    // 完全なプロジェクトデータを再取得
    return getProject(newProject.id)
  } catch (error) {
    console.error('Error duplicating project:', error)
    return null
  }
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
      available_start_time: performerData.availableStartTime,
      available_end_time: performerData.availableEndTime,
      is_time_confirmed: performerData.isTimeConfirmed,
      belongings: performerData.belongings,
      program_items: performerData.programItems
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
  if (updates.availableStartTime !== undefined) updateData.available_start_time = updates.availableStartTime
  if (updates.availableEndTime !== undefined) updateData.available_end_time = updates.availableEndTime
  if (updates.isTimeConfirmed !== undefined) updateData.is_time_confirmed = updates.isTimeConfirmed
  if (updates.belongings !== undefined) updateData.belongings = updates.belongings
  if (updates.programItems !== undefined) updateData.program_items = updates.programItems

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
    availableStartTime: dbPerformer.available_start_time,
    availableEndTime: dbPerformer.available_end_time,
    isTimeConfirmed: dbPerformer.is_time_confirmed,
    belongings: dbPerformer.belongings,
    programItems: dbPerformer.program_items,
    assignedPlans: [] // この情報は別途取得が必要
  }
}

// スケジュールアイテム（休憩・準備時間）関連
export async function createScheduleItem(projectId: string, type: 'break' | 'preparation' | 'custom', title: string, startTime: string, duration: number): Promise<boolean> {
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

// 企画書関連
export async function getProposals(): Promise<Proposal[]> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching proposals:', error)
    return []
  }

  return data?.map(transformProposalFromDB) || []
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching proposal:', error)
    return null
  }

  return transformProposalFromDB(data)
}

export async function getProposalBySlug(slug: string): Promise<Proposal | null> {
  // スラッグの正規化（先頭のスラッシュを考慮）
  const normalizedSlug = slug.startsWith('/') ? slug : `/${slug}`;
  const alternativeSlug = slug.startsWith('/') ? slug.substring(1) : slug;

  // まず元のスラッグで検索
  let { data, error } = await supabase
    .from('proposals')
    .select('*')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  // 見つからない場合は正規化されたスラッグで検索
  if (error && error.code === 'PGRST116') {
    const { data: data2, error: error2 } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', normalizedSlug)
      .eq('is_published', true)
      .single()
    
    if (!error2) {
      data = data2;
      error = error2;
    }
  }

  // まだ見つからない場合は代替スラッグで検索
  if (error && error.code === 'PGRST116') {
    const { data: data3, error: error3 } = await supabase
      .from('proposals')
      .select('*')
      .eq('slug', alternativeSlug)
      .eq('is_published', true)
      .single()
    
    if (!error3) {
      data = data3;
      error = error3;
    }
  }

  if (error) {
    console.error('Error fetching proposal by slug:', error)
    return null
  }

  if (!data) {
    return null
  }

  // 有効期限チェック
  if (data.expires_at) {
    const expiresAt = new Date(data.expires_at)
    const now = new Date()
    if (expiresAt < now) {
      return null
    }
  }

  return transformProposalFromDB(data)
}

export async function createProposal(proposalData: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Proposal | null> {
  // YouTubeのURLから埋め込みIDを抽出
  const embedId = extractYouTubeId(proposalData.youtubeUrl || '')
  
  // スラッグの正規化（先頭のスラッシュを削除）
  const normalizedSlug = proposalData.slug.startsWith('/') ? proposalData.slug.substring(1) : proposalData.slug;


  const { data, error } = await supabase
    .from('proposals')
    .insert({
      title: proposalData.title,
      title_note: proposalData.titleNote,
      recording_date_text: proposalData.recordingDateText,
      recording_time_text: proposalData.recordingTimeText,
      location_text: proposalData.locationText,
      overview: proposalData.overview,
      youtube_url: proposalData.youtubeUrl,
      youtube_embed_id: embedId,
      video_description: proposalData.videoDescription,
      appearance_fee_type: proposalData.appearanceFeeType,
      appearance_fee_text: proposalData.appearanceFeeText,
      transportation_type: proposalData.transportationType,
      transportation_text: proposalData.transportationText,
      expense_note: proposalData.expenseNote,
      slug: normalizedSlug,
      is_published: proposalData.isPublished,
      expires_at: proposalData.expiresAt
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating proposal:', error)
    return null
  }

  return transformProposalFromDB(data)
}

export async function updateProposal(id: string, updates: Partial<Proposal>): Promise<Proposal | null> {
  const updateData: any = {}

  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.titleNote !== undefined) updateData.title_note = updates.titleNote
  if (updates.recordingDateText !== undefined) updateData.recording_date_text = updates.recordingDateText
  if (updates.recordingTimeText !== undefined) updateData.recording_time_text = updates.recordingTimeText
  if (updates.locationText !== undefined) updateData.location_text = updates.locationText
  if (updates.overview !== undefined) updateData.overview = updates.overview
  if (updates.youtubeUrl !== undefined) {
    updateData.youtube_url = updates.youtubeUrl
    updateData.youtube_embed_id = extractYouTubeId(updates.youtubeUrl)
  }
  if (updates.videoDescription !== undefined) updateData.video_description = updates.videoDescription
  if (updates.appearanceFeeType !== undefined) updateData.appearance_fee_type = updates.appearanceFeeType
  if (updates.appearanceFeeText !== undefined) updateData.appearance_fee_text = updates.appearanceFeeText
  if (updates.transportationType !== undefined) updateData.transportation_type = updates.transportationType
  if (updates.transportationText !== undefined) updateData.transportation_text = updates.transportationText
  if (updates.expenseNote !== undefined) updateData.expense_note = updates.expenseNote
  if (updates.slug !== undefined) {
    const normalizedSlug = updates.slug.startsWith('/') ? updates.slug.substring(1) : updates.slug;
    updateData.slug = normalizedSlug;
  }
  if (updates.isPublished !== undefined) updateData.is_published = updates.isPublished
  if (updates.expiresAt !== undefined) updateData.expires_at = updates.expiresAt

  const { error } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('Error updating proposal:', error)
    return null
  }

  return getProposal(id)
}

export async function deleteProposal(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('proposals')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting proposal:', error)
    return false
  }

  return true
}

export async function duplicateProposal(id: string): Promise<Proposal | null> {
  const original = await getProposal(id)
  if (!original) return null

  // 新しいスラッグを生成
  const timestamp = Date.now()
  const newSlug = `${original.slug}-copy-${timestamp}`

  const newProposal: Omit<Proposal, 'id' | 'createdAt' | 'updatedAt'> = {
    ...original,
    title: `${original.title}（コピー）`,
    slug: newSlug,
    isPublished: false // 複製は非公開状態で作成
  }

  return createProposal(newProposal)
}

// YouTubeのURLから埋め込みIDを抽出
function extractYouTubeId(url: string): string | null {
  if (!url) return null

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// DB形式からアプリ形式への変換
function transformProposalFromDB(dbProposal: any): Proposal {
  return {
    id: dbProposal.id,
    title: dbProposal.title,
    titleNote: dbProposal.title_note,
    recordingDateText: dbProposal.recording_date_text,
    recordingTimeText: dbProposal.recording_time_text,
    locationText: dbProposal.location_text,
    overview: dbProposal.overview,
    youtubeUrl: dbProposal.youtube_url,
    youtubeEmbedId: dbProposal.youtube_embed_id,
    videoDescription: dbProposal.video_description,
    appearanceFeeType: dbProposal.appearance_fee_type,
    appearanceFeeText: dbProposal.appearance_fee_text,
    transportationType: dbProposal.transportation_type,
    transportationText: dbProposal.transportation_text,
    expenseNote: dbProposal.expense_note,
    slug: dbProposal.slug,
    isPublished: dbProposal.is_published,
    expiresAt: dbProposal.expires_at,
    createdAt: dbProposal.created_at,
    updatedAt: dbProposal.updated_at
  }
}