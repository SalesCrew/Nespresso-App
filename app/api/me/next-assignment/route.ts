import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientAsync()
    const { data: { user }, error: authError } = await supabase.auth.getUser()


    if (!user) {
      return NextResponse.json({ assignment: null }, { status: 401 })
    }

    // Use service client for data queries to bypass RLS
    const svc = createSupabaseServiceClient()

    // Get all assignment IDs where this user is a participant (lead or buddy)

    // First, let's check if the user exists in assignment_participants at all
    const { data: allParticipants, error: allPartErr } = await svc
      .from('assignment_participants')
      .select('*')
      .eq('user_id', user.id)


    const { data: participantRows, error: partErr } = await svc
      .from('assignment_participants')
      .select('assignment_id, role')
      .eq('user_id', user.id)

    if (partErr) {
      console.error('[next-assignment] Participant query error:', partErr)
      return NextResponse.json({ error: partErr.message }, { status: 500 })
    }

    const assignmentIds = [...new Set((participantRows || []).map(r => r.assignment_id))]

    if (assignmentIds.length === 0) {
      return NextResponse.json({ assignment: null })
    }

    const nowIso = new Date().toISOString()

    // First, let's check if there's an assignment happening right now (already started but not ended)
    const { data: currentAssignments, error: currErr } = await svc
      .from('assignments')
      .select('id, title, location_text, postal_code, city, region, start_ts, end_ts, status, special_status, matched_market_id')
      .in('id', assignmentIds)
      .in('status', ['assigned', 'buddy_tag'])
      .neq('type', 'schulung')
      .lte('start_ts', nowIso) // Started before or at current time
      .gte('end_ts', nowIso)   // Ends after or at current time
      .order('start_ts', { ascending: true })
      .limit(1)

    if (currErr) {
      console.error('[next-assignment] Current assignment query error:', currErr)
    }


    // If there's a current assignment, return it
    if (currentAssignments && currentAssignments.length > 0) {
      const assignment = currentAssignments[0]
      // Add computed address field
      const enhancedAssignment = {
        ...assignment,
        address: assignment.postal_code && assignment.city
          ? `${assignment.postal_code} ${assignment.city}`
          : assignment.location_text
      }
      return NextResponse.json({ assignment: enhancedAssignment })
    }

    // Otherwise, fetch upcoming assignments
    const { data: assignments, error: asgErr } = await svc
      .from('assignments')
      .select('id, title, location_text, postal_code, city, region, start_ts, end_ts, status, special_status, matched_market_id')
      .in('id', assignmentIds)
      .in('status', ['assigned', 'buddy_tag'])
      .neq('type', 'schulung')
      .gt('start_ts', nowIso) // Starts after current time
      .order('start_ts', { ascending: true })
      .limit(1)

    if (asgErr) {
      console.error('[next-assignment] Assignment query error:', asgErr)
      return NextResponse.json({ error: asgErr.message }, { status: 500 })
    }


    // Also log all assignments for this user regardless of status for debugging
    const { data: allAssignments } = await svc
      .from('assignments')
      .select('id, title, status, start_ts')
      .in('id', assignmentIds)
      .order('start_ts', { ascending: true })


    const assignment = (assignments && assignments[0]) || null
    if (assignment) {
      // Add computed address field
      const enhancedAssignment = {
        ...assignment,
        address: assignment.postal_code && assignment.city
          ? `${assignment.postal_code} ${assignment.city}`
          : assignment.location_text
      }
      return NextResponse.json({ assignment: enhancedAssignment })
    }
    return NextResponse.json({ assignment: null })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


