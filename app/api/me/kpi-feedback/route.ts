import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: { user } } = await server.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch unread KPI feedback for this promotor
    const { data: feedback, error } = await server
      .from('kpi_feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching KPI feedback:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ feedback: feedback || null })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: { user } } = await server.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { feedback_id } = body

    if (!feedback_id) {
      return NextResponse.json({ error: 'feedback_id required' }, { status: 400 })
    }

    // Update the feedback to mark as read
    const { error } = await server
      .from('kpi_feedback')
      .update({ read: true })
      .eq('id', feedback_id)
      .eq('user_id', user.id) // Ensure promotor can only update their own

    if (error) {
      console.error('Error updating KPI feedback:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

