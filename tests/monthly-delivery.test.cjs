const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const XLSX = require('xlsx');
const cache = new Map();
function sourceModule(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = loaded.require.bind(loaded);
  loaded.require = name => {
    if (name.startsWith('@/')) return sourceModule(name.slice(2) + '.ts');
    if (name.startsWith('.')) return sourceModule(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name)) + '.ts');
    return original(name);
  };
  cache.set(filename, loaded);
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return loaded.exports;
}
const { monthFromSheet, parseSalesWorkbook, parsePremiumWorkbook, salesWorkbookColumns, salesWorkbookMonths } = sourceModule('lib/statistics/monthlyKpi.ts');
const { monthlySendSchema, validSales, premiumReady, isDelivered } = sourceModule('lib/statistics/monthlyDelivery.ts');
const { kpiColor, kpiColorStyle, reportingMonthLabel } = sourceModule('lib/statistics/kpiPresentation.ts');
function workbook(header, rows, name = 'Oktober 2026') {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([header, ...rows]), name);
  return book;
}
const salesHeader = ['Vorname', 'Nachname', 'Emailadresse', 'Monat', 'ET', 'MC', 'TMA', 'GS', 'VL', 'VL Up', 'Aeroccino', 'MC/ET', 'Anteil TMA', 'VL Share'];
const salesInput = ['Fixture', 'Promotor', 'promotor@fixture.invalid', 'September 2026', 2, 8, 6, 10, 1, 2, 1, 4, 75, 12.5];
const premiumHeader = ['Vorname', 'Nachname', 'VL', '6.19', 'VL Up', '6.19', 'TMA', '6.19', 'GS', '1.65', 'Sonderrate', 'Aeroccino', '2.86', 'Summe', 'Monat'];
const premiumInput = ['Fixture', 'Promotor', 1, null, 2, null, 6, null, 10, null, null, 1, null, 75.07, 'September 2026'];
const userId = '11111111-1111-4111-8111-111111111111';
const sale = { id: userId, user_id: userId, wave_month: '2026-09-01', sent_at: null, einsatztage: 2, mc: 8, tma: 6, gs: 10, vl: 1, vl_up: 2, aeroccino: 1 };
const premium = { user_id: userId, wave_month: sale.wave_month, sent_at: null, vertuo: 1, vertuo_pop: 2, tma: 6, gutscheine: 10, aeroccino: 1,
  rate_snapshot: { vl: 6.19, vl_up: 6.19, tma: 6.19, gs: 1.65, aeroccino: 2.86 }, total_amount: 75.07 };
