import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const svc = createSupabaseServiceClient()
    const body = await _req.json().catch(() => ({}))
    const user_id = String(body.user_id || '')
    const role = String(body.role || 'lead')
    const allowedRoles = new Set(['lead', 'buddy', 'trainer'])
    if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    if (!allowedRoles.has(role)) {
      return NextResponse.json({ error: 'invalid role' }, { status: 400 })
    }

    // Upsert participant
    const { error: upErr } = await svc.from('assignment_participants').upsert({ assignment_id: params.id, user_id, role, chosen_by_admin: true, chosen_at: new Date().toISOString() })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    // Set status to assigned
    const { error: asgErr } = await svc.from('assignments').update({ status: 'assigned' }).eq('id', params.id)
    if (asgErr) return NextResponse.json({ error: asgErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// Remove a participant for an assignment by role (used for removing buddy)
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const svc = createSupabaseServiceClient()
    // Expect role in query string; default to 'buddy'
    const url = new URL(_req.url)
    const role = String(url.searchParams.get('role') || 'buddy')

    // Delete participant with given role
    const { error: delErr } = await svc
      .from('assignment_participants')
      .delete()
      .eq('assignment_id', params.id)
      .eq('role', role)

    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })

    // If lead still exists keep status as assigned, otherwise set to open
    const { data: leadRows } = await svc
      .from('assignment_participants')
      .select('user_id')
      .eq('assignment_id', params.id)
      .eq('role', 'lead')

    const newStatus = (leadRows && leadRows.length > 0) ? 'assigned' : 'open'

    // Build updates: always update status; if removing buddy, also clear buddy fields
    const updates: Record<string, any> = { status: newStatus }
    if (role === 'buddy') {
      updates.buddy_user_id = null
      updates.buddy_name = null
    }

    const { error: upErr } = await svc
      .from('assignments')
      .update(updates)
      .eq('id', params.id)

    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


