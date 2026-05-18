import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET current user's process
export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()
    
    if (authError || !auth?.user) {
      return NextResponse.json({ process: null })
    }
    
    const svc = createSupabaseServiceClient()
    
    // Get current process
    const { data: process, error } = await svc
      .from('assignment_processes')
      .select('*')
      .eq('user_id', auth.user.id)
      .is('completed_at', null)
      .single()
    
    if (error) {
      // If table doesn't exist or no rows found, return null
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json({ process: null })
      }
      console.error('Error fetching process:', error)
      return NextResponse.json({ error: 'Failed to fetch process' }, { status: 500 })
    }
    
    return NextResponse.json({ process: process || null })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create or update process
export async function POST(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()
    
    if (authError || !auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await req.json()
    const { stage, originalIds = [], replacementIds = [] } = body
    
    const svc = createSupabaseServiceClient()
    
    // Upsert process (insert or update based on user_id)
    const { data, error } = await svc
      .from('assignment_processes')
      .upsert({
        user_id: auth.user.id,
        process_stage: stage,
        original_assignment_ids: originalIds,
        replacement_assignment_ids: replacementIds,
        completed_at: stage === 'idle' ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      // If table doesn't exist, ignore
      if (error.code === '42P01') {
        return NextResponse.json({ process: null })
      }
      console.error('Error saving process:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ process: data })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// DELETE complete current process
export async function DELETE() {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()
    
    if (authError || !auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const svc = createSupabaseServiceClient()
    
    // Mark process as completed
    const { error } = await svc
      .from('assignment_processes')
      .update({ 
        completed_at: new Date().toISOString(),
        process_stage: 'idle'
      })
      .eq('user_id', auth.user.id)
      .is('completed_at', null)
    
    if (error) {
      // If table doesn't exist, ignore
      if (error.code === '42P01') {
        return NextResponse.json({ ok: true })
      }
      console.error('Error completing process:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
