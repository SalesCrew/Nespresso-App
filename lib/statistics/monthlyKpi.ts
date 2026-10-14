import XLSX from 'xlsx';

export type PremiumRates = {
  vl: number;
  vl_up: number;
  tma: number;
  gs: number;
  aeroccino: number;
};

export type SalesInput = {
  name: string;
  email: string;
  user_id?: string;
  einsatztage: number;
  mc: number;
  tma: number;
  gs: number;
  vl: number;
  vl_up: number;
  aeroccino: number;
  sourceRow: number;
};

export type PremiumInput = {
  name: string;
  user_id?: string;
  tma: number;
  gutscheine: number;
  vertuo: number;
  vertuo_pop: number;
  aeroccino: number;
  rates: PremiumRates;
  sourceRow: number;
};

const MONTHS: Record<string, number> = {
  januar: 1, jaenner: 1, janner: 1, jan: 1, februar: 2, feb: 2, maerz: 3, marz: 3, march: 3,
  april: 4, apr: 4, mai: 5, may: 5, juni: 6, jun: 6, juli: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, oct: 10,
  november: 11, nov: 11, dezember: 12, dez: 12, dec: 12,
};

export function normalizeName(value: unknown): string {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-AT').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function asNumber(value: unknown, label: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw;
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw new Error(`${label}: ungültige Zahl (${raw}).`);
  return number;
}

export function asCount(value: unknown, label: string): number {
  const number = asNumber(value, label);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${label}: eine ganze, nicht negative Zahl erwartet.`);
  return number;
}

export function validMonth(value: unknown): string {
  const month = String(value || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Monat muss im Format JJJJ-MM vorliegen.');
  return month;
}

export function monthFromSheet(sheetName: string, cellValue?: unknown, reportingYear?: number): string {
  if (cellValue instanceof Date && !Number.isNaN(cellValue.getTime())) {
    return `${cellValue.getUTCFullYear()}-${String(cellValue.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof cellValue === 'number') {
    const date = XLSX.SSF.parse_date_code(cellValue);
    if (date) return validMonth(`${date.y}-${String(date.m).padStart(2, '0')}`);
  }
  const textDate = String(cellValue || '');
  const iso = textDate.match(/^(\d{4})-(\d{2})/);
  if (iso) return validMonth(`${iso[1]}-${iso[2]}`);
  const germanDate = textDate.match(/^\d{1,2}\.(\d{1,2})\.(\d{4})$/);
  if (germanDate) return validMonth(`${germanDate[2]}-${germanDate[1].padStart(2,'0')}`);
  const normalizedCell = normalizeName(textDate);
  const named = normalizedCell.match(/^([a-z]+) (\d{4})$/);
  if (named && MONTHS[named[1]]) return validMonth(`${named[2]}-${String(MONTHS[named[1]]).padStart(2,'0')}`);
  const year = sheetName.match(/\b(20\d{2})\b/)?.[1] || reportingYear;
  if (MONTHS[normalizedCell] && year) return validMonth(`${year}-${String(MONTHS[normalizedCell]).padStart(2,'0')}`);
  if (textDate.trim()) throw new Error(`Ungültiger Berichtsmonat: ${textDate}. Bitte Monat und Jahr prüfen.`);
  const match = normalizeName(sheetName).match(/([a-z]+) (20\d{2})/);
  if (match && MONTHS[match[1]]) return `${match[2]}-${String(MONTHS[match[1]]).padStart(2, '0')}`;
  throw new Error('Monat weder im Blattnamen noch in der Liste erkannt.');
}

function firstSheet(workbook: XLSX.WorkBook): XLSX.WorkSheet {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Die Excel-Datei enthält kein Tabellenblatt.');
  return sheet;
}

function rowsOf(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: true });
}

function headerIndex(header: unknown[], name: string): number {
  const index = header.findIndex(value => normalizeName(value) === normalizeName(name));
  if (index < 0) throw new Error(`Spalte "${name}" fehlt.`);
  return index;
}

export function salesMetrics(row: Pick<SalesInput, 'einsatztage' | 'mc' | 'tma' | 'vl'>) {
  return {
    mc_et: row.einsatztage > 0 ? row.mc / row.einsatztage : 0,
    tap_quote: row.mc > 0 ? (row.tma / row.mc) * 100 : 0,
    vl_share: row.mc > 0 ? (row.vl / row.mc) * 100 : 0,
  };
}

export function calculatePremium(row: Pick<PremiumInput, 'tma' | 'gutscheine' | 'vertuo' | 'vertuo_pop' | 'aeroccino' | 'rates'>): number {
  const { rates } = row;
  const cents = Math.round(row.tma * rates.tma * 100) + Math.round(row.gutscheine * rates.gs * 100)
    + Math.round(row.vertuo * rates.vl * 100) + Math.round(row.vertuo_pop * rates.vl_up * 100)
    + Math.round(row.aeroccino * rates.aeroccino * 100);
  return cents / 100;
}

