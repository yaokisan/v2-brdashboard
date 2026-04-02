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
  const timestamp = new Date().toISOString()

  try {
    // INSERT a row into the keepalive table (write operation for stronger activity signal)
    const { error: insertError } = await supabase
      .from('keepalive')
      .insert({ pinged_at: timestamp })

    if (insertError) {
      console.error('Keepalive insert failed:', insertError)
      return NextResponse.json(
        { success: false, error: insertError.message },
        { status: 500 }
      )
    }

    // DELETE old rows to prevent table bloat (keep only the latest 10)
    const { data: rows } = await supabase
      .from('keepalive')
      .select('id')
      .order('pinged_at', { ascending: false })
      .range(10, 999)

    if (rows && rows.length > 0) {
      const idsToDelete = rows.map((r: { id: string }) => r.id)
      await supabase
        .from('keepalive')
        .delete()
        .in('id', idsToDelete)
    }

    console.log(`[${timestamp}] Supabase keepalive successful - insert + cleanup done`)

    return NextResponse.json({
      success: true,
      timestamp,
      action: 'insert_and_cleanup',
    })
  } catch (error) {
    console.error('Keepalive error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
