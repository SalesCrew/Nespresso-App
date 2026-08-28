import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// List promotors who applied for a given assignment
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const svc = createSupabaseServiceClient()
    const { data: invites, error: invErr } = await svc
      .from('assignment_invitations')
      .select('id, user_id, role, status, responded_at')
      .eq('assignment_id', params.id)
      .eq('status', 'applied')
      .order('responded_at', { ascending: true })
    if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

    const userIds = [...new Set((invites || []).map((i: any) => i.user_id))]
    if (userIds.length === 0) return NextResponse.json({ applications: [] })

    const { data: users, error: usersErr } = await svc
      .from('user_profiles')
      .select('user_id, display_name, phone')
      .in('user_id', userIds)
    if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 })

    const byUser = new Map((users || []).map((u: any) => [u.user_id, u]))
    const applications = (invites || []).map((i: any) => {
      const u = byUser.get(i.user_id)
      return {
        invitation_id: i.id,
        user_id: i.user_id,
        name: u?.display_name || 'Unbekannt',
        phone: u?.phone || null,
        role: i.role,
        responded_at: i.responded_at,
      }
    })

    return NextResponse.json({ applications })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


