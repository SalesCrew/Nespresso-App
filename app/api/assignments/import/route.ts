import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { normalizeForMatch } from '@/lib/matchers/marketMatcher'

export const runtime = 'nodejs'

type EpInternMode = 'ep_intern_preview' | 'ep_intern_commit'
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

export async function POST(req: Request) {
  try {
    const svc = createSupabaseServiceClient()
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'invalid request body' }, { status: 400 })

    const mode = String(body.mode || '') as EpInternMode | ''
    if (mode === 'ep_intern_preview' || mode === 'ep_intern_commit') {
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

      if (mode === 'ep_intern_preview') {
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

      const insertPayload = parsed.parsedRows.map((r) => ({
        title: 'Promotion',
        description: null,
        location_text: r.address,
        postal_code: r.plz,
        city: null,
        region: r.region || null,
        start_ts: r.start_ts,
        end_ts: r.end_ts,
        type: 'promotion',
        status: r.lead_user_id ? 'assigned' : 'open',
        metadata: {
          import_row_key: r.rowKey,
          import_promotor_name_raw: r.promotor_name_raw,
          import_match_reason: r.match_reason,
        },
      }))

      if (insertPayload.length === 0) {
        return NextResponse.json({
          inserted: 0,
          assigned: 0,
          open: 0,
          skipped: parsed.rowErrors.length,
          rowErrors: parsed.rowErrors,
          unresolvedPromotors: parsed.unresolvedPromotors,
        })
      }

      const { data: insertedRows, error: insertErr } = await svc
        .from('assignments')
        .insert(insertPayload)
        .select('id, metadata')
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

      const assignmentIdByRowKey = new Map<string, string>()
      for (const row of insertedRows || []) {
        const rowKey = String((row as any)?.metadata?.import_row_key || '')
        if (rowKey) assignmentIdByRowKey.set(rowKey, String((row as any).id))
      }

      const participantRows = parsed.parsedRows
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
        if (participantErr) return NextResponse.json({ error: participantErr.message }, { status: 500 })
      }

      const insertedCount = insertedRows?.length ?? 0
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


