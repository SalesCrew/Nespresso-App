import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: { user } } = await server.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all KPI feedback for this promotor (for history/stats)
    const { data: feedback, error } = await server
      .from('kpi_feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching KPI feedback history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback: feedback || [] })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

