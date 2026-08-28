import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET rejected assignments that haven't been acknowledged
export async function GET(req: Request) {
  try {
    // Use server client for auth check
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()

    if (authError || !auth?.user) {
      console.error('Auth error in unacknowledged rejected API:', authError?.message || 'No user');
      return NextResponse.json({ invites: [] })
    }

    // Use service client to bypass RLS for data fetch
    const svc = createSupabaseServiceClient()

    // Get rejected invitations that haven't been acknowledged
    const { data: invites, error: invErr } = await svc
      .from('assignment_invitations')
      .select('assignment_id, user_id, role, status, invited_at, responded_at')
      .eq('user_id', auth.user.id)
      .eq('status', 'rejected')
      .order('responded_at', { ascending: false })

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })
    if (!invites || invites.length === 0) return NextResponse.json({ invites: [] })

    // Check which ones have been acknowledged
    const assignmentIds = invites.map(i => i.assignment_id)
    const { data: acknowledgments } = await svc
      .from('assignment_acknowledgments')
      .select('assignment_id')
      .eq('user_id', auth.user.id)
      .in('assignment_id', assignmentIds)

    const acknowledgedIds = new Set((acknowledgments || []).map(a => a.assignment_id))
    const unacknowledgedInvites = invites.filter(i => !acknowledgedIds.has(i.assignment_id))

    if (unacknowledgedInvites.length === 0) return NextResponse.json({ invites: [] })

    // Get full assignment details
    const unacknowledgedAssignmentIds = unacknowledgedInvites.map(i => i.assignment_id)
    const { data: assignments, error: asgErr } = await svc
      .from('assignments')
      .select('*')
      .in('id', unacknowledgedAssignmentIds)

    if (asgErr) return NextResponse.json({ error: asgErr.message }, { status: 500 })

    const byId = new Map((assignments || []).map((a: any) => [a.id, a]))
    const result = unacknowledgedInvites.map((inv: any) => {
      const a = byId.get(inv.assignment_id)
      return {
        assignment_id: inv.assignment_id,
        status: inv.status,
        role: inv.role,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at,
        assignment: a ? {
          id: a.id,
          location_text: a.location_text,
          postal_code: a.postal_code,
          city: a.city,
          region: a.region,
          start_ts: a.start_ts,
          end_ts: a.end_ts,
          status: a.status,
          description: a.description,
        } : null
      }
    })


    return NextResponse.json({ invites: result })
  } catch (e: any) {
    console.error('Server error in unacknowledged rejected:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