export type SalesColumn = 'name' | 'firstName' | 'lastName' | 'email' | 'month' | 'et' | 'mc' | 'tma' | 'gs' | 'vl' | 'vlUp' | 'aeroccino';
export type SalesColumnMap = Record<SalesColumn, number>;
export const salesColumnLabels: Record<SalesColumn, string> = {
  name: 'Coffee Advisor / vollständiger Name', firstName: 'Vorname', lastName: 'Nachname', email: 'Emailadresse',
  month: 'Monat', et: 'ET', mc: 'MC', tma: 'TMA', gs: 'GS', vl: 'VL', vlUp: 'VL Up / VL Pop+/UP', aeroccino: 'Aeroccino',
};
export function salesWorkbookColumns(workbook: XLSX.WorkBook): { headers: string[]; mapping: SalesColumnMap } {
  const header = rowsOf(firstSheet(workbook))[0] || [];
  const aliases: Record<SalesColumn, string[]> = {
    name: ['Coffee Advisor', 'Promotor', 'Name'], firstName: ['Vorname'], lastName: ['Nachname'],
    email: ['Emailadresse', 'E-Mail', 'Email'], month: ['Monat', 'Berichtsmonat'], et: ['ET', 'Einsatztage'],
    mc: ['MC'], tma: ['TMA', 'TAP'], gs: ['GS'], vl: ['VL'], vlUp: ['VL Up', 'VL Pop+/UP'], aeroccino: ['Aeroccino'],
  };
  const mapping = Object.fromEntries(Object.entries(aliases).map(([key, names]) =>
    [key, header.findIndex(value => names.some(name => normalizeName(value) === normalizeName(name)))])) as SalesColumnMap;
  return { headers: header.map((value, index) => String(value || `Spalte ${XLSX.utils.encode_col(index)}`)), mapping };
}
export function salesWorkbookMonths(workbook: XLSX.WorkBook, mapping: SalesColumnMap, reportingYear?: number): string[] {
  if (mapping.month < 0) throw new Error('Spalte "Monat" fehlt. Bitte zuordnen.');
  const months = rowsOf(firstSheet(workbook)).slice(1).filter(row => row.some(value => value != null && value !== ''))
    .filter(row => normalizeName(row[mapping.name >= 0 ? mapping.name : mapping.firstName]) !== 'summe')
    .map(row => monthFromSheet(workbook.SheetNames[0], row[mapping.month], reportingYear));
  return [...new Set(months)].sort();
}
export function parseSalesWorkbook(workbook: XLSX.WorkBook, reportingYear?: number,
  options: { mapping?: SalesColumnMap; month?: string } = {}): { waveMonth: string; rows: SalesInput[] } {
  const data = rowsOf(firstSheet(workbook));
  const indexes = options.mapping || salesWorkbookColumns(workbook).mapping;
  for (const field of ['email', 'month', 'et', 'mc', 'tma', 'gs', 'vl', 'vlUp', 'aeroccino'] as SalesColumn[]) {
    if (indexes[field] < 0 || indexes[field] >= (data[0] || []).length) throw new Error(`Spalte "${salesColumnLabels[field]}" fehlt.`);
  }
  const months = salesWorkbookMonths(workbook, indexes, reportingYear);
  const waveMonth = options.month ? validMonth(options.month) : months[0];
  if (!waveMonth || !months.includes(waveMonth)) throw new Error('Keine KPI-Zeilen für diesen Berichtsmonat gefunden.');
  if (!options.month && months.length > 1) throw new Error(`Liste: anderer Monat (${months.join(', ')}). Bitte einen Berichtsmonat auswählen.`);
  const rows: SalesInput[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] || [];
    const name = indexes.name >= 0 ? String(row[indexes.name] || '').trim()
      : [row[indexes.firstName], row[indexes.lastName]].filter(Boolean).join(' ').trim();
    const email = String(row[indexes.email] || '').trim();
    if ((!name && !email) || normalizeName(name) === 'summe') continue;
    const month = monthFromSheet(workbook.SheetNames[0], row[indexes.month], reportingYear);
    if (month !== waveMonth) continue;
    const einsatztage = asNumber(row[indexes.et], `Zeile ${i + 1} ET`);
    if (einsatztage < 0) throw new Error(`Zeile ${i + 1}: ET darf nicht negativ sein.`);
    rows.push({ name, email, einsatztage,
      mc: asCount(row[indexes.mc], `Zeile ${i + 1} MC`), tma: asCount(row[indexes.tma], `Zeile ${i + 1} TMA`),
      gs: asCount(row[indexes.gs], `Zeile ${i + 1} GS`), vl: asCount(row[indexes.vl], `Zeile ${i + 1} VL`),
      vl_up: asCount(row[indexes.vlUp], `Zeile ${i + 1} VL Up`), aeroccino: asCount(row[indexes.aeroccino], `Zeile ${i + 1} Aeroccino`),
      sourceRow: i + 1,
    });
  }
  if (!rows.length) throw new Error('Keine KPI-Zeilen gefunden.');
  return { waveMonth, rows };
}

