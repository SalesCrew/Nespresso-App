import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/routeGuards'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const body = await req.json().catch(() => ({}))
    const userId = body?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 })
    }

    const svc = createSupabaseServiceClient()

    // Update invitation status to accepted
    const { error } = await svc
      .from('assignment_invitations')
      .update({
        status: 'accepted',
        responded_at: new Date().toISOString()
      })
      .eq('assignment_id', params.id)
      .eq('user_id', userId)
      .eq('status', 'applied') // Only update if currently applied

    if (error) {
      console.error('Error accepting invitation:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update other applications to rejected
    await svc
      .from('assignment_invitations')
      .update({
        status: 'rejected',
        responded_at: new Date().toISOString()
      })
      .eq('assignment_id', params.id)
      .eq('status', 'applied')
      .neq('user_id', userId)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
