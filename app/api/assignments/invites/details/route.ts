import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET invite details (promotor names) grouped by assignment_id and status
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ details: {} })
    }
    if (ids.length > 200) return NextResponse.json({ error: 'Too many assignment ids' }, { status: 400 })

    const svc = createSupabaseServiceClient()

    // Get all invitations for these assignments
    const { data: invites, error: invitesError } = await svc
      .from('assignment_invitations')
      .select('assignment_id, user_id, status')
      .in('assignment_id', ids)

    if (invitesError) {
      console.error('Failed to fetch invitations:', invitesError)
      return NextResponse.json({ details: {} })
    }

    // Get all unique user_ids
    const userIds = [...new Set((invites || []).map((i: any) => i.user_id))]

    if (userIds.length === 0) {
      return NextResponse.json({ details: {} })
    }

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds)

    if (profilesError) {
      console.error('Failed to fetch profiles:', profilesError)
      return NextResponse.json({ details: {} })
    }

    const userMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name || 'Unbekannt']))

    // Build details map
    const details: Record<string, { invited: string[]; accepted: string[]; rejected: string[] }> = {}

    for (const assignmentId of ids) {
      details[assignmentId] = { invited: [], accepted: [], rejected: [] }

      const assignmentInvites = (invites || []).filter((i: any) => i.assignment_id === assignmentId)

      for (const invite of assignmentInvites) {
        const userName = userMap.get(invite.user_id) || 'Unbekannt'

        // All invites go into "invited"
        details[assignmentId].invited.push(userName)

        // Applied goes into "accepted"
        if (invite.status === 'applied') {
          details[assignmentId].accepted.push(userName)
        }

        // Rejected/withdrawn goes into "rejected"
        if (invite.status === 'rejected' || invite.status === 'withdrawn') {
          details[assignmentId].rejected.push(userName)
        }
      }
    }

    return NextResponse.json({ details })
  } catch (e: any) {
    console.error('Server error in invite details:', e)
    return NextResponse.json({ details: {} })
  }
}

