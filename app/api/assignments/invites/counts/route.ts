import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

// GET invite counts (invited/applied/rejected) grouped by assignment_id
// Eingeladen = total invitations sent (all statuses)
// Angenommen = applied (promotor accepted the invite)
// Abgelehnt = rejected or withdrawn
export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const url = new URL(req.url)
    const idsParam = url.searchParams.get('ids') || ''
    const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({ counts: {} })
    }
    if (ids.length > 200) return NextResponse.json({ error: 'Too many assignment ids' }, { status: 400 })

    const svc = createSupabaseServiceClient()

    // Get all invitations for these assignments
    const { data, error } = await svc
      .from('assignment_invitations')
      .select('assignment_id,status')
      .in('assignment_id', ids)

    if (error) {
      console.error('Failed to fetch invite counts:', error)
      return NextResponse.json({ counts: {} })
    }

    const result: Record<string, { invited: number; accepted: number; rejected: number }> = {}
    for (const row of data || []) {
      const assignmentId = (row as any).assignment_id as string
      const status = (row as any).status as string

      if (!result[assignmentId]) {
        result[assignmentId] = { invited: 0, accepted: 0, rejected: 0 }
      }

      // Eingeladen = all invitations (count everything)
      result[assignmentId].invited += 1

      // Angenommen = applied status
      if (status === 'applied') {
        result[assignmentId].accepted += 1
      }

      // Abgelehnt = rejected or withdrawn
      if (status === 'rejected' || status === 'withdrawn') {
        result[assignmentId].rejected += 1
      }
    }

    return NextResponse.json({ counts: result })
  } catch (e: any) {
    console.error('Server error in invite counts:', e)
    return NextResponse.json({ counts: {} })
  }
}


