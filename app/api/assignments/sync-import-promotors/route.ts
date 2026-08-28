import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { normalizeForMatch } from '@/lib/matchers/marketMatcher'

type PromotorCandidate = {
  user_id: string
  name: string
  normalized: string
  tokens: string[]
  firstToken: string
  lastToken: string
}

function normalizePersonName(input: string): string {
  return normalizeForMatch(String(input || '').replace(/ß/gi, 'ss'))
}

function tokenSetKey(tokens: string[]): string {
  return [...new Set(tokens)].sort().join('|')
}

async function loadPromotorCandidates(svc: ReturnType<typeof createSupabaseServiceClient>): Promise<PromotorCandidate[]> {
  const { data } = await svc
    .from('user_profiles')
    .select('user_id, display_name')
    .eq('role', 'promotor')

  return (data || [])
    .map((p: any) => {
      const name = String(p?.display_name || '').trim()
      const normalized = normalizePersonName(name)
      const tokens = normalized.split(' ').filter(Boolean)
      return {
        user_id: String(p.user_id),
        name,
        normalized,
        tokens,
        firstToken: tokens[0] || '',
        lastToken: tokens[tokens.length - 1] || '',
      } as PromotorCandidate
    })
    .filter((p: PromotorCandidate) => !!p.user_id && !!p.name)
}

function resolvePromotorMatch(importedNameRaw: string, promotors: PromotorCandidate[]) {
  const importedName = String(importedNameRaw || '').trim()
  if (!importedName) {
    return {
      status: 'none' as const,
      leadUserId: null as string | null,
      reason: null as string | null,
      candidates: [] as PromotorCandidate[],
    }
  }

  const normalizedImported = normalizePersonName(importedName)
  const importedTokens = normalizedImported.split(' ').filter(Boolean)
  if (!normalizedImported || importedTokens.length === 0) {
    return { status: 'unresolved' as const, leadUserId: null, reason: 'unreadable_name', candidates: [] as PromotorCandidate[] }
  }

  const exactFull = promotors.filter((p) => p.normalized === normalizedImported)
  if (exactFull.length === 1) return { status: 'auto' as const, leadUserId: exactFull[0].user_id, reason: 'exact_full', candidates: exactFull }
  if (exactFull.length > 1) return { status: 'unresolved' as const, leadUserId: null, reason: 'exact_full_ambiguous', candidates: exactFull }

  const importedSetKey = tokenSetKey(importedTokens)
  const exactTokenSet = promotors.filter((p) => tokenSetKey(p.tokens) === importedSetKey)
  if (exactTokenSet.length === 1) return { status: 'auto' as const, leadUserId: exactTokenSet[0].user_id, reason: 'token_set_exact', candidates: exactTokenSet }
  if (exactTokenSet.length > 1) return { status: 'unresolved' as const, leadUserId: null, reason: 'token_set_ambiguous', candidates: exactTokenSet }

  if (importedTokens.length === 1) {
    const t = importedTokens[0]
    const singleToken = promotors.filter((p) => p.firstToken === t || p.lastToken === t)
    if (singleToken.length === 1) return { status: 'auto' as const, leadUserId: singleToken[0].user_id, reason: 'single_token_unique', candidates: singleToken }
    if (singleToken.length > 1) return { status: 'unresolved' as const, leadUserId: null, reason: 'single_token_ambiguous', candidates: singleToken }
  }

  const prefixContains = promotors.filter((p) =>
    importedTokens.every((it) => p.tokens.some((pt) => pt.startsWith(it) || it.startsWith(pt)))
  )
  if (prefixContains.length === 1 && importedTokens.length >= 2) {
    return { status: 'auto' as const, leadUserId: prefixContains[0].user_id, reason: 'prefix_contains_unique', candidates: prefixContains }
  }
  if (prefixContains.length > 0) {
    return { status: 'unresolved' as const, leadUserId: null, reason: 'prefix_contains_ambiguous', candidates: prefixContains }
  }

  return { status: 'unresolved' as const, leadUserId: null, reason: 'no_match', candidates: [] as PromotorCandidate[] }
}

export async function POST() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const svc = createSupabaseServiceClient()

    const { data: assignments, error: assignmentsErr } = await svc
      .from('assignments')
      .select('id, status, import_promotor_name_raw')
      .not('import_promotor_name_raw', 'is', null)

    if (assignmentsErr) {
      if (/import_promotor_name_raw/i.test(String(assignmentsErr.message || ''))) {
        return NextResponse.json(
          { error: 'Column import_promotor_name_raw is missing. Please run the SQL migration first.' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: assignmentsErr.message }, { status: 500 })
    }

    const candidates = (assignments || [])
      .map((a: any) => ({
        id: String(a.id),
        status: String(a.status || ''),
        importedName: String(a.import_promotor_name_raw || '').trim(),
      }))
      .filter((a) => !!a.importedName)

    if (candidates.length === 0) {
      return NextResponse.json({
        scanned: 0,
        matched: 0,
        unresolved: 0,
        skippedWithLead: 0,
      })
    }

    const candidateAssignmentIds = candidates.map((a) => a.id)
    const { data: existingLeads } = await svc
      .from('assignment_participants')
      .select('assignment_id')
      .in('assignment_id', candidateAssignmentIds)
      .eq('role', 'lead')

    const hasLeadSet = new Set((existingLeads || []).map((row: any) => String(row.assignment_id)))
    const promotors = await loadPromotorCandidates(svc)

    const matchedRows: Array<{ assignmentId: string; userId: string }> = []
    const unresolvedByReason: Record<string, number> = {}
    let skippedWithLead = 0

    for (const row of candidates) {
      if (hasLeadSet.has(row.id)) {
        skippedWithLead += 1
        continue
      }

      const match = resolvePromotorMatch(row.importedName, promotors)
      if (match.status === 'auto' && match.leadUserId) {
        matchedRows.push({ assignmentId: row.id, userId: match.leadUserId })
      } else {
        const reason = String(match.reason || 'unresolved')
        unresolvedByReason[reason] = (unresolvedByReason[reason] || 0) + 1
      }
    }

    if (matchedRows.length > 0) {
      const participantRows = matchedRows.map((row) => ({
        assignment_id: row.assignmentId,
        user_id: row.userId,
        role: 'lead',
        chosen_by_admin: true,
        chosen_at: new Date().toISOString(),
      }))
      const { error: participantErr } = await svc
        .from('assignment_participants')
        .upsert(participantRows)
      if (participantErr) return NextResponse.json({ error: participantErr.message }, { status: 500 })

      const assignmentIds = matchedRows.map((row) => row.assignmentId)
      const { error: updateErr } = await svc
        .from('assignments')
        .update({
          status: 'assigned',
          import_promotor_name_raw: null,
        })
        .in('id', assignmentIds)
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    const unresolvedCount = Object.values(unresolvedByReason).reduce((sum, n) => sum + n, 0)
    return NextResponse.json({
      scanned: candidates.length,
      matched: matchedRows.length,
      unresolved: unresolvedCount,
      skippedWithLead,
      unresolvedByReason,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

