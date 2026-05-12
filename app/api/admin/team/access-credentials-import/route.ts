import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/supabase/queries'
import { normalizeForMatch } from '@/lib/matchers/marketMatcher'

export const runtime = 'nodejs'

type ImportMode = 'preview' | 'commit'
type AccessMapping = {
  fullNameCol: string
  huebnerEmailCol: string
  huebnerPasswordCol: string
  demotoolEmailCol: string
  demotoolPasswordCol: string
  tmaEmailCol: string
  tmaPasswordCol: string
  boostAppEmailCol: string
  boostAppPasswordCol: string
}

type PromotorCandidate = {
  user_id: string
  name: string
  normalized: string
  tokens: string[]
  firstToken: string
  lastToken: string
}

type ParsedAccessRow = {
  rowKey: string
  rowNumber: number
  full_name_raw: string
  user_id: string | null
  match_reason: string | null
  updates: Record<string, string>
}

function normalizePersonName(input: string): string {
  return normalizeForMatch(String(input || '').replace(/ß/gi, 'ss'))
}

function colLetterToIndex(col: string): number | null {
  const c = String(col || '').trim().toUpperCase()
  if (!/^[A-Z]+$/.test(c)) return null
  let n = 0
  for (let i = 0; i < c.length; i++) n = n * 26 + (c.charCodeAt(i) - 64)
  return n - 1
}

function tokenSetKey(tokens: string[]): string {
  return [...new Set(tokens)].sort().join('|')
}

