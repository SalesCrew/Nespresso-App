import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const svc = createSupabaseServiceClient()

    // NOTE: harmless comment to trigger a new deploy on Vercel
    // This does not affect runtime behavior.

    // Fetch invitation history
    const { data: history, error } = await svc
      .from('invitation_history')
      .select(`
        id,
        created_at,
        promotion_count,
        promotor_count,
        buddy,
        assignment_ids,
        promotor_ids,
        created_by
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Failed to fetch invitation history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch related data for the UI
    const formatted = await Promise.all((history || []).map(async (item) => {
      // Fetch promotions with full details
      const { data: promotions } = await svc
        .from('assignments')
        .select('id, location_text, postal_code, city, region, start_ts, end_ts, status, type')
        .in('id', item.assignment_ids || [])

      // Fetch promotor names
      const { data: promotors } = await svc
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', item.promotor_ids || [])

      return {
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString('de-DE'),
        time: new Date(item.created_at).toLocaleTimeString('de-AT', {
          timeZone: 'Europe/Vienna',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }),
        promotionCount: item.promotion_count,
        promotorCount: item.promotor_count,
        buddy: item.buddy,
        assignmentIds: item.assignment_ids,
        promotorIds: item.promotor_ids,
        promotions: (promotions || []).map(p => {
          const start = p.start_ts ? new Date(p.start_ts) : null;
          const end = p.end_ts ? new Date(p.end_ts) : null;
          return {
            id: p.id,
            address: p.location_text || '',
            date: start ? start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '',
            planStart: start ? `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}` : '',
            planEnd: end ? `${String(end.getUTCHours()).padStart(2, '0')}:${String(end.getUTCMinutes()).padStart(2, '0')}` : '',
            plz: p.postal_code || '',
            city: p.city || '',
            status: p.status || 'open'
          };
        }),
        promotors: (promotors || []).map(p => p.display_name || 'Unknown')
      }
    }))

    return NextResponse.json({ history: formatted })
  } catch (e: any) {
    console.error('Server error in invitation history:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
