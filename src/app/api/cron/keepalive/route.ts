import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { success: false, error: 'Supabase configuration missing' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    // Execute minimal query to keep Supabase active
    const { count, error } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Keepalive query failed:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Supabase keepalive successful - projects count: ${count}`)

    return NextResponse.json({
      success: true,
      timestamp,
      projectsCount: count,
    })
  } catch (error) {
    console.error('Keepalive error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
