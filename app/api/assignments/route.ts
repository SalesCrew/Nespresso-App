import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requireAdmin, requireUser } from '@/lib/auth/routeGuards'
import { signEinsatzPhotoFields } from '@/lib/storage/einsatzPhotos'

const ASSIGNMENTS_PAGE_SIZE = 1000
const IN_CLAUSE_CHUNK_SIZE = 500

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

export async function GET(req: Request) {
  try {
    const auth = await requireUser()
    if (!auth.ok) return auth.response

    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const region = url.searchParams.get('region')
    const status = url.searchParams.get('status')
    const ids = url.searchParams.get('ids')

    // Use service role to ensure admins can list all assignments regardless of session context
    const svc = createSupabaseServiceClient()
    let idArray = ids ? ids.split(',').map((id) => id.trim()).filter(Boolean) : []
    if (idArray.length > 200) {
      return NextResponse.json({ error: 'too many assignment ids' }, { status: 400 })
    }

    if (!auth.isAdmin) {
      if (idArray.length === 0) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
      }

      const [{ data: participantRows }, { data: invitationRows }] = await Promise.all([
        svc
          .from('assignment_participants')
          .select('assignment_id')
          .eq('user_id', auth.user.id)
          .in('assignment_id', idArray),
        svc
          .from('assignment_invitations')
          .select('assignment_id')
          .eq('user_id', auth.user.id)
          .in('assignment_id', idArray),
      ])
      const allowedIds = new Set([
        ...(participantRows || []).map((row: any) => String(row.assignment_id)),
        ...(invitationRows || []).map((row: any) => String(row.assignment_id)),
      ])
      idArray = idArray.filter((id) => allowedIds.has(id))
      if (idArray.length === 0) return NextResponse.json({ assignments: [] })
    }
    const buildQuery = (offset: number) => {
      let q = svc
        .from('assignments_with_buddy_info')
        .select('*')
        .order('start_ts', { ascending: true })
        .range(offset, offset + ASSIGNMENTS_PAGE_SIZE - 1)

      if (idArray.length > 0) {
        q = q.in('id', idArray)
      } else {
        if (from) q = q.gte('start_ts', from)
        if (to) q = q.lte('end_ts', to)
        if (region) q = q.eq('region', region)
        if (status) q = q.eq('status', status)
      }

      return q
    }

    const rows: any[] = []
    let offset = 0
    for (;;) {
      const { data, error } = await buildQuery(offset)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const pageRows = Array.isArray(data) ? data : []
      rows.push(...pageRows)
      if (pageRows.length < ASSIGNMENTS_PAGE_SIZE) break
      offset += ASSIGNMENTS_PAGE_SIZE
    }

    // Ensure matched_market_id is present even if the view is out of date.
    if (rows.length === 0) return NextResponse.json({ assignments: [] })

    const rowIds = rows.map((r: any) => r.id).filter(Boolean)
    const mmMap = new Map<string, string | null>()
    for (const idChunk of chunkArray(rowIds, IN_CLAUSE_CHUNK_SIZE)) {
      const { data: mmRows } = await svc
        .from('assignments')
        .select('id, matched_market_id')
        .in('id', idChunk)
      for (const r of mmRows || []) {
        mmMap.set(String((r as any).id), (r as any).matched_market_id ?? null)
      }
    }

    // Load tracking rows for the lead participant so historical data can be displayed
    const leadMap = new Map(rows.map((r: any) => [r.id, r.lead_user_id]))
    const trackingMap = new Map<string, any>()
    if (rowIds.length > 0) {
      for (const idChunk of chunkArray(rowIds, IN_CLAUSE_CHUNK_SIZE)) {
        const { data: trackingRows, error: trackingError } = await svc
          .from('assignment_tracking')
          .select('assignment_id, user_id, buddy_user_id, actual_start_time, actual_end_time, status, notes, early_start_reason, minutes_early_start, early_end_reason, minutes_early_end, foto_maschine_url, foto_kapsellade_url, foto_pos_gesamt_url, foto_extra_url')
          .in('assignment_id', idChunk)

        if (!trackingError && Array.isArray(trackingRows)) {
          trackingRows.forEach((tr: any) => {
            const leadId = leadMap.get(tr.assignment_id)
            if (leadId && tr.user_id === leadId) {
              trackingMap.set(tr.assignment_id, tr)
            }
          })
        }
      }
    }

    const enriched = await Promise.all(rows.map(async (r: any) => {
      const tracking = trackingMap.get(r.id)
      return signEinsatzPhotoFields(svc, {
        ...r,
        matched_market_id: r.matched_market_id !== undefined ? r.matched_market_id : (mmMap.get(r.id) ?? null),
        tracking_actual_start_time: tracking?.actual_start_time ?? null,
        tracking_actual_end_time: tracking?.actual_end_time ?? null,
        tracking_status: tracking?.status ?? null,
        tracking_notes: tracking?.notes ?? null,
        tracking_early_start_reason: tracking?.early_start_reason ?? null,
        tracking_minutes_early_start: tracking?.minutes_early_start ?? null,
        tracking_early_end_reason: tracking?.early_end_reason ?? null,
        tracking_minutes_early_end: tracking?.minutes_early_end ?? null,
        tracking_foto_maschine_url: tracking?.foto_maschine_url ?? null,
        tracking_foto_kapsellade_url: tracking?.foto_kapsellade_url ?? null,
        tracking_foto_pos_gesamt_url: tracking?.foto_pos_gesamt_url ?? null,
        tracking_foto_extra_url: tracking?.foto_extra_url ?? null,
      }, [
        'tracking_foto_maschine_url',
        'tracking_foto_kapsellade_url',
        'tracking_foto_pos_gesamt_url',
        'tracking_foto_extra_url',
      ])
    }))

    return NextResponse.json({ assignments: enriched })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const body = await req.json().catch(() => ({}))
    const svc = createSupabaseServiceClient()
    const { data, error } = await svc.from('assignments').insert(body).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Immediately try to auto-match this new assignment using market acceptance memory
    try {
      const assignment = data as any
      // Load markets (minimal fields)
      const { data: markets } = await svc
        .from('markets')
        .select('id, name, address, plz, city, acceptance_addresses')

      if (markets && markets.length > 0) {
        // Build helpers similar to auto-match route
        const normalizeForMatch = (input: string) =>
          input.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()

        const parts = [
          String(assignment.location_text || '').trim(),
          [String(assignment.postal_code || '').trim(), String(assignment.city || '').trim()].filter(Boolean).join(' ')
        ].filter(Boolean)
        const aFp = normalizeForMatch(parts.join(', ').trim())

        // Fast path: exact acceptance match
        let chosen: any = null
        for (const m of markets) {
          const primaryParts = [String((m as any).address || '').trim(), [String((m as any).plz || '').trim(), String((m as any).city || '').trim()].filter(Boolean).join(' ')].filter(Boolean)
          const primaryFp = normalizeForMatch(primaryParts.join(', ').trim())
          const acc = Array.isArray((m as any).acceptance_addresses) ? (m as any).acceptance_addresses : []
          const set = new Set<string>([primaryFp, ...acc.map((a: any) => normalizeForMatch(String(a?.fingerprint || a?.raw || '')))])
          if (aFp && set.has(aFp)) { chosen = m; break; }
        }

        // If fast path found, update
        if (chosen) {
          await svc.from('assignments').update({ matched_market_id: (chosen as any).id }).eq('id', assignment.id)
        }
      }
    } catch { /* non-blocking */ }

    return NextResponse.json({ assignment: data }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


