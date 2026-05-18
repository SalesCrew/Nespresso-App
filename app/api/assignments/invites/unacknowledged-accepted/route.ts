import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET accepted invitations that haven't been acknowledged yet
export async function GET(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: auth } = await server.auth.getUser()
    
    if (!auth?.user) {
      return NextResponse.json({ invites: [] })
    }
    
    const svc = createSupabaseServiceClient()
    
    // First get all accepted invitations for the user
    const { data: invites, error: invErr } = await svc
      .from('assignment_invitations')
      .select('assignment_id, user_id, role, status, invited_at, responded_at')
      .eq('user_id', auth.user.id)
      .eq('status', 'accepted')
      .order('responded_at', { ascending: false })
      
    if (invErr) {
      console.error('Error fetching accepted invites:', invErr)
      return NextResponse.json({ invites: [] })
    }
    
    if (!invites || invites.length === 0) {
      return NextResponse.json({ invites: [] })
    }
    
    // Get acknowledged assignments
    const assignmentIds = invites.map(i => i.assignment_id)
    const { data: acknowledged, error: ackErr } = await svc
      .from('assignment_acknowledgments')
      .select('assignment_id')
      .eq('user_id', auth.user.id)
      .in('assignment_id', assignmentIds)
      
    if (ackErr) {
      console.error('Error fetching acknowledgments:', ackErr)
    }
    
    const acknowledgedIds = new Set((acknowledged || []).map(a => a.assignment_id))
    
    // Filter out acknowledged invitations
    const unacknowledgedInvites = invites.filter(i => !acknowledgedIds.has(i.assignment_id))
    
    if (unacknowledgedInvites.length === 0) {
      return NextResponse.json({ invites: [] })
    }
    
    // Get assignment details
    const unackAssignmentIds = unacknowledgedInvites.map(i => i.assignment_id)
    const { data: assignments, error: asgErr } = await svc
      .from('assignments')
      .select('*')
      .in('id', unackAssignmentIds)
      
    if (asgErr) {
      console.error('Error fetching assignments:', asgErr)
      return NextResponse.json({ invites: [] })
    }
    
    // Map assignment details to invitations
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
    console.error('Server error:', e)
    return NextResponse.json({ invites: [] })
  }
}
