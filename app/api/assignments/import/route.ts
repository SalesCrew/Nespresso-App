import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { computeBestMarket, normalizeForMatch } from '@/lib/matchers/marketMatcher'

export const runtime = 'nodejs'

type EpInternMode = 'ep_intern_preview' | 'ep_intern_commit' | 'ep_intern_update_preview' | 'ep_intern_update_commit'
type EpInternMapping = {
  addressCol: string
  plzCol: string
  dateCol: string
  startCol: string
  endCol: string
  promotorCol?: string | null
}

type PromotorCandidate = {
  user_id: string
  name: string
  normalized: string
  tokens: string[]
  firstToken: string
  lastToken: string
}

type ParsedImportRow = {
  rowKey: string
  rowNumber: number
  address: string
  plz: string
  region: string
  start_ts: string
  end_ts: string
  promotor_name_raw: string | null
  lead_user_id: string | null
  match_reason: string | null
}

type ExistingAssignmentForUpdate = {
  id: string
  location_text: string | null
  postal_code: string | null
  city: string | null
  region: string | null
  start_ts: string
  end_ts: string
  type: string | null
  status: string | null
  matched_market_id: string | null
  lead_user_id: string | null
}

const ASSIGNMENT_PAGE_SIZE = 1000
const IN_CLAUSE_CHUNK_SIZE = 500
const UPDATE_TIME_TOLERANCE_MINUTES = 15

function normalizePersonName(input: string): string {
  return normalizeForMatch(String(input || '').replace(/ß/gi, 'ss'))
}

function colLetterToIndex(col: string): number | null {
  const c = String(col || '').trim().toUpperCase()
  if (!/^[A-Z]+$/.test(c)) return null
  let n = 0
  for (let i = 0; i < c.length; i++) {
    n = n * 26 + (c.charCodeAt(i) - 64)
  }
  return n - 1
}

function excelSerialToDate(serial: number): Date {
  const excelEpoch = new Date(Date.UTC(1899, 11, 30, 0, 0, 0, 0))
  return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000)
}

function parseDateParts(value: any): { year: number; month: number; day: number } | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { year: value.getFullYear(), month: value.getMonth() + 1, day: value.getDate() }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const asDate = excelSerialToDate(value)
    if (!Number.isNaN(asDate.getTime())) {
      return { year: asDate.getUTCFullYear(), month: asDate.getUTCMonth() + 1, day: asDate.getUTCDate() }
    }
  }

  const s = String(value).trim()
  if (!s) return null

  let m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    let year = Number(m[3])
    if (year < 100) year += 2000
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day }
  }

  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) {
    const year = Number(m[1])
    const month = Number(m[2])
    const day = Number(m[3])
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day }
  }

  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-]?$/)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2])
    const year = new Date().getFullYear()
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { year, month, day }
  }

  const fallback = new Date(s)
  if (!Number.isNaN(fallback.getTime())) {
    return { year: fallback.getFullYear(), month: fallback.getMonth() + 1, day: fallback.getDate() }
  }

  return null
}

function parseTimeParts(value: any): { hour: number; minute: number } | null {
  if (value == null || value === '') return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return { hour: value.getHours(), minute: value.getMinutes() }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const fractional = value % 1
    if (fractional > 0) {
      const totalMinutes = Math.round(fractional * 24 * 60)
      const hour = Math.floor(totalMinutes / 60) % 24
      const minute = totalMinutes % 60
      return { hour, minute }
    }
    if (value >= 0 && value <= 1) {
      const totalMinutes = Math.round(value * 24 * 60)
      const hour = Math.floor(totalMinutes / 60) % 24
      const minute = totalMinutes % 60
      return { hour, minute }
    }
  }

  const s = String(value).trim()
  if (!s) return null
  let m = s.match(/^(\d{1,2})[:.](\d{1,2})(?::\d{1,2})?$/)
  if (m) {
    const hour = Number(m[1])
    const minute = Number(m[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute }
  }

  const fallback = new Date(`1970-01-01T${s}`)
  if (!Number.isNaN(fallback.getTime())) {
    return { hour: fallback.getHours(), minute: fallback.getMinutes() }
  }

  return null
}

