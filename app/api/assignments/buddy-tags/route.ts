import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET current user's buddy tag invitations
export async function GET(req: Request) {
  try {
    // Use server client for auth check
    const server = await createSupabaseServerClientAsync()
    const { data: auth, error: authError } = await server.auth.getUser()

    if (authError || !auth?.user) {
      console.error('Auth error in buddy tags API:', authError?.message || 'No user');
      return NextResponse.json({ buddy_tags: [] })
    }


    // Use service client to bypass RLS for data fetch
    const svc = createSupabaseServiceClient()

    const { data: invites, error: invErr } = await svc
      .from('assignment_invitations')
      .select('id, assignment_id, user_id, role, status, invited_at, responded_at, acknowledged_at, replacement_for, is_buddy_tag')
      .eq('user_id', auth.user.id)
      .eq('is_buddy_tag', true)
      .eq('status', 'invited')
      .order('invited_at', { ascending: false })

    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    const assignmentIds = [...new Set((invites || []).map((i: any) => i.assignment_id))]
    if (assignmentIds.length === 0) return NextResponse.json({ buddy_tags: [] })

    const { data: assignments, error: asgErr } = await svc
      .from('assignments')
      .select('id, location_text, postal_code, city, region, start_ts, end_ts, status, description')
      .in('id', assignmentIds)
    if (asgErr) return NextResponse.json({ error: asgErr.message }, { status: 500 })

    // Get participant info (the lead/buddy they'll work with)
    const { data: participants, error: partErr } = await svc
      .from('assignment_participants')
      .select('assignment_id, user_id')
      .in('assignment_id', assignmentIds)
      .eq('role', 'lead')
    if (partErr) console.error('Error loading participants:', partErr)

    let userProfiles: any[] = []
    if (participants && participants.length > 0) {
      const leadUserIds = [...new Set(participants.map((p: any) => p.user_id))]
      const { data: profiles, error: profErr } = await svc
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

      return {
        id: inv.id,
        assignment_id: inv.assignment_id,
        status: inv.status,
        role: inv.role,
        invited_at: inv.invited_at,
        responded_at: inv.responded_at,
        acknowledged_at: inv.acknowledged_at,
        replacement_for: inv.replacement_for,
        is_buddy_tag: true,
        buddy_name: leadParticipant ? leadParticipant.first_name : null,
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


    return NextResponse.json({ buddy_tags: result })
  } catch (e: any) {
    console.error('Server error in buddy tags API:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