async function loadPromotorCandidates(svc: ReturnType<typeof createSupabaseServiceClient>): Promise<PromotorCandidate[]> {
  const { data: users } = await svc
    .from('user_profiles')
    .select('user_id, display_name')
    .eq('role', 'promotor')

  const userRows = Array.isArray(users) ? users : []
  const userIds = userRows.map((u: any) => String(u.user_id)).filter(Boolean)

  const { data: profiles } = userIds.length > 0
    ? await svc
      .from('promotor_profiles')
      .select('user_id, application_id')
      .in('user_id', userIds)
    : ({ data: [] } as any)

  const appIds = (profiles || []).map((p: any) => p.application_id).filter(Boolean)
  const { data: applications } = appIds.length > 0
    ? await svc
      .from('applications')
      .select('id, full_name')
      .in('id', appIds)
    : ({ data: [] } as any)

  const profileByUser = new Map((profiles || []).map((p: any) => [String(p.user_id), p]))
  const appById = new Map((applications || []).map((a: any) => [String(a.id), a]))

  return userRows
    .map((u: any) => {
      const uid = String(u.user_id || '')
      const directName = String(u.display_name || '').trim()
      const profile = profileByUser.get(uid)
      const fallbackApp = profile?.application_id ? appById.get(String(profile.application_id)) : null
      const fallbackName = String(fallbackApp?.full_name || '').trim()
      const name = directName || fallbackName
      const normalized = normalizePersonName(name)
      const tokens = normalized.split(' ').filter(Boolean)
      return {
        user_id: uid,
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
      userId: null as string | null,
      reason: null as string | null,
      candidates: [] as PromotorCandidate[],
    }
  }

  const normalizedImported = normalizePersonName(importedName)
  const importedTokens = normalizedImported.split(' ').filter(Boolean)
  if (!normalizedImported || importedTokens.length === 0) {
    return { status: 'unresolved' as const, userId: null, reason: 'unreadable_name', candidates: [] as PromotorCandidate[] }
  }

  const exactFull = promotors.filter((p) => p.normalized === normalizedImported)
  if (exactFull.length === 1) return { status: 'auto' as const, userId: exactFull[0].user_id, reason: 'exact_full', candidates: exactFull }
  if (exactFull.length > 1) return { status: 'unresolved' as const, userId: null, reason: 'exact_full_ambiguous', candidates: exactFull }

  const importedSet = tokenSetKey(importedTokens)
  const exactTokenSet = promotors.filter((p) => tokenSetKey(p.tokens) === importedSet)
  if (exactTokenSet.length === 1) return { status: 'auto' as const, userId: exactTokenSet[0].user_id, reason: 'token_set_exact', candidates: exactTokenSet }
  if (exactTokenSet.length > 1) return { status: 'unresolved' as const, userId: null, reason: 'token_set_ambiguous', candidates: exactTokenSet }

  if (importedTokens.length === 1) {
    const t = importedTokens[0]
    const singleToken = promotors.filter((p) => p.firstToken === t || p.lastToken === t)
    if (singleToken.length === 1) return { status: 'auto' as const, userId: singleToken[0].user_id, reason: 'single_token_unique', candidates: singleToken }
    if (singleToken.length > 1) return { status: 'unresolved' as const, userId: null, reason: 'single_token_ambiguous', candidates: singleToken }
  }

  const prefixContains = promotors.filter((p) =>
    importedTokens.every((it) => p.tokens.some((pt) => pt.startsWith(it) || it.startsWith(pt)))
  )
  if (prefixContains.length === 1 && importedTokens.length >= 2) {
    return { status: 'auto' as const, userId: prefixContains[0].user_id, reason: 'prefix_contains_unique', candidates: prefixContains }
  }
  if (prefixContains.length > 0) {
    return { status: 'unresolved' as const, userId: null, reason: 'prefix_contains_ambiguous', candidates: prefixContains }
  }

  return { status: 'unresolved' as const, userId: null, reason: 'no_match', candidates: [] as PromotorCandidate[] }
}

function normalizeMapping(mapping: AccessMapping) {
  return {
    fullNameCol: String(mapping.fullNameCol || '').trim().toUpperCase(),
    huebnerEmailCol: String(mapping.huebnerEmailCol || '').trim().toUpperCase(),
    huebnerPasswordCol: String(mapping.huebnerPasswordCol || '').trim().toUpperCase(),
    demotoolEmailCol: String(mapping.demotoolEmailCol || '').trim().toUpperCase(),
    demotoolPasswordCol: String(mapping.demotoolPasswordCol || '').trim().toUpperCase(),
    tmaEmailCol: String(mapping.tmaEmailCol || '').trim().toUpperCase(),
    tmaPasswordCol: String(mapping.tmaPasswordCol || '').trim().toUpperCase(),
    boostAppEmailCol: String(mapping.boostAppEmailCol || '').trim().toUpperCase(),
    boostAppPasswordCol: String(mapping.boostAppPasswordCol || '').trim().toUpperCase(),
  }
}

function validateMapping(mapping: ReturnType<typeof normalizeMapping>): string | null {
  const values = Object.values(mapping)
  if (values.some((v) => !v)) return 'all mapping columns required'
  if (values.some((v) => !/^[A-Z]+$/.test(v))) return 'column letters must be like A, B, C, AA'
  if (new Set(values).size !== values.length) return 'column letters must be unique'
  return null
}

function parseRows(args: {
  sheetRows: any[][]
  mapping: AccessMapping
  skipFirstRow: boolean
  promotors: PromotorCandidate[]
  resolutionOverrides?: Record<string, string>
}) {
  const { sheetRows, skipFirstRow, promotors } = args
  const mapping = normalizeMapping(args.mapping)
  const mappingErr = validateMapping(mapping)
  if (mappingErr) {
    return {
      parsedRows: [] as ParsedAccessRow[],
      unresolvedPromotors: [] as any[],
      rowErrors: [{ rowKey: 'mapping', rowNumber: 0, message: mappingErr }],
    }
  }

  const idx = {
    fullName: colLetterToIndex(mapping.fullNameCol)!,
    huebnerEmail: colLetterToIndex(mapping.huebnerEmailCol)!,
    huebnerPassword: colLetterToIndex(mapping.huebnerPasswordCol)!,
    demotoolEmail: colLetterToIndex(mapping.demotoolEmailCol)!,
    demotoolPassword: colLetterToIndex(mapping.demotoolPasswordCol)!,
    tmaEmail: colLetterToIndex(mapping.tmaEmailCol)!,
    tmaPassword: colLetterToIndex(mapping.tmaPasswordCol)!,
    boostAppEmail: colLetterToIndex(mapping.boostAppEmailCol)!,
    boostAppPassword: colLetterToIndex(mapping.boostAppPasswordCol)!,
  }

  const startRow = skipFirstRow ? 1 : 0
  const overrides = args.resolutionOverrides || {}
  const promotorIdSet = new Set(promotors.map((p) => p.user_id))

  const parsedRows: ParsedAccessRow[] = []
  const unresolvedPromotors: any[] = []
  const rowErrors: Array<{ rowKey: string; rowNumber: number; message: string }> = []

  for (let r = startRow; r < sheetRows.length; r++) {
    const row = Array.isArray(sheetRows[r]) ? sheetRows[r] : []
    const rowKey = `row_${r}`
    const rowNumber = r + 1

    const fullNameRaw = String(row[idx.fullName] ?? '').trim()
    const huebnerEmail = String(row[idx.huebnerEmail] ?? '').trim()
    const huebnerPassword = String(row[idx.huebnerPassword] ?? '').trim()
    const demotoolEmail = String(row[idx.demotoolEmail] ?? '').trim()
    const demotoolPassword = String(row[idx.demotoolPassword] ?? '').trim()
    const tmaEmail = String(row[idx.tmaEmail] ?? '').trim()
    const tmaPassword = String(row[idx.tmaPassword] ?? '').trim()
    const boostAppEmail = String(row[idx.boostAppEmail] ?? '').trim()
    const boostAppPassword = String(row[idx.boostAppPassword] ?? '').trim()

    const rowLooksEmpty = !fullNameRaw && !huebnerEmail && !huebnerPassword && !demotoolEmail && !demotoolPassword && !tmaEmail && !tmaPassword && !boostAppEmail && !boostAppPassword
    if (rowLooksEmpty) continue

    if (!fullNameRaw) {
      rowErrors.push({ rowKey, rowNumber, message: 'Vollname fehlt.' })
      continue
    }

    const updates: Record<string, string> = {}
    if (huebnerEmail) updates.huebner_email = huebnerEmail
    if (huebnerPassword) updates.huebner_password = huebnerPassword
    if (demotoolEmail) updates.demotool_email = demotoolEmail
    if (demotoolPassword) updates.demotool_password = demotoolPassword
    if (tmaEmail) updates.tma_email = tmaEmail
    if (tmaPassword) updates.tma_password = tmaPassword
    if (boostAppEmail) updates.boost_app_email = boostAppEmail
    if (boostAppPassword) updates.boost_app_password = boostAppPassword

    if (Object.keys(updates).length === 0) {
      rowErrors.push({ rowKey, rowNumber, message: 'Keine Zugangsdaten in der Zeile gefunden.' })
      continue
    }

    const match = resolvePromotorMatch(fullNameRaw, promotors)
    let userId: string | null = match.userId
    let matchReason: string | null = match.reason

    if (!userId) {
      const override = String(overrides[rowKey] ?? '').trim()
      if (override && override !== '__none__') {
        if (promotorIdSet.has(override)) {
          userId = override
          matchReason = 'manual_override'
        } else {
          rowErrors.push({ rowKey, rowNumber, message: 'Ungültige Promotor-Auflösung übermittelt.' })
          continue
        }
      } else if (override === '__none__') {
        userId = null
        matchReason = 'manual_none'
      }
    }

    parsedRows.push({
      rowKey,
      rowNumber,
      full_name_raw: fullNameRaw,
      user_id: userId,
      match_reason: matchReason,
      updates,
    })

    if (!userId) {
      unresolvedPromotors.push({
        rowKey,
        rowNumber,
        importedName: fullNameRaw,
        reason: match.reason || 'unresolved',
        candidatePromotors: (match.candidates || []).slice(0, 15).map((c) => ({ user_id: c.user_id, name: c.name })),
      })
    }
  }

  return { parsedRows, unresolvedPromotors, rowErrors }
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
    if (!body) return NextResponse.json({ error: 'invalid request body' }, { status: 400 })

    const mode = String(body.mode || '') as ImportMode | ''
    if (mode !== 'preview' && mode !== 'commit') {
      return NextResponse.json({ error: 'mode must be preview or commit' }, { status: 400 })
    }

    const sheetRows = Array.isArray(body.sheetRows) ? body.sheetRows : null
    const mapping = body.mapping as AccessMapping | undefined
    const skipFirstRow = Boolean(body.skipFirstRow)
    const resolutionOverrides = (body.resolutionOverrides && typeof body.resolutionOverrides === 'object')
      ? (body.resolutionOverrides as Record<string, string>)
      : {}

    if (!sheetRows || !mapping) {
      return NextResponse.json({ error: 'sheetRows and mapping are required' }, { status: 400 })
    }

    const svc = createSupabaseServiceClient()
    const promotors = await loadPromotorCandidates(svc)
    const parsed = parseRows({
      sheetRows,
      mapping,
      skipFirstRow,
      promotors,
      resolutionOverrides,
    })

    if (mode === 'preview') {
      return NextResponse.json({
        parsedRows: parsed.parsedRows,
        unresolvedPromotors: parsed.unresolvedPromotors,
        rowErrors: parsed.rowErrors,
        summary: {
          parsedCount: parsed.parsedRows.length,
          unresolvedCount: parsed.unresolvedPromotors.length,
          errorCount: parsed.rowErrors.length,
        },
      })
    }

    const actionableRows = parsed.parsedRows.filter((r) => !!r.user_id && Object.keys(r.updates).length > 0)
    if (actionableRows.length === 0) {
      return NextResponse.json({
        updated: 0,
        updatedRows: 0,
        unresolved: parsed.unresolvedPromotors.length,
        skipped: parsed.rowErrors.length,
        rowErrors: parsed.rowErrors,
        unresolvedPromotors: parsed.unresolvedPromotors,
      })
    }

    const userIds = [...new Set(actionableRows.map((r) => String(r.user_id)))]
    const { data: existingRows } = await svc
      .from('access_credentials')
      .select('user_id')
      .in('user_id', userIds)
    const existingSet = new Set((existingRows || []).map((r: any) => String(r.user_id)))

    let updatedCount = 0
    const updatedUserIds = new Set<string>()
    for (const row of actionableRows) {
      const uid = String(row.user_id)
      if (!uid) continue

      if (existingSet.has(uid)) {
        const { error } = await svc
          .from('access_credentials')
          .update(row.updates)
          .eq('user_id', uid)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      } else {
        const { error } = await svc
          .from('access_credentials')
          .insert({ user_id: uid, ...row.updates })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        existingSet.add(uid)
      }
      updatedCount += 1
      updatedUserIds.add(uid)
    }

    return NextResponse.json({
      updated: updatedUserIds.size,
      updatedRows: updatedCount,
      unresolved: parsed.unresolvedPromotors.length,
      skipped: parsed.rowErrors.length,
      rowErrors: parsed.rowErrors,
      unresolvedPromotors: parsed.unresolvedPromotors,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
