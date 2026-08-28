import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { computeBestMarket, normalizeForMatch } from '@/lib/matchers/marketMatcher'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const svc = createSupabaseServiceClient()

    // Load assignment
    const { data: assignment, error: aErr } = await svc
      .from('assignments')
      .select('id, location_text, postal_code, city, matched_market_id')
      .eq('id', params.id)
      .single()
    if (aErr || !assignment) return NextResponse.json({ error: aErr?.message || 'Assignment not found' }, { status: 404 })

    // If already matched, return early without recomputing
    if (assignment.matched_market_id) {
      return NextResponse.json({ matched_market_id: assignment.matched_market_id, confidence: 100, market: null })
    }

    // 1) Try PLZ prefilter first
    const assignmentPlz = String(assignment.postal_code || '').trim()
    let candidates: any[] = []
    if (assignmentPlz) {
      const { data: byPlz, error: plzErr } = await svc
        .from('markets')
        .select('id, name, address, plz, city, acceptance_addresses')
        .eq('plz', assignmentPlz)
      if (plzErr) return NextResponse.json({ error: plzErr.message }, { status: 500 })
      candidates = byPlz || []
      if (candidates.length === 1) {
        const only = candidates[0]
        const { data: updated, error: uErr } = await svc
          .from('assignments')
          .update({ matched_market_id: only.id })
          .eq('id', params.id)
          .select('id, matched_market_id')
          .single()
        if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })
        return NextResponse.json({ matched_market_id: updated.matched_market_id, confidence: 100, market: only })
      }
    }

    // 2) If multiple PLZ candidates, score among them; otherwise fallback to city, then all
    if (candidates.length === 0) {
      const cityKey = normalizeForMatch(String(assignment.city || assignment.location_text || ''))
      if (cityKey) {
        const { data: byCity, error: cityErr } = await svc
          .from('markets')
          .select('id, name, address, plz, city, acceptance_addresses')
          .ilike('city', '%') // fetch all; we'll normalize in JS quickly
        if (cityErr) return NextResponse.json({ error: cityErr.message }, { status: 500 })
        candidates = (byCity || []).filter((m: any) => normalizeForMatch(String(m.city || '')) === cityKey)
      }
    }
    if (candidates.length === 0) {
      const { data: allMarkets, error: mErr } = await svc
        .from('markets')
        .select('id, name, address, plz, city, acceptance_addresses')
      if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 })
      candidates = allMarkets || []
    }

    const { market, score } = computeBestMarket(
      {
        id: assignment.id,
        location_text: assignment.location_text,
        postal_code: assignment.postal_code,
        city: assignment.city,
      },
      candidates.map(m => ({
        id: m.id,
        name: (m as any).name,
        address: (m as any).address,
        plz: (m as any).plz,
        city: (m as any).city,
      }))
    )

    const threshold = 70
    if (!market || score < threshold) {
      return NextResponse.json({ matched_market_id: null, confidence: score, market: null })
    }

    const { data: updated, error: uErr } = await svc
      .from('assignments')
      .update({ matched_market_id: market.id })
      .eq('id', params.id)
      .select('id, matched_market_id')
      .single()
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

    return NextResponse.json({ matched_market_id: updated.matched_market_id, confidence: score, market })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