test('the reporting month in each KPI row takes precedence over the workbook title', () => {
  const parsed = parseSalesWorkbook(workbook(salesHeader, [salesInput]));
  assert.equal(parsed.waveMonth, '2026-09');
  assert.equal(parsed.rows[0].mc, 8);
  assert.throws(() => parseSalesWorkbook(workbook(salesHeader, [salesInput, [...salesInput.slice(0, 3), 'Oktober 2026', ...salesInput.slice(4)]])), /anderer Monat/);
});
test('reporting months support Excel dates and German month names without using the import date', () => {
  assert.equal(monthFromSheet('Oktober 2026', '01.09.2026'), '2026-09');
  assert.equal(monthFromSheet('Oktober 2026', new Date('2026-09-01T12:00:00Z')), '2026-09');
  assert.equal(monthFromSheet('Oktober 2026', 46266), '2026-09');
  assert.equal(monthFromSheet('Import', 'September', 2025), '2025-09');
  assert.equal(monthFromSheet('Oktober 2026', 'September'), '2026-09');
  assert.throws(() => monthFromSheet('Oktober 2026', 'unbekannt'), /Ungültiger/);
  assert.equal(reportingMonthLabel('2026-09-01'), 'September 2026');
  ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'].forEach((name, index) => {
    assert.equal(monthFromSheet('Import', `${name} 2026`), `2026-${String(index + 1).padStart(2, '0')}`);
  });
});
test('premium row months override the title and mixed periods are rejected', () => {
  assert.equal(parsePremiumWorkbook(workbook(premiumHeader, [premiumInput])).waveMonth, '2026-09');
  assert.throws(() => parsePremiumWorkbook(workbook(premiumHeader, [premiumInput, [...premiumInput.slice(0, 14), 'Oktober 2026']])), /anderer Berichtsmonat/);
  assert.equal(parsePremiumWorkbook(workbook(premiumHeader.slice(0, 14), [premiumInput.slice(0, 14)])).waveMonth, '2026-10');
  assert.equal(parsePremiumWorkbook(workbook(premiumHeader, [[...premiumInput.slice(0, 14), 'September']], 'Import'), 2025).waveMonth, '2025-09');
});
test('shared KPI colors retain the history thresholds including exact boundaries', () => {
  for (const [metric, green, orange] of [['mcet', 4.5, 4], ['tma', 75, 65], ['vlshare', 10, 6]]) {
    assert.match(kpiColor(metric, green), /text-green-600/);
    assert.equal(kpiColor(metric, orange), 'custom-orange');
    assert.match(kpiColor(metric, orange - 0.1), /text-red-600/);
  }
  assert.deepEqual(kpiColorStyle('custom-orange'), { color: '#FD7E14' });
  assert.equal(kpiColor('mcet', 4.49), kpiColor('mcet', 4.5));
  assert.equal(kpiColor('tma', 74.99), kpiColor('tma', 75));
});
test('a premium is ready only for the same employee/month with matching quantities and a correct amount', () => {
  assert.ok(premiumReady(sale, premium));
  for (const changed of [{ user_id: 'other' }, { wave_month: '2026-10-01' }, { gutscheine: 11 }, { rate_snapshot: null }, { total_amount: null }, { total_amount: 75.08 }, { sent_at: '2026-10-13T12:00:00Z' }]) {
    assert.equal(premiumReady(sale, { ...premium, ...changed }), false);
  }
  assert.equal(premiumReady(sale), false);
  assert.equal(premiumReady(undefined, premium), false);
  assert.equal(premiumReady(sale, { ...premium, rate_snapshot: { ...premium.rate_snapshot, gs: -1 } }), false);
});
test('a zero amount is valid when quantities are zero, while missing values and invalid KPIs stay blocked', () => {
  const zeroSale = { ...sale, mc: 0, tma: 0, gs: 0, vl: 0, vl_up: 0, aeroccino: 0 };
  const zeroPremium = { ...premium, tma: 0, gutscheine: 0, vertuo: 0, vertuo_pop: 0, aeroccino: 0, total_amount: 0 };
  assert.ok(premiumReady(zeroSale, zeroPremium));
  assert.equal(validSales({ ...sale, tma: 9 }), false);
  assert.equal(validSales({ ...sale, mc: 2500, tma: 2501, einsatztage: 1000 }), false);
  assert.equal(validSales({ ...sale, mc: 2000 }), false);
  assert.equal(premiumReady(zeroSale, { ...zeroPremium, rate_snapshot: { vl: 0, vl_up: 0, tma: 0, gs: 0, aeroccino: 0 } }), false);
  assert.equal(isDelivered({ sent_at: null }), false);
  assert.equal(isDelivered({}), true);
});
test('send requests require unique reviewed employee versions and a premium version for premium delivery', () => {
  const row = { userId, salesUpdatedAt: '2026-10-13T12:00:00Z' };
  const request = { waveMonth: '2026-09', kind: 'kpi', rows: [row] };
  assert.ok(monthlySendSchema.safeParse(request).success);
  assert.equal(monthlySendSchema.safeParse({ ...request, rows: [row, row] }).success, false);
  assert.equal(monthlySendSchema.safeParse({ ...request, waveMonth: '2026-13' }).success, false);
  assert.equal(monthlySendSchema.safeParse({ ...request, kind: 'premium' }).success, false);
  assert.ok(monthlySendSchema.safeParse({ ...request, kind: 'premium', rows: [{ ...row, premiumUpdatedAt: row.salesUpdatedAt }] }).success);
  assert.equal(monthlySendSchema.safeParse({ ...request, rows: [{ ...row, feedbackText: 'x'.repeat(12001) }] }).success, false);
});

test('the Gesamt layout maps the month and VL Pop+/UP, including rows identified only by email', () => {
  const header=['Coffee Advisor','Emailadresse','Agentur','Monat','ET','MC','TMA','GS','MC/ET','Anteil TMA','VL Share','VL ','Aeroccino','VL Pop+/UP'];
  const book=workbook(header,[['Fixture Promotor','promotor@fixture.invalid','Sales Crew','September 2026',2,8,6,10,4,0.75,0.125,1,1,2],
    [null,'other@fixture.invalid','Sales Crew','Oktober 2026',2,9,6,4,4.5,0.667,0,0,0,1]],'Tabelle1');
  const {mapping}=salesWorkbookColumns(book);
  assert.equal(mapping.month,3);assert.equal(mapping.vlUp,13);
  assert.deepEqual(salesWorkbookMonths(book,mapping),['2026-09','2026-10']);
  assert.throws(()=>parseSalesWorkbook(book),/anderer Monat/);
  const parsed=parseSalesWorkbook(book,2026,{mapping,month:'2026-10'});
  assert.equal(parsed.rows.length,1);assert.equal(parsed.rows[0].email,'other@fixture.invalid');assert.equal(parsed.rows[0].name,'');assert.equal(parsed.rows[0].sourceRow,3);assert.equal(parsed.rows[0].vl_up,1);
});
test('a manually mapped month column overrides the sheet title and missing month mappings are rejected', () => {
 const book=workbook(salesHeader.map(value=>value==='Monat'?'Abrechnungsperiode':value),[salesInput],'Oktober 2026');
 const {mapping}=salesWorkbookColumns(book);assert.equal(mapping.month,-1);
 assert.throws(()=>parseSalesWorkbook(book,2026,{mapping,month:'2026-09'}),/Monat/);
 const parsed=parseSalesWorkbook(book,2026,{mapping:{...mapping,month:3},month:'2026-09'});
 assert.equal(parsed.waveMonth,'2026-09');
});
