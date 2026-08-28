import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET current user's assignment invitations (e.g., status=invited|accepted)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status') // Don't default to 'invited'
    const invitationIds = url.searchParams.get('invitation_ids')

    // Use server client for auth check
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()

    if (authError || !auth?.user) {
      console.error('Auth error in invites API:', authError?.message || 'No user');
      // Return empty invites instead of 401 to avoid breaking the UI
      return NextResponse.json({ invites: [] })
    }


    // Use service client to bypass RLS for data fetch
    const svc = createSupabaseServiceClient()

    // Use service client to join assignment details robustly
    let query = svc
      .from('assignment_invitations')
      .select('id, assignment_id, user_id, role, status, invited_at, responded_at, acknowledged_at, replacement_for, is_buddy_tag')

    // If invitation_ids are provided, fetch those specific invitations
    if (invitationIds) {
      const ids = invitationIds.split(',').filter(id => id.trim());
      query = query.in('id', ids)
    } else {
      // Otherwise filter by user
      query = query.eq('user_id', auth.user.id)

      // Only filter by status if it's provided
      if (status) {
        query = query.eq('status', status)
      }

      // Always exclude verstanden and rejected_handled status, and buddy tags from normal invitations
      query = query.neq('status', 'verstanden').neq('status', 'rejected_handled').eq('is_buddy_tag', false)
    }

    const { data: invites, error: invErr } = await query
      .order('invited_at', { ascending: false })

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    const assignmentIds = [...new Set((invites || []).map((i: any) => i.assignment_id))]
    if (assignmentIds.length === 0) return NextResponse.json({ invites: [] })

    const { data: assignments, error: asgErr } = await svc
      .from('assignments')
      .select('*')
      .in('id', assignmentIds)
    if (asgErr) return NextResponse.json({ error: asgErr.message }, { status: 500 })

    // Get existing participants (to check if someone is already assigned as lead)
    const { data: participants, error: partErr } = await svc
      .from('assignment_participants')
      .select('assignment_id, user_id, role, chosen_by_admin')
      .in('assignment_id', assignmentIds)
      .eq('role', 'lead')
      .eq('chosen_by_admin', true)
    if (partErr) console.error('Error fetching participants:', partErr)

    // If there are lead participants, get their names
    const leadUserIds = [...new Set((participants || []).map((p: any) => p.user_id))]
    let userProfiles: any[] = []
    if (leadUserIds.length > 0) {
      const { data: profiles } = await svc
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', leadUserIds)
      userProfiles = profiles || []
    }

    const participantsByAssignment = new Map()
    const userProfilesMap = new Map(userProfiles.map((u: any) => [u.user_id, u]))

    ;(participants || []).forEach((p: any) => {
      const profile = userProfilesMap.get(p.user_id)
      if (profile) {
        participantsByAssignment.set(p.assignment_id, {
          user_id: p.user_id,
          display_name: profile.display_name,
          first_name: profile.display_name ? profile.display_name.split(' ')[0] : 'Promotor'
        })
      }
    })

    const byId = new Map((assignments || []).map((a: any) => [a.id, a]))
    const result = (invites || []).map((inv: any) => {
      const a = byId.get(inv.assignment_id)
      const leadParticipant = participantsByAssignment.get(inv.assignment_id)
      const isBuddyTag = !!leadParticipant && inv.role === 'buddy'

      return {
        id: inv.id,
        assignment_id: inv.assignment_id,
        status: inv.status,
        role: inv.role,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at,
        acknowledged_at: inv.acknowledged_at,
        replacement_for: inv.replacement_for,
        is_buddy_tag: inv.is_buddy_tag,
        buddy_name: isBuddyTag ? leadParticipant.first_name : null,
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
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

