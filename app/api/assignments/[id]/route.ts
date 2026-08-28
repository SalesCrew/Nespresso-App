import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { normalizeForMatch } from '@/lib/matchers/marketMatcher'
import { requireAdmin } from '@/lib/auth/routeGuards'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const body = await req.json().catch(() => ({} as any))
    const svc = createSupabaseServiceClient()

    // Load previous state to detect manual market link
    const { data: before } = await svc
      .from('assignments')
      .select('id, location_text, postal_code, city, matched_market_id')
      .eq('id', params.id)
      .single()

    const updates: Record<string, any> = {}

    // Accept direct start_ts/end_ts or compute from date + planStart/planEnd
    if (body.start_ts) updates.start_ts = body.start_ts
    if (body.end_ts) updates.end_ts = body.end_ts

    if ((!updates.start_ts || !updates.end_ts) && body.date && body.planStart && body.planEnd) {
      const toIso = (dateStr: string, timeStr: string) => {
        // Combine without timezone assumptions, then toISOString
        const d = new Date(`${dateStr}T${timeStr}:00`)
        return d.toISOString()
      }
      updates.start_ts = updates.start_ts || toIso(String(body.date), String(body.planStart))
      updates.end_ts = updates.end_ts || toIso(String(body.date), String(body.planEnd))
    }

    if (body.location_text !== undefined) updates.location_text = String(body.location_text)
    if (body.postal_code !== undefined) updates.postal_code = String(body.postal_code)
    if (body.city !== undefined) updates.city = String(body.city)
    if (body.region !== undefined) updates.region = String(body.region)
    if (body.notes !== undefined) updates.notes = String(body.notes)
    if (body.buddy_user_id !== undefined) updates.buddy_user_id = body.buddy_user_id
    if (body.buddy_name !== undefined) updates.buddy_name = body.buddy_name
    // Allow persisting or clearing the matched market relation
    if (body.matched_market_id !== undefined) updates.matched_market_id = body.matched_market_id || null

    // Handle special_status separately
    if (body.special_status !== undefined) {
      updates.special_status = body.special_status || null
    }

    // Handle status updates - EXACTLY like assigned/buddy_tag
    if (body.status) {
      const status = String(body.status)

      // Check if it's a special status
      if (status === 'Krankenstand' || status === 'Notfall' || status === 'Urlaub' ||
          status === 'Zeitausgleich' || status === 'Markierte' || status === 'Bestätigt' ||
          status === 'Geplant') {
        // Special status - save to special_status DIRECTLY
        const specialMap: Record<string, string> = {
          'Krankenstand': 'krankenstand',
          'Notfall': 'notfall',
          'Urlaub': 'urlaub',
          'Zeitausgleich': 'zeitausgleich',
          'Markierte': 'markierte',
          'Bestätigt': 'bestätigt',
          'Geplant': 'geplant'
        }
        updates.special_status = specialMap[status]
        // IMPORTANT: Don't change the main status field
      } else {
        // Regular status - update status field
        if (status === 'Offen') updates.status = 'open'
        else if (status === 'Verplant') updates.status = 'assigned'
        else if (status === 'Buddy Tag') updates.status = 'buddy_tag'
        else updates.status = status

        // Clear special_status when setting regular status
        updates.special_status = null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
    }

    const { data, error } = await svc
      .from('assignments')
      .update(updates)
      .eq('id', params.id)
      .select('*')
      .single()
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // EXTRA SAFETY: If we're setting special_status, do a direct update JUST for that field
    if (updates.special_status !== undefined) {
      const { error: specialError } = await svc
        .from('assignments')
        .update({ special_status: updates.special_status })
        .eq('id', params.id)

      if (specialError) {
        return NextResponse.json({ error: specialError.message }, { status: 500 })
      }
    }

    // Best-effort: if matched_market_id was set manually here, remember address on market
    try {
      const newMarketId = body?.matched_market_id
      const wasUnmatched = !before?.matched_market_id
      if (newMarketId && wasUnmatched) {
        const rawParts = [
          String(before?.location_text || '').trim(),
          [String(before?.postal_code || '').trim(), String(before?.city || '').trim()].filter(Boolean).join(' ')
        ].filter(Boolean)
        const raw = rawParts.join(', ').trim()
        const fingerprint = normalizeForMatch(raw)

        // Fetch current acceptance list
        const { data: marketRow } = await svc
          .from('markets')
          .select('id, acceptance_addresses')
          .eq('id', newMarketId)
          .single()

        const list: any[] = Array.isArray((marketRow as any)?.acceptance_addresses) ? (marketRow as any).acceptance_addresses : []
        const exists = list.some((e: any) => (e?.fingerprint || '') === fingerprint)
        if (!exists && fingerprint) {
          const entry = {
            raw,
            fingerprint,
            plz: String(before?.postal_code || '').trim() || null,
            city: String(before?.city || '').trim() || null,
            source: 'manual',
            added_at: new Date().toISOString()
          }
          const updatedList = [entry, ...list].slice(0, 30)
          await svc
            .from('markets')
            .update({ acceptance_addresses: updatedList })
            .eq('id', newMarketId)
        }

        // Cascade match: find other assignments with exactly same normalized address (still unmatched) and set matched_market_id
        try {
          if (fingerprint) {
            let q = svc
              .from('assignments')
              .select('id, location_text, postal_code, city, matched_market_id')
              .is('matched_market_id', null)

            if (before?.postal_code) q = q.eq('postal_code', String(before.postal_code))
            if (before?.city) q = q.eq('city', String(before.city))

            const { data: similar } = await q
            const toUpdate = (similar || []).filter((row: any) => {
              const parts = [
                String(row.location_text || '').trim(),
                [String(row.postal_code || '').trim(), String(row.city || '').trim()].filter(Boolean).join(' ')
              ].filter(Boolean)
              const cand = normalizeForMatch(parts.join(', ').trim())
              return cand === fingerprint && row.id !== before?.id
            }).map((row: any) => row.id)

            if (toUpdate.length > 0) {
              await svc.from('assignments').update({ matched_market_id: newMarketId }).in('id', toUpdate)
            }
          }
        } catch (e) {
          console.warn('Non-blocking: failed to cascade manual match to similar assignments', e)
        }
      }
    } catch (e) {
      console.warn('Non-blocking: failed to append acceptance address', e)
    }

    return NextResponse.json({ assignment: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) return auth.response
    const svc = createSupabaseServiceClient()

    const { error } = await svc
      .from('assignments')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