function rateFromCell(sheet: XLSX.WorkSheet, coordinate: string, fallback: number): number {
  const formula = String(sheet[coordinate]?.f || '');
  const match = formula.match(/\*\s*(\d+(?:[.,]\d+)?)/);
  return match ? asNumber(match[1], coordinate) : fallback;
}

function rateFromHeader(value: unknown): number {
  const match = String(value || '').match(/\d+(?:[.,]\d+)?/);
  return match ? asNumber(match[0], 'Prämiensatz') : 0;
}

export function parsePremiumWorkbook(workbook: XLSX.WorkBook, reportingYear?: number): { waveMonth: string; defaultRates: PremiumRates; rows: PremiumInput[] } {
  const sheet = firstSheet(workbook);
  const data = rowsOf(sheet);
  const header = data[0] || [];
  const columns = {
    vl: headerIndex(header, 'VL'), vlUp: headerIndex(header, 'VL Up'),
    tma: headerIndex(header, 'TMA'), gs: headerIndex(header, 'GS'),
    aeroccino: headerIndex(header, 'Aeroccino'), total: headerIndex(header, 'Summe'),
  };
  const monthColumn = header.findIndex(value => normalizeName(value) === 'monat');
  const waveMonth = monthFromSheet(workbook.SheetNames[0], monthColumn >= 0 ? data[1]?.[monthColumn] : undefined, reportingYear);
  const defaultRates: PremiumRates = {
    vl: rateFromHeader(header[columns.vl + 1]),
    vl_up: rateFromHeader(header[columns.vlUp + 1]),
    tma: rateFromHeader(header[columns.tma + 1]),
    gs: rateFromHeader(header[columns.gs + 1]),
    aeroccino: rateFromHeader(header[columns.aeroccino + 1]),
  };
  const rows: PremiumInput[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] || [];
    if (!row[0] && !row[1]) continue;
    if (normalizeName(row[0]) === 'summe') continue;
    if (monthColumn >= 0 && monthFromSheet(workbook.SheetNames[0], row[monthColumn], reportingYear) !== waveMonth) throw new Error(`Zeile ${i + 1}: anderer Berichtsmonat.`);
    const rowNumber = i + 1;
    const base = {
      name: [row[0], row[1]].filter(Boolean).join(' ').trim(),
      vertuo: asCount(row[columns.vl], `Zeile ${rowNumber} VL`),
      vertuo_pop: asCount(row[columns.vlUp], `Zeile ${rowNumber} VL Up`),
      tma: asCount(row[columns.tma], `Zeile ${rowNumber} TMA`),
      gutscheine: asCount(row[columns.gs], `Zeile ${rowNumber} GS`),
      aeroccino: asCount(row[columns.aeroccino], `Zeile ${rowNumber} Aeroccino`),
      sourceRow: rowNumber,
    };
    const gsStandard = XLSX.utils.encode_cell({ r: i, c: columns.gs + 1 });
    const gsSpecial = XLSX.utils.encode_cell({ r: i, c: columns.gs + 2 });
    const specialCell = sheet[gsSpecial];
    const specialRate = specialCell?.f ? rateFromCell(sheet, gsSpecial, defaultRates.gs) : null;
    const rates: PremiumRates = {
      vl: rateFromCell(sheet, XLSX.utils.encode_cell({ r: i, c: columns.vl + 1 }), defaultRates.vl),
      vl_up: rateFromCell(sheet, XLSX.utils.encode_cell({ r: i, c: columns.vlUp + 1 }), defaultRates.vl_up),
      tma: rateFromCell(sheet, XLSX.utils.encode_cell({ r: i, c: columns.tma + 1 }), defaultRates.tma),
      gs: specialRate ?? rateFromCell(sheet, gsStandard, defaultRates.gs),
      aeroccino: rateFromCell(sheet, XLSX.utils.encode_cell({ r: i, c: columns.aeroccino + 1 }), defaultRates.aeroccino),
    };
    const calculated = calculatePremium({ ...base, rates });
    const sourceTotal = row[columns.total];
    if (sourceTotal !== null && sourceTotal !== undefined && Math.abs(calculated - asNumber(sourceTotal, `Zeile ${rowNumber} Summe`)) > 0.011) {
      throw new Error(`Zeile ${rowNumber}: Die Prämie stimmt nicht mit der Excel-Summe überein.`);
    }
    rows.push({ ...base, rates });
  }
  if (!rows.length) throw new Error('Keine Provisionszeilen gefunden.');
  return { waveMonth, defaultRates, rows };
}
