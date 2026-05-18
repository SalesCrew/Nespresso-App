import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/supabase/queries'
import { normalizeForMatch } from '@/lib/matchers/marketMatcher'

export const runtime = 'nodejs'

const PAGE_SIZE = 1000

type ApiMode = 'sync_import' | 'set_selection' | 'rematch_unmatched'

type PromotorCandidate = {
  user_id: string
  name: string
  normalized: string
  tokens: string[]
  firstToken: string
  lastToken: string
}

type PersistRowInput = {
  importedName: string
  rowNumber?: number | null
  sourceFileName?: string | null
  selectedUserId?: string | null
  matchReason?: string | null
}

function normalizePersonName(input: string): string {
  return normalizeForMatch(String(input || '').replace(/ß/gi, 'ss'))
}

function tokenSetKey(tokens: string[]): string {
  return [...new Set(tokens)].sort().join('|')
}

async function loadPromotorCandidates(svc: ReturnType<typeof createSupabaseServiceClient>): Promise<PromotorCandidate[]> {
  const { data: users } = await svc
    .from('user_profiles')
    .select('user_id, display_name')
    .eq('role', 'promotor')

  return (users || [])
    .map((u: any) => {
      const name = String(u?.display_name || '').trim()
      const normalized = normalizePersonName(name)
      const tokens = normalized.split(' ').filter(Boolean)
      return {
        user_id: String(u?.user_id || ''),
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
      userId: null as string | null,
      reason: null as string | null,
      candidates: [] as PromotorCandidate[],
    }
  }

  const normalizedImported = normalizePersonName(importedName)
  const importedTokens = normalizedImported.split(' ').filter(Boolean)
  if (!normalizedImported || importedTokens.length === 0) {
    return { userId: null, reason: 'unreadable_name', candidates: [] as PromotorCandidate[] }
  }

  const exactFull = promotors.filter((p) => p.normalized === normalizedImported)
  if (exactFull.length === 1) return { userId: exactFull[0].user_id, reason: 'exact_full', candidates: exactFull }
  if (exactFull.length > 1) return { userId: null, reason: 'exact_full_ambiguous', candidates: exactFull }

  const importedSet = tokenSetKey(importedTokens)
  const exactTokenSet = promotors.filter((p) => tokenSetKey(p.tokens) === importedSet)
  if (exactTokenSet.length === 1) return { userId: exactTokenSet[0].user_id, reason: 'token_set_exact', candidates: exactTokenSet }
  if (exactTokenSet.length > 1) return { userId: null, reason: 'token_set_ambiguous', candidates: exactTokenSet }

  if (importedTokens.length === 1) {
    const t = importedTokens[0]
    const singleToken = promotors.filter((p) => p.firstToken === t || p.lastToken === t)
    if (singleToken.length === 1) return { userId: singleToken[0].user_id, reason: 'single_token_unique', candidates: singleToken }
    if (singleToken.length > 1) return { userId: null, reason: 'single_token_ambiguous', candidates: singleToken }
  }

  const prefixContains = promotors.filter((p) =>
    importedTokens.every((it) => p.tokens.some((pt) => pt.startsWith(it) || it.startsWith(pt)))
  )
  if (prefixContains.length === 1 && importedTokens.length >= 2) {
    return { userId: prefixContains[0].user_id, reason: 'prefix_contains_unique', candidates: prefixContains }
  }
  if (prefixContains.length > 0) {
    return { userId: null, reason: 'prefix_contains_ambiguous', candidates: prefixContains }
  }

  return { userId: null, reason: 'no_match', candidates: [] as PromotorCandidate[] }
}

async function listEntries(svc: ReturnType<typeof createSupabaseServiceClient>) {
  const out: any[] = []
  let offset = 0
  for (;;) {
    const { data, error } = await svc
      .from('anmeldestatus_entries')
      .select('imported_name, imported_name_normalized, matched_user_id, match_reason, source_file_name, source_row_number, last_imported_at, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    const rows = Array.isArray(data) ? data : []
    out.push(...rows)
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  const matchedIds = [...new Set(out.map((row) => String(row.matched_user_id || '')).filter(Boolean))]
  const profileById = new Map<string, string>()
  if (matchedIds.length > 0) {
    for (let i = 0; i < matchedIds.length; i += PAGE_SIZE) {
      const chunk = matchedIds.slice(i, i + PAGE_SIZE)
      const { data } = await svc
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', chunk)
      for (const p of data || []) {
        profileById.set(String((p as any).user_id), String((p as any).display_name || ''))
      }
    }
  }

  return out.map((row: any) => ({
    imported_name: String(row.imported_name || ''),
    imported_name_normalized: String(row.imported_name_normalized || ''),
    matched_user_id: row.matched_user_id ? String(row.matched_user_id) : null,
    matched_user_name: row.matched_user_id ? (profileById.get(String(row.matched_user_id)) || null) : null,
    match_reason: row.match_reason || null,
    source_file_name: row.source_file_name || null,
    source_row_number: Number(row.source_row_number || 0) || null,
    last_imported_at: row.last_imported_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }))
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.reason === 'unauthorized' ? 'unauthorized' : 'forbidden' },
        { status: auth.reason === 'unauthorized' ? 401 : 403 }
      )
    }

    const svc = createSupabaseServiceClient()
    const entries = await listEntries(svc)
    return NextResponse.json({ entries })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin()
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.reason === 'unauthorized' ? 'unauthorized' : 'forbidden' },
        { status: auth.reason === 'unauthorized' ? 401 : 403 }
      )
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
    }

    const mode = String((body as any).mode || '') as ApiMode | ''
    if (!['sync_import', 'set_selection', 'rematch_unmatched'].includes(mode)) {
      return NextResponse.json({ error: 'invalid mode' }, { status: 400 })
    }

    const svc = createSupabaseServiceClient()
    const nowIso = new Date().toISOString()

    if (mode === 'sync_import') {
      const rows = Array.isArray((body as any).rows) ? ((body as any).rows as PersistRowInput[]) : []
      const promotors = await loadPromotorCandidates(svc)
      const validPromotorIds = new Set(promotors.map((p) => p.user_id))

      const byNormalized = new Map<string, any>()
      for (const row of rows) {
        const importedName = String(row?.importedName || '').trim()
        if (!importedName) continue

        const normalized = normalizePersonName(importedName)
        if (!normalized) continue

        const requestedUserId = String(row?.selectedUserId || '').trim()
        const selectedUserId = requestedUserId && requestedUserId !== '__none__' && validPromotorIds.has(requestedUserId)
          ? requestedUserId
          : null
        const rowNumber = Number(row?.rowNumber || 0) || null
        const sourceFileName = String(row?.sourceFileName || '').trim() || null
        const requestedReason = String(row?.matchReason || '').trim() || null
        const matchReason = selectedUserId
          ? (requestedReason || 'import_sync')
          : (requestedReason || 'no_match')

        byNormalized.set(normalized, {
          imported_name: importedName,
          imported_name_normalized: normalized,
          matched_user_id: selectedUserId,
          match_reason: matchReason,
          source_file_name: sourceFileName,
          source_row_number: rowNumber,
          last_imported_at: nowIso,
          updated_at: nowIso,
        })
      }

      const payload = [...byNormalized.values()]
      if (payload.length > 0) {
        const { error } = await svc
          .from('anmeldestatus_entries')
          .upsert(payload, { onConflict: 'imported_name_normalized' })
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }
      }

      const entries = await listEntries(svc)
      return NextResponse.json({ saved: payload.length, entries })
    }

    if (mode === 'set_selection') {
      const importedName = String((body as any).importedName || '').trim()
      if (!importedName) {
        return NextResponse.json({ error: 'importedName is required' }, { status: 400 })
      }
      const normalized = normalizePersonName(importedName)
      if (!normalized) {
        return NextResponse.json({ error: 'invalid importedName' }, { status: 400 })
      }

      const requestedUserId = String((body as any).selectedUserId || '').trim()
      let selectedUserId: string | null = null
      if (requestedUserId && requestedUserId !== '__none__') {
        const { data: profile, error } = await svc
          .from('user_profiles')
          .select('user_id')
          .eq('user_id', requestedUserId)
          .eq('role', 'promotor')
          .maybeSingle()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!profile?.user_id) {
          return NextResponse.json({ error: 'selectedUserId is not a valid promotor' }, { status: 400 })
        }
        selectedUserId = String(profile.user_id)
      }

      const { error } = await svc
        .from('anmeldestatus_entries')
        .upsert({
          imported_name: importedName,
          imported_name_normalized: normalized,
          matched_user_id: selectedUserId,
          match_reason: selectedUserId ? 'manual_override' : 'manual_none',
          last_imported_at: nowIso,
          updated_at: nowIso,
        }, { onConflict: 'imported_name_normalized' })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const entries = await listEntries(svc)
      return NextResponse.json({ ok: true, entries })
    }

    // rematch_unmatched
    const promotors = await loadPromotorCandidates(svc)
    const unresolvedRows: any[] = []
    let unresolvedOffset = 0
    for (;;) {
      const { data, error } = await svc
        .from('anmeldestatus_entries')
        .select('imported_name, imported_name_normalized, source_file_name, source_row_number')
        .is('matched_user_id', null)
        .range(unresolvedOffset, unresolvedOffset + PAGE_SIZE - 1)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const rows = Array.isArray(data) ? data : []
      unresolvedRows.push(...rows)
      if (rows.length < PAGE_SIZE) break
      unresolvedOffset += PAGE_SIZE
    }

    const updates: any[] = []
    for (const row of unresolvedRows) {
      const importedName = String(row?.imported_name || '').trim()
      if (!importedName) continue
      const match = resolvePromotorMatch(importedName, promotors)
      if (!match.userId) continue
      updates.push({
        imported_name: importedName,
        imported_name_normalized: String(row?.imported_name_normalized || normalizePersonName(importedName)),
        matched_user_id: match.userId,
        match_reason: `auto_rematch_${String(match.reason || 'match')}`,
        source_file_name: row?.source_file_name || null,
        source_row_number: Number(row?.source_row_number || 0) || null,
        updated_at: nowIso,
      })
    }

    if (updates.length > 0) {
      const { error } = await svc
        .from('anmeldestatus_entries')
        .upsert(updates, { onConflict: 'imported_name_normalized' })
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
    }

    const entries = await listEntries(svc)
    return NextResponse.json({ updated: updates.length, entries })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