function buildUtcIso(dateParts: { year: number; month: number; day: number }, timeParts: { hour: number; minute: number }): string {
  return new Date(Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, timeParts.hour, timeParts.minute, 0, 0)).toISOString()
}

function getRegionFromPLZ(plzRaw: string): string {
  const plz = String(plzRaw || '').trim()
  const n = Number.parseInt(plz, 10)
  if (!Number.isFinite(n)) return ''

  if (n >= 1000 && n <= 3999) return 'W/NÖ/BGL'
  if (n >= 4000 && n <= 4999) return 'OÖ'
  if (n >= 5000 && n <= 5999) return 'S'
  if (n >= 6000 && n <= 6699) return 'T'
  if (n >= 6700 && n <= 6999) return 'V'
  if (n >= 7000 && n <= 7999) return 'W/NÖ/BGL'
  if (n >= 8000 && n <= 8999) return 'ST'
  if (n >= 9000 && n <= 9999) return 'K'
  return ''
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

function normalizeMapping(mapping: EpInternMapping) {
  return {
    addressCol: String(mapping.addressCol || '').trim().toUpperCase(),
    plzCol: String(mapping.plzCol || '').trim().toUpperCase(),
    dateCol: String(mapping.dateCol || '').trim().toUpperCase(),
    startCol: String(mapping.startCol || '').trim().toUpperCase(),
    endCol: String(mapping.endCol || '').trim().toUpperCase(),
    promotorCol: String(mapping.promotorCol || '').trim().toUpperCase(),
  }
}

function validateMapping(mapping: ReturnType<typeof normalizeMapping>): string | null {
  const required = [mapping.addressCol, mapping.plzCol, mapping.dateCol, mapping.startCol, mapping.endCol]
  if (required.some((c) => !c)) return 'mapping for address/plz/date/start/end required'
  const all = [mapping.addressCol, mapping.plzCol, mapping.dateCol, mapping.startCol, mapping.endCol, mapping.promotorCol].filter(Boolean)
  if (all.some((c) => !/^[A-Z]+$/.test(c))) return 'column letters must be like A, B, C, AA'
  return null
}

function parseEpInternRows(args: {
  sheetRows: any[][]
  mapping: EpInternMapping
  skipFirstRow: boolean
  promotors: PromotorCandidate[]
  resolutionOverrides?: Record<string, string>
}) {
  const { sheetRows, skipFirstRow, promotors } = args
  const mapping = normalizeMapping(args.mapping)
  const mappingErr = validateMapping(mapping)
  if (mappingErr) {
    return {
      parsedRows: [] as ParsedImportRow[],
      unresolvedPromotors: [] as any[],
      rowErrors: [{ rowKey: 'mapping', rowNumber: 0, message: mappingErr }],
    }
  }

  const addressIdx = colLetterToIndex(mapping.addressCol)!
  const plzIdx = colLetterToIndex(mapping.plzCol)!
  const dateIdx = colLetterToIndex(mapping.dateCol)!
  const startIdx = colLetterToIndex(mapping.startCol)!
  const endIdx = colLetterToIndex(mapping.endCol)!
  const promotorIdx = mapping.promotorCol ? colLetterToIndex(mapping.promotorCol) : null
  const startRow = skipFirstRow ? 1 : 0
  const overrides = args.resolutionOverrides || {}

  const parsedRows: ParsedImportRow[] = []
  const unresolvedPromotors: any[] = []
  const rowErrors: Array<{ rowKey: string; rowNumber: number; message: string }> = []

  for (let r = startRow; r < sheetRows.length; r++) {
    const row = Array.isArray(sheetRows[r]) ? sheetRows[r] : []
    const rowKey = `row_${r}`
    const rowNumber = r + 1

    const addressRaw = String(row[addressIdx] ?? '').trim()
    const plzRaw = String(row[plzIdx] ?? '').trim()
    const dateRaw = row[dateIdx]
    const startRaw = row[startIdx]
    const endRaw = row[endIdx]
    const promotorRaw = promotorIdx != null ? String(row[promotorIdx] ?? '').trim() : ''

    const rowLooksEmpty = !addressRaw && !plzRaw && (dateRaw == null || String(dateRaw).trim() === '') && (startRaw == null || String(startRaw).trim() === '') && (endRaw == null || String(endRaw).trim() === '')
    if (rowLooksEmpty) continue

    if (!addressRaw || !plzRaw || (dateRaw == null || String(dateRaw).trim() === '') || (startRaw == null || String(startRaw).trim() === '') || (endRaw == null || String(endRaw).trim() === '')) {
      rowErrors.push({ rowKey, rowNumber, message: 'Pflichtfelder fehlen (Adresse, PLZ, Datum, Startzeit, Endzeit).' })
      continue
    }

    const dateParts = parseDateParts(dateRaw)
    if (!dateParts) {
      rowErrors.push({ rowKey, rowNumber, message: `Datum konnte nicht gelesen werden: "${String(dateRaw)}"` })
      continue
    }
    const startTime = parseTimeParts(startRaw)
    const endTime = parseTimeParts(endRaw)
    if (!startTime || !endTime) {
      rowErrors.push({ rowKey, rowNumber, message: `Start- oder Endzeit ungültig: "${String(startRaw)}" / "${String(endRaw)}"` })
      continue
    }

    const startTs = buildUtcIso(dateParts, startTime)
    const endTs = buildUtcIso(dateParts, endTime)
    if (new Date(endTs).getTime() <= new Date(startTs).getTime()) {
      rowErrors.push({ rowKey, rowNumber, message: 'Endzeit muss nach Startzeit liegen.' })
      continue
    }

    const match = resolvePromotorMatch(promotorRaw, promotors)
    let leadUserId: string | null = match.leadUserId
    let matchReason: string | null = match.reason

    if (!leadUserId && promotorRaw) {
      const override = String(overrides[rowKey] ?? '').trim()
      if (override && override !== '__none__') {
        leadUserId = override
        matchReason = 'manual_override'
      } else if (override === '__none__') {
        leadUserId = null
        matchReason = 'manual_none'
      }
    }

    parsedRows.push({
      rowKey,
      rowNumber,
      address: addressRaw,
      plz: plzRaw,
      region: getRegionFromPLZ(plzRaw),
      start_ts: startTs,
      end_ts: endTs,
      promotor_name_raw: promotorRaw || null,
      lead_user_id: leadUserId,
      match_reason: matchReason,
    })

    if (!leadUserId && promotorRaw) {
      unresolvedPromotors.push({
        rowKey,
        rowNumber,
        importedName: promotorRaw,
        address: addressRaw,
        plz: plzRaw,
        start_ts: startTs,
        end_ts: endTs,
        reason: match.reason || 'unresolved',
        candidatePromotors: (match.candidates || []).slice(0, 15).map((c) => ({ user_id: c.user_id, name: c.name })),
      })
    }
  }

  return { parsedRows, unresolvedPromotors, rowErrors }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function dayKeyFromIso(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
  return d.toISOString().slice(0, 10)
}

function minutesFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function timesMatchWithinTolerance(existing: ExistingAssignmentForUpdate, imported: ParsedImportRow): boolean {
  const existingStart = minutesFromIso(existing.start_ts)
  const existingEnd = minutesFromIso(existing.end_ts)
  const importedStart = minutesFromIso(imported.start_ts)
  const importedEnd = minutesFromIso(imported.end_ts)
  if (existingStart == null || existingEnd == null || importedStart == null || importedEnd == null) {
    return String(existing.start_ts || '') === String(imported.start_ts || '') && String(existing.end_ts || '') === String(imported.end_ts || '')
  }
  return (
    Math.abs(existingStart - importedStart) <= UPDATE_TIME_TOLERANCE_MINUTES &&
    Math.abs(existingEnd - importedEnd) <= UPDATE_TIME_TOLERANCE_MINUTES
  )
}

function compactMatchKey(value: string): string {
  return normalizeForMatch(value).replace(/\s+/g, '')
}

function assignmentLocationFingerprint(parts: { location_text?: string | null; postal_code?: string | null; city?: string | null }): string {
  return compactMatchKey(
    [
      String(parts.location_text || '').trim(),
      String(parts.postal_code || '').trim(),
    ]
      .filter(Boolean)
      .join(' ')
  )
}

function parsedRowLocationFingerprint(row: ParsedImportRow): string {
  return assignmentLocationFingerprint({
    location_text: row.address,
    postal_code: row.plz,
    city: null,
  })
}

function importRowDuplicateKey(row: ParsedImportRow): string {
  return [
    dayKeyFromIso(row.start_ts),
    minutesFromIso(row.start_ts) ?? 'x',
    minutesFromIso(row.end_ts) ?? 'x',
    row.lead_user_id || 'no-promotor',
    parsedRowLocationFingerprint(row),
  ].join('|')
}

function buildEpInternInsertRow(row: ParsedImportRow, matchedMarketId?: string | null) {
  return {
    title: 'Promotion',
    description: null,
    location_text: row.address,
    postal_code: row.plz,
    city: null,
    region: row.region || null,
    start_ts: row.start_ts,
    end_ts: row.end_ts,
    type: 'promotion',
    status: row.lead_user_id ? 'assigned' : 'open',
    matched_market_id: matchedMarketId || null,
    // Only keep raw import name for rows that could not be matched to a system promotor.
    import_promotor_name_raw: row.lead_user_id ? null : (row.promotor_name_raw || null),
    metadata: {
      import_row_key: row.rowKey,
      import_promotor_name_raw: row.promotor_name_raw,
      import_match_reason: row.match_reason,
    },
  }
}

async function loadExistingAssignmentsForUpdate(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  parsedRows: ParsedImportRow[]
): Promise<ExistingAssignmentForUpdate[]> {
  const days = parsedRows.map((r) => dayKeyFromIso(r.start_ts)).filter(Boolean).sort()
  if (days.length === 0) return []

  const from = `${days[0]}T00:00:00.000Z`
  const to = `${days[days.length - 1]}T23:59:59.999Z`
  const assignments: any[] = []
  let offset = 0

  for (;;) {
    const { data, error } = await svc
      .from('assignments')
      .select('id, location_text, postal_code, city, region, start_ts, end_ts, type, status, matched_market_id')
      .gte('start_ts', from)
      .lte('start_ts', to)
      .order('start_ts', { ascending: true })
      .range(offset, offset + ASSIGNMENT_PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const pageRows = Array.isArray(data) ? data : []
    assignments.push(...pageRows)
    if (pageRows.length < ASSIGNMENT_PAGE_SIZE) break
    offset += ASSIGNMENT_PAGE_SIZE
  }

  const leadByAssignmentId = new Map<string, string | null>()
  const ids = assignments.map((a) => String(a.id)).filter(Boolean)
  for (const chunk of chunkArray(ids, IN_CLAUSE_CHUNK_SIZE)) {
    const { data, error } = await svc
      .from('assignment_participants')
      .select('assignment_id, user_id, role')
      .in('assignment_id', chunk)
      .eq('role', 'lead')

    if (error) throw new Error(error.message)
    for (const p of data || []) {
      const assignmentId = String((p as any).assignment_id || '')
      if (assignmentId && !leadByAssignmentId.has(assignmentId)) {
        leadByAssignmentId.set(assignmentId, String((p as any).user_id || '') || null)
      }
    }
  }

  return assignments.map((a) => ({
    id: String(a.id),
    location_text: a.location_text ?? null,
    postal_code: a.postal_code ?? null,
    city: a.city ?? null,
    region: a.region ?? null,
    start_ts: String(a.start_ts || ''),
    end_ts: String(a.end_ts || ''),
    type: a.type ?? null,
    status: a.status ?? null,
    matched_market_id: a.matched_market_id ?? null,
    lead_user_id: leadByAssignmentId.get(String(a.id)) ?? null,
  }))
}

async function loadMarketsForImport(svc: ReturnType<typeof createSupabaseServiceClient>): Promise<any[]> {
  const { data, error } = await svc
    .from('markets')
    .select('id, name, address, plz, city, acceptance_addresses')

  if (error) return []
  return Array.isArray(data) ? data : []
}

function resolveImportedMarketId(row: ParsedImportRow, markets: any[]): string | null {
  if (!Array.isArray(markets) || markets.length === 0) return null
  const plz = String(row.plz || '').trim()
  const byPlz = plz ? markets.filter((m) => String((m as any).plz || '').trim() === plz) : []
  if (byPlz.length === 1) return String(byPlz[0].id)

  const candidates = byPlz.length ? byPlz : markets
  const { market, score } = computeBestMarket(
    {
      id: row.rowKey,
      location_text: row.address,
      postal_code: row.plz,
      city: null,
    },
    candidates.map((m) => ({
      id: m.id,
      name: m.name,
      address: m.address,
      plz: m.plz,
      city: m.city,
      acceptance_addresses: m.acceptance_addresses,
    }))
  )

  return market && score >= 70 ? String(market.id) : null
}

type UpdateMatchScore = {
  assignment: ExistingAssignmentForUpdate
  score: number
  reason: string
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return String(a || '') === String(b || '')
  const ad = new Date(a)
  const bd = new Date(b)
  if (Number.isNaN(ad.getTime()) || Number.isNaN(bd.getTime())) return String(a) === String(b)
  return ad.getTime() === bd.getTime()
}

function scoreUpdateCandidate(imported: ParsedImportRow, candidate: ExistingAssignmentForUpdate): UpdateMatchScore | null {
  const locationSame = assignmentLocationFingerprint(candidate) === parsedRowLocationFingerprint(imported)
  const timeClose = timesMatchWithinTolerance(candidate, imported)
  const timeExact = sameInstant(candidate.start_ts, imported.start_ts) && sameInstant(candidate.end_ts, imported.end_ts)
  const promotorSame = !!imported.lead_user_id && candidate.lead_user_id === imported.lead_user_id

  const evidenceCount = [locationSame, timeClose, promotorSame].filter(Boolean).length
  if (evidenceCount < 2) return null
  if (!imported.lead_user_id && !(locationSame && timeClose)) return null

  let score = 0
  const reasonParts: string[] = []
  if (locationSame) {
    score += 70
    reasonParts.push('market')
  }
  if (timeClose) {
    score += 50
    reasonParts.push(timeExact ? 'time_exact' : 'time_close')
  }
  if (promotorSame) {
    score += 45
    reasonParts.push('promotor')
  }
  if (timeExact) score += 5
  if (imported.lead_user_id && !candidate.lead_user_id && locationSame && timeClose) score += 10

  return {
    assignment: candidate,
    score,
    reason: reasonParts.join('_'),
  }
}

function findUpdateMatch(
  imported: ParsedImportRow,
  candidatesForDay: ExistingAssignmentForUpdate[],
  usedAssignmentIds: Set<string>
):
  | { assignment: ExistingAssignmentForUpdate; reason: string; score: number }
  | { ambiguous: true; reason: string; candidates: ExistingAssignmentForUpdate[] }
  | null {
  const available = candidatesForDay.filter((a) => !usedAssignmentIds.has(a.id))
  const scored = available
    .map((candidate) => scoreUpdateCandidate(imported, candidate))
    .filter(Boolean) as UpdateMatchScore[]

  if (scored.length === 0) {
    const usedMatches = candidatesForDay
      .filter((a) => usedAssignmentIds.has(a.id))
      .map((candidate) => scoreUpdateCandidate(imported, candidate))
      .filter(Boolean) as UpdateMatchScore[]

    if (usedMatches.length > 0) {
      return {
        ambiguous: true,
        reason: 'duplicate_import_row_matches_used_assignment',
        candidates: usedMatches.map((m) => m.assignment),
      }
    }
    return null
  }

  scored.sort((a, b) => b.score - a.score || String(a.assignment.id).localeCompare(String(b.assignment.id)))
  const best = scored[0]
  const tiedBest = scored.filter((candidate) => candidate.score === best.score)
  if (tiedBest.length > 1) {
    return {
      ambiguous: true,
      reason: `multiple_update_candidates_${best.reason || 'same_score'}`,
      candidates: tiedBest.map((m) => m.assignment),
    }
  }

  return { assignment: best.assignment, reason: best.reason, score: best.score }
}

async function setLeadParticipant(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  assignmentId: string,
  userId: string
) {
  const { error: upsertErr } = await svc
    .from('assignment_participants')
    .upsert({
      assignment_id: assignmentId,
      user_id: userId,
      role: 'lead',
      chosen_by_admin: true,
      chosen_at: new Date().toISOString(),
    })

  if (upsertErr) throw new Error(upsertErr.message)

  const { error: deleteErr } = await svc
    .from('assignment_participants')
    .delete()
    .eq('assignment_id', assignmentId)
    .eq('role', 'lead')
    .neq('user_id', userId)

  if (deleteErr) throw new Error(deleteErr.message)
}

async function insertParsedAssignmentRows(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  rows: ParsedImportRow[],
  markets?: any[]
) {
  const insertPayload = rows.map((r) => buildEpInternInsertRow(r, markets ? resolveImportedMarketId(r, markets) : undefined))

  if (insertPayload.length === 0) {
    return { insertedRows: [] as any[], participantRows: [] as any[] }
  }

  let { data: insertedRows, error: insertErr } = await svc
    .from('assignments')
    .insert(insertPayload)
    .select('id, metadata')

  // Safety: allow deployment before DB migrations by retrying without newer columns.
  if (insertErr && /(import_promotor_name_raw|matched_market_id)/i.test(String(insertErr.message || ''))) {
    const fallbackPayload = insertPayload.map((row) => {
      const { import_promotor_name_raw, matched_market_id, ...rest } = row as any
      return rest
    })
    const retry = await svc
      .from('assignments')
      .insert(fallbackPayload)
      .select('id, metadata')
    insertedRows = retry.data
    insertErr = retry.error
  }

  if (insertErr) throw new Error(insertErr.message)

  const assignmentIdByRowKey = new Map<string, string>()
  for (const row of insertedRows || []) {
    const rowKey = String((row as any)?.metadata?.import_row_key || '')
    if (rowKey) assignmentIdByRowKey.set(rowKey, String((row as any).id))
  }

  const participantRows = rows
    .filter((r) => !!r.lead_user_id)
    .map((r) => {
      const assignmentId = assignmentIdByRowKey.get(r.rowKey)
      if (!assignmentId) return null
      return {
        assignment_id: assignmentId,
        user_id: r.lead_user_id!,
        role: 'lead',
        chosen_by_admin: true,
        chosen_at: new Date().toISOString(),
      }
    })
    .filter(Boolean) as Array<any>

  if (participantRows.length > 0) {
    const { error: participantErr } = await svc
      .from('assignment_participants')
      .upsert(participantRows)
    if (participantErr) throw new Error(participantErr.message)
  }

  return { insertedRows: insertedRows || [], participantRows }
}

async function runEpInternUpdateImport(
  svc: ReturnType<typeof createSupabaseServiceClient>,
  parsed: ReturnType<typeof parseEpInternRows>
) {
  const existingRows = await loadExistingAssignmentsForUpdate(svc, parsed.parsedRows)
  const markets = await loadMarketsForImport(svc)
  const existingByDay = new Map<string, ExistingAssignmentForUpdate[]>()
  for (const row of existingRows) {
    const day = dayKeyFromIso(row.start_ts)
    if (!day) continue
    const bucket = existingByDay.get(day) || []
    bucket.push(row)
    existingByDay.set(day, bucket)
  }

  const usedAssignmentIds = new Set<string>()
  const seenImportKeys = new Set<string>()
  const rowsToInsert: ParsedImportRow[] = []
  const skippedRows: Array<{ rowKey: string; rowNumber: number; message: string }> = []
  let updated = 0
  let unchanged = 0
  let ambiguous = 0
  let duplicateInput = 0
  let marketUpdated = 0
  let timeUpdated = 0
  let promotorUpdated = 0

  for (const row of parsed.parsedRows) {
    const duplicateKey = importRowDuplicateKey(row)
    if (seenImportKeys.has(duplicateKey)) {
      duplicateInput += 1
      skippedRows.push({ rowKey: row.rowKey, rowNumber: row.rowNumber, message: 'Doppelte Import-Zeile erkannt; keine zweite Anlage erzeugt.' })
      continue
    }
    seenImportKeys.add(duplicateKey)

    const candidatesForDay = existingByDay.get(dayKeyFromIso(row.start_ts)) || []
    const match = findUpdateMatch(row, candidatesForDay, usedAssignmentIds)

    if (match && 'ambiguous' in match) {
      ambiguous += 1
      skippedRows.push({
        rowKey: row.rowKey,
        rowNumber: row.rowNumber,
        message: `Nicht eindeutig (${match.reason}); keine Anlage erzeugt oder geÃ¤ndert.`,
      })
      continue
    }

    if (match && 'assignment' in match) {
      usedAssignmentIds.add(match.assignment.id)
      const assignmentUpdates: Record<string, any> = {}
      const locationChanged = assignmentLocationFingerprint(match.assignment) !== parsedRowLocationFingerprint(row)
      const postalChanged = String(match.assignment.postal_code || '').trim() !== String(row.plz || '').trim()
      const regionChanged = String(match.assignment.region || '').trim() !== String(row.region || '').trim()
      const timeChanged = !sameInstant(match.assignment.start_ts, row.start_ts) || !sameInstant(match.assignment.end_ts, row.end_ts)
      const promotorChanged = !!row.lead_user_id && match.assignment.lead_user_id !== row.lead_user_id
      const matchedMarketId = resolveImportedMarketId(row, markets)

      if (locationChanged || postalChanged) {
        assignmentUpdates.location_text = row.address
        assignmentUpdates.postal_code = row.plz
        assignmentUpdates.city = null
        assignmentUpdates.matched_market_id = matchedMarketId
      } else if (matchedMarketId && matchedMarketId !== match.assignment.matched_market_id) {
        assignmentUpdates.matched_market_id = matchedMarketId
      }

      if (regionChanged) {
        assignmentUpdates.region = row.region || null
      }

      if (timeChanged) {
        assignmentUpdates.start_ts = row.start_ts
        assignmentUpdates.end_ts = row.end_ts
      }

      if (promotorChanged) {
        if (!match.assignment.status || match.assignment.status === 'open') {
          assignmentUpdates.status = 'assigned'
        }
        assignmentUpdates.import_promotor_name_raw = null
      }

      const hasAssignmentUpdates = Object.keys(assignmentUpdates).length > 0
      if (!hasAssignmentUpdates && !promotorChanged) {
        unchanged += 1
        continue
      }

      if (hasAssignmentUpdates) {
        const { error } = await svc
          .from('assignments')
          .update(assignmentUpdates)
          .eq('id', match.assignment.id)

        if (error) throw new Error(error.message)
      }

      if (promotorChanged && row.lead_user_id) {
        await setLeadParticipant(svc, match.assignment.id, row.lead_user_id)
      }

      if (locationChanged || postalChanged || assignmentUpdates.matched_market_id !== undefined) marketUpdated += 1
      if (timeChanged) timeUpdated += 1
      if (promotorChanged) promotorUpdated += 1
      updated += 1
      continue
    }

    rowsToInsert.push(row)
  }

  const { insertedRows, participantRows } = await insertParsedAssignmentRows(svc, rowsToInsert, markets)
  const insertedCount = insertedRows.length
  const assignedCount = participantRows.length

  return {
    inserted: insertedCount,
    assigned: assignedCount,
    open: Math.max(0, insertedCount - assignedCount),
    updated,
    unchanged,
    ambiguous,
    duplicateInput,
    marketUpdated,
    timeUpdated,
    promotorUpdated,
    skipped: parsed.rowErrors.length + skippedRows.length,
    rowErrors: [...parsed.rowErrors, ...skippedRows],
    unresolvedPromotors: parsed.unresolvedPromotors,
  }
}

export async function POST(req: Request) {
  try {
    const svc = createSupabaseServiceClient()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'invalid request body' }, { status: 400 })

    const mode = String(body.mode || '') as EpInternMode | ''
    if (
      mode === 'ep_intern_preview' ||
      mode === 'ep_intern_commit' ||
      mode === 'ep_intern_update_preview' ||
      mode === 'ep_intern_update_commit'
    ) {
      const sheetRows = Array.isArray(body.sheetRows) ? body.sheetRows : null
      const mapping = body.mapping as EpInternMapping | undefined
      const skipFirstRow = Boolean(body.skipFirstRow)
      const resolutionOverrides = (body.resolutionOverrides && typeof body.resolutionOverrides === 'object')
        ? body.resolutionOverrides as Record<string, string>
        : {}

      if (!sheetRows || !mapping) {
        return NextResponse.json({ error: 'sheetRows and mapping are required' }, { status: 400 })
      }

      const promotors = await loadPromotorCandidates(svc)
      const parsed = parseEpInternRows({
        sheetRows,
        mapping,
        skipFirstRow,
        promotors,
        resolutionOverrides,
      })

      if (mode === 'ep_intern_preview' || mode === 'ep_intern_update_preview') {
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

      if (mode === 'ep_intern_update_commit') {
        const result = await runEpInternUpdateImport(svc, parsed)
        return NextResponse.json(result)
      }

      const { insertedRows, participantRows } = await insertParsedAssignmentRows(svc, parsed.parsedRows)
      const insertedCount = insertedRows.length
      const assignedCount = participantRows.length

      return NextResponse.json({
        inserted: insertedCount,
        assigned: assignedCount,
        open: Math.max(0, insertedCount - assignedCount),
        skipped: parsed.rowErrors.length,
        rowErrors: parsed.rowErrors,
        unresolvedPromotors: parsed.unresolvedPromotors,
      })
    }

    // Legacy generic rows import (used by Roh flow)
    if (!Array.isArray(body.rows)) {
      return NextResponse.json({ error: 'rows array required' }, { status: 400 })
    }
    const rows = body.rows as Array<any>
    const mapped = rows.map(r => ({
      title: r.title || null,
      description: r.description || null,
      location_text: r.location_text || r.location || null,
      postal_code: r.postal_code || r.plz || null,
      city: r.city || null,
      region: r.region || null,
      start_ts: r.start_ts,
      end_ts: r.end_ts || r.start_ts,
      type: r.type || 'promotion',
      status: 'open'
    }))
    const { data, error } = await svc.from('assignments').insert(mapped).select('id')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inserted: data?.length ?? 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}


