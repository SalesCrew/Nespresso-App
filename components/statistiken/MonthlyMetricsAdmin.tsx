"use client";

import { Fragment, useEffect, useRef, useState } from 'react';
import { BarChart3, Gift, Upload, Save, AlertCircle, Loader2, ChevronDown, X } from 'lucide-react';
import XLSX from 'xlsx';
import {
  parsePremiumWorkbook, parseSalesWorkbook, type PremiumInput,
  type PremiumRates, type SalesInput,
} from '@/lib/statistics/monthlyKpi';

type Tab = 'kpi' | 'premium';
type Preview = {
  waveMonth: string;
  matched: number;
  unmatched: Array<{ name: string; sourceRow: number; reason: string }>;
  mismatches?: Array<{ name: string; sourceRow: number; fields: string[] }>;
  promotors: Array<{ user_id: string; name: string }>;
  total?: number;
};
type Draft = {
  kind: Tab;
  waveMonth: string;
  rows: Array<SalesInput | PremiumInput>;
  defaultRates?: PremiumRates;
  preview: Preview;
};
type CorrectionPreview = {
  userId: string; waveMonth: string; oldAmount: number | null; newAmount: number;
  rateSnapshot: PremiumRates; updatedAt: string;
};

const emptyRates: PremiumRates = { vl: 0, vl_up: 0, tma: 0, gs: 0, aeroccino: 0 };
const rateFields: Array<{ key: keyof PremiumRates; label: string }> = [
  { key: 'vl', label: 'VL' }, { key: 'vl_up', label: 'VL Up' },
  { key: 'tma', label: 'TMA/TAP' }, { key: 'gs', label: 'GS' },
  { key: 'aeroccino', label: 'Aeroccino' },
];
const euro = (value: number) => value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });

export default function MonthlyMetricsAdmin() {
  const [tab, setTab] = useState<Tab>('kpi');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sales, setSales] = useState<any[]>([]);
  const [premiums, setPremiums] = useState<any[]>([]);
  const [rates, setRates] = useState<PremiumRates>(emptyRates);
  const [savedDefaultRates, setSavedDefaultRates] = useState<PremiumRates>(emptyRates);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [overrideRates, setOverrideRates] = useState<PremiumRates>(emptyRates);
  const [promotors, setPromotors] = useState<Array<{ user_id: string; name: string }>>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [monthLoading, setMonthLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [calculation, setCalculation] = useState<{ count: number; total: number } | null>(null);
  const [expandedPremiumId, setExpandedPremiumId] = useState<string | null>(null);
  const [correction, setCorrection] = useState<CorrectionPreview | null>(null);
  const correctionPending = useRef(false);
  const loadVersion = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const locked = busy || monthLoading;
  const savedPersonRates = overrides.find(row => row.user_id === selectedUser) || savedDefaultRates;
  const hasUnsavedRates = rateFields.some(field => Number(savedPersonRates[field.key]) !== overrideRates[field.key]);
  const selectedStatement = premiums.find(row => row.user_id === selectedUser);

  useEffect(() => {
    fetch('/api/admin/kpi-praemien/latest-summary', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.waveMonth) setMonth(data.waveMonth); })
      .catch(() => {});
  }, []);

  const loadMonth = async (waveMonth: string) => {
    const version = ++loadVersion.current;
    setMonthLoading(true);
    try {
      const [salesResponse, premiumResponse, ratesResponse] = await Promise.all([
        fetch(`/api/admin/monthly-kpis?waveMonth=${waveMonth}`, { cache: 'no-store' }),
        fetch(`/api/admin/kpi-praemien?waveMonth=${waveMonth}`, { cache: 'no-store' }),
        fetch(`/api/admin/premium-rates?waveMonth=${waveMonth}`, { cache: 'no-store' }),
      ]);
      const [salesData, premiumData, rateData] = await Promise.all([
        salesResponse.json(), premiumResponse.json(), ratesResponse.json(),
      ]);
      if (!salesResponse.ok || !premiumResponse.ok || !ratesResponse.ok) {
        throw new Error(salesData.error || premiumData.error || rateData.error || 'Monatsdaten konnten nicht geladen werden.');
      }
      if (version !== loadVersion.current) return;
      setSales(salesData.items || []);
      setPremiums(premiumData.items || []);
      const nextRates = rateData.defaultRates
        ? Object.fromEntries(rateFields.map(field => [field.key, Number(rateData.defaultRates[field.key])])) as PremiumRates
        : emptyRates;
      setRates(nextRates);
      setSavedDefaultRates(nextRates);
      setOverrideRates(nextRates);
      setOverrides(rateData.overrides || []);
      setPromotors(rateData.promotors || []);
      setSelectedUser('');
    } finally {
      if (version === loadVersion.current) setMonthLoading(false);
    }
  };

  useEffect(() => {
    loadMonth(month).catch(err => setError(err.message));
  }, [month]);

  useEffect(() => { setCorrection(null); }, [month, selectedUser, overrideRates]);

  const previewRows = async (kind: Tab, waveMonth: string, rows: Array<SalesInput | PremiumInput>, defaultRates?: PremiumRates) => {
    const url = kind === 'kpi' ? '/api/admin/monthly-kpis' : '/api/admin/kpi-praemien/import';
    const response = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preview: true, waveMonth, rows, defaultRates }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Vorschau fehlgeschlagen.');
    return data as Preview;
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const parsed = tab === 'kpi' ? parseSalesWorkbook(workbook) : parsePremiumWorkbook(workbook);
      const preview = await previewRows(tab, parsed.waveMonth, parsed.rows, 'defaultRates' in parsed ? parsed.defaultRates : undefined);
      setDraft({ kind: tab, waveMonth: parsed.waveMonth, rows: parsed.rows,
        defaultRates: 'defaultRates' in parsed ? parsed.defaultRates : undefined, preview });
      setPromotors(preview.promotors);
      setMonth(parsed.waveMonth);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Datei konnte nicht gelesen werden.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const assignRow = (sourceRow: number, userId: string) => {
    if (!draft) return;
    setDraft({ ...draft, rows: draft.rows.map(row => row.sourceRow === sourceRow ? { ...row, user_id: userId || undefined } : row) });
  };

  const recheck = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const preview = await previewRows(draft.kind, draft.waveMonth, draft.rows, draft.defaultRates);
      setDraft({ ...draft, preview });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Prüfung fehlgeschlagen.');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!draft) return;
    setBusy(true);
    setError('');
    try {
      const url = draft.kind === 'kpi' ? '/api/admin/monthly-kpis' : '/api/admin/kpi-praemien/import';
      const response = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveMonth: draft.waveMonth, rows: draft.rows, defaultRates: draft.defaultRates }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.unmatched || data.mismatches) setDraft({ ...draft, preview: data });
        throw new Error(data.error || 'Import fehlgeschlagen.');
      }
      setMessage(`${data.imported} ${draft.kind === 'kpi' ? 'KPI' : 'Prämien'}-Zeilen gespeichert.${data.warning ? ` ${data.warning}` : ''}`);
      setDraft(null);
      await loadMonth(draft.waveMonth);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import fehlgeschlagen.');
    } finally { setBusy(false); }
  };

  const saveRates = async (userId: string | null, values: PremiumRates) => {
    setBusy(true);
    setError('');
    setMessage('');
    setCalculation(null);
    setCorrection(null);
    try {
      const response = await fetch('/api/admin/premium-rates', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveMonth: month, userId, rates: values }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sätze konnten nicht gespeichert werden.');
      await loadMonth(month);
      if (userId) {
        setSelectedUser(userId);
        setOverrideRates(values);
        setMessage('Sonderrate gespeichert. Für eine vorhandene Abrechnung jetzt „Abrechnung aktualisieren“ wählen.');
      } else {
        setMessage('Standardsätze gespeichert. Vorhandene Abrechnungen können einzeln aktualisiert werden.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sätze konnten nicht gespeichert werden.');
    } finally { setBusy(false); }
  };

  const updateStatement = async (confirmed: boolean) => {
    if (correctionPending.current || locked || !selectedUser || hasUnsavedRates) return;
    if (confirmed && !correction) return;
    correctionPending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const target = confirmed ? correction! : { userId: selectedUser, waveMonth: month };
    try {
      const response = await fetch('/api/admin/kpi-praemien', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: target.userId, waveMonth: target.waveMonth, preview: !confirmed,
          ...(confirmed ? { expectedUpdatedAt: correction!.updatedAt, expectedRates: correction!.rateSnapshot } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) { setCorrection(null); await loadMonth(target.waveMonth); }
        throw new Error(data.error || 'Abrechnung konnte nicht aktualisiert werden.');
      }
      if (!confirmed) setCorrection(data);
      else {
        const name = promotors.find(person => person.user_id === target.userId)?.name || 'den Mitarbeiter';
        setCorrection(null);
        await loadMonth(target.waveMonth);
        setSelectedUser(target.userId);
        setOverrideRates(data.rateSnapshot);
        setMessage(`Abrechnung für ${name} aktualisiert.`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Abrechnung konnte nicht aktualisiert werden.');
    } finally { correctionPending.current = false; setBusy(false); }
  };

  const calculateFromKpis = async (preview: boolean) => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/kpi-praemien/from-kpis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveMonth: month, preview }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Berechnung fehlgeschlagen.');
      if (preview) setCalculation({ count: data.count, total: data.total });
      else {
        setCalculation(null);
        setMessage(`${data.imported} Prämienabrechnungen gespeichert.`);
        await loadMonth(month);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Berechnung fehlgeschlagen.');
    } finally { setBusy(false); }
  };

  const rateInputs = (value: PremiumRates, setValue: (value: PremiumRates) => void) => (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      {rateFields.map(field => (
        <label key={field.key} className="block text-xs text-gray-600">
          {field.label} (€)
          <input type="number" min="0" step="0.01" value={value[field.key]} disabled={locked}
            onChange={event => setValue({ ...value, [field.key]: Number(event.target.value) })}
            className="mt-1 w-full rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900" />
        </label>
      ))}
    </div>
  );

  return (
    <section id="monthly-metrics" className="mb-8 border-y border-gray-200 bg-white px-5 py-5" aria-label="Monatszahlen">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Monatszahlen</h2>
          <div className="mt-2 inline-flex rounded border border-gray-200 p-0.5" role="tablist" aria-label="Monatszahlen Ansicht">
            <button role="tab" aria-selected={tab === 'kpi'} disabled={locked} onClick={() => { setTab('kpi'); setDraft(null); }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm ${tab === 'kpi' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
              <BarChart3 className="h-4 w-4" /> KPIs
            </button>
            <button role="tab" aria-selected={tab === 'premium'} disabled={locked} onClick={() => { setTab('premium'); setDraft(null); }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm ${tab === 'premium' ? 'bg-gray-900 text-white' : 'text-gray-600'}`}>
              <Gift className="h-4 w-4" /> Prämien
            </button>
          </div>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-xs text-gray-600">Monat
            <input type="month" value={month} disabled={locked} onChange={event => { if (event.target.value) setMonth(event.target.value); setDraft(null); setCalculation(null); setCorrection(null); setSelectedUser(''); }}
              className="mt-1 block rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900" />
          </label>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={locked}
            className="inline-flex h-9 items-center gap-2 rounded border border-gray-300 px-3 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50">
            <Upload className="h-4 w-4" /> {tab === 'kpi' ? 'KPI-Liste importieren' : 'Provisionsliste importieren'}
          </button>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {message && <p role="status" className="mb-3 text-sm text-green-700">{message}</p>}

      {draft && (
        <div className="mb-5 border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong>Vorschau {draft.waveMonth}: {draft.rows.length} Zeilen, {draft.preview.matched} zugeordnet</strong>
            {draft.kind === 'premium' && <span>Summe der zugeordneten Zeilen: {euro(draft.preview.total || 0)}</span>}
          </div>
          {draft.kind === 'premium' && draft.defaultRates && (
            <p className="mb-2 text-xs text-gray-600">
              Standardsätze: {rateFields.map(field => `${field.label} ${euro(draft.defaultRates![field.key])}`).join(' · ')}
              {draft.rows.filter(row => 'rates' in row && row.rates.gs !== draft.defaultRates!.gs).length > 0 &&
                ` · ${draft.rows.filter(row => 'rates' in row && row.rates.gs !== draft.defaultRates!.gs).length} GS-Sonderrate`}
            </p>
          )}
          {(draft.preview.unmatched || []).map(row => (
            <div key={row.sourceRow} className="mb-2 flex flex-wrap items-center gap-2 text-sm text-amber-800">
              <span>Zeile {row.sourceRow}: {row.name} ({row.reason})</span>
              <select aria-label={`${row.name} zuordnen`} value={draft.rows.find(item => item.sourceRow === row.sourceRow)?.user_id || ''}
                onChange={event => assignRow(row.sourceRow, event.target.value)} className="max-w-64 rounded border border-gray-300 bg-white px-2 py-1 text-gray-900">
                <option value="">Promotor auswählen</option>
                {draft.preview.promotors.map(person => <option key={person.user_id} value={person.user_id}>{person.name}</option>)}
              </select>
              <button type="button" title={`Zeile ${row.sourceRow} aus diesem Import entfernen`}
                onClick={() => setDraft({ ...draft, rows: draft.rows.filter(item => item.sourceRow !== row.sourceRow) })}
                className="rounded p-1 text-gray-600 hover:bg-gray-200"><X className="h-4 w-4" /></button>
            </div>
          ))}
          {(draft.preview.mismatches || []).map(row => (
            <p key={row.sourceRow} className="text-sm text-red-700">Zeile {row.sourceRow}: {row.name} – andere Mengen bei {row.fields.join(', ')}.</p>
          ))}
          <div className="mt-3 flex items-center gap-2">
            <button onClick={recheck} disabled={locked} className="rounded border border-gray-300 px-3 py-1.5 text-sm">Zuordnung prüfen</button>
            <button onClick={saveDraft} disabled={locked || !!draft.preview.unmatched?.length || !!draft.preview.mismatches?.length}
              className="inline-flex items-center gap-2 rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Import speichern
            </button>
            <button onClick={() => setDraft(null)} className="px-3 py-1.5 text-sm text-gray-600">Abbrechen</button>
          </div>
        </div>
      )}

      {tab === 'kpi' ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500"><tr>
              <th className="py-2">Promotor</th><th>MC/ET</th><th>TMA/TAP</th><th>VL Share</th><th>VL Up</th>
              <th>MC</th><th>ET</th><th>TMA</th><th>GS</th><th>VL</th><th>Aeroccino</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map(row => <tr key={row.id}>
                <td className="py-2 font-medium text-gray-900">{row.promotor_name}</td>
                <td>{Number(row.mc_et).toFixed(1)}</td><td>{Number(row.tap_quote).toFixed(1)}%</td>
                <td>{Number(row.vl_share).toFixed(1)}%</td><td>{row.vl_up}</td>
                <td>{row.mc}</td><td>{Number(row.einsatztage).toLocaleString('de-AT')}</td>
                <td>{row.tma}</td><td>{row.gs}</td><td>{row.vl}</td><td>{row.aeroccino}</td>
              </tr>)}
            </tbody>
          </table>
          {!sales.length && <p className="py-6 text-sm text-gray-500">Für diesen Monat liegen keine Verkaufszahlen vor.</p>}
        </div>
      ) : (
        <>
          <div className="mb-5 border-b border-gray-200 pb-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Prämiensätze für {month}</h3>
              <button onClick={() => saveRates(null, rates)} disabled={locked}
                className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"><Save className="h-3.5 w-3.5" /> Sätze speichern</button>
            </div>
            {rateInputs(rates, setRates)}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-600">Abweichender Satz für
                <select value={selectedUser} disabled={locked} onChange={event => {
                  const id = event.target.value;
                  setSelectedUser(id);
                  const saved = overrides.find(row => row.user_id === id);
                  setOverrideRates(saved ? Object.fromEntries(rateFields.map(field => [field.key, Number(saved[field.key])])) as PremiumRates : rates);
                }} className="mt-1 block rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900">
                  <option value="">Promotor auswählen</option>
                  {promotors.map(person => <option key={person.user_id} value={person.user_id}>{person.name}</option>)}
                </select>
              </label>
              {selectedUser && <button onClick={() => saveRates(selectedUser, overrideRates)} disabled={locked}
                className="rounded border border-gray-300 px-2 py-1.5 text-xs">Sonderrate speichern</button>}
            </div>
            {selectedUser && <div className="mt-2">{rateInputs(overrideRates, setOverrideRates)}</div>}
            {selectedUser && selectedStatement && <div className="mt-3 space-y-2">
              <button onClick={() => void updateStatement(false)} disabled={locked || hasUnsavedRates}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Abrechnung aktualisieren</button>
              {hasUnsavedRates && <p className="text-xs text-gray-600">Bitte zuerst die Sonderrate speichern.</p>}
              {correction && <div role="region" aria-label="Abrechnung bestätigen" className="rounded border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium">{promotors.find(person => person.user_id === correction.userId)?.name} · {correction.waveMonth}</p>
                <p className="mt-1 text-sm">Bisher: {correction.oldAmount === null ? '—' : euro(correction.oldAmount)} → Neu: {euro(correction.newAmount)}</p>
                <p className="mt-1 text-xs text-gray-600">Die gespeicherten Verkaufsmengen bleiben erhalten.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={() => void updateStatement(true)} disabled={locked}
                    className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-50">Änderung speichern</button>
                  <button onClick={() => setCorrection(null)} disabled={locked} className="px-3 py-1.5 text-sm text-gray-600">Abbrechen</button>
                </div>
              </div>}
            </div>}
            {overrides.length > 0 && <p className="mt-2 text-xs text-gray-500">Sonderraten: {overrides.map(row => row.name).join(', ')}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button onClick={() => calculateFromKpis(true)} disabled={locked || !sales.length || premiums.length > 0}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50">Aus KPIs berechnen</button>
              {calculation && <>
                <span className="text-sm text-gray-600">{calculation.count} Personen · {euro(calculation.total)}</span>
                <button onClick={() => calculateFromKpis(false)} disabled={locked}
                  className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">Berechnung speichern</button>
                <button onClick={() => setCalculation(null)} className="text-sm text-gray-600">Abbrechen</button>
              </>}
            </div>
            {premiums.length > 0 && <p className="mt-2 text-xs text-gray-600">Abrechnungen sind bereits gespeichert. Wähle einen Mitarbeiter, um seine Abrechnung zu aktualisieren.</p>}
          </div>
          <div className="mb-2 flex justify-between text-sm"><strong>Abrechnung</strong><strong>{euro(premiums.reduce((sum, row) => sum + Number(row.amount || 0), 0))}</strong></div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500"><tr><th className="py-2">Promotor</th><th>VL</th><th>VL Up</th><th>TMA/TAP</th><th>GS</th><th>Aeroccino</th><th className="text-right">Prämie</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{premiums.map(row => <Fragment key={row.id}>
                <tr>
                  <td className="py-2 font-medium text-gray-900">
                    <button type="button" onClick={() => setExpandedPremiumId(expandedPremiumId === row.id ? null : row.id)}
                      title={`${row.promotor_name}: Prämie aufschlüsseln`} aria-expanded={expandedPremiumId === row.id}
                      className="inline-flex items-center gap-1 text-left hover:underline">
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedPremiumId === row.id ? 'rotate-180' : ''}`} />{row.promotor_name}
                    </button>
                  </td>
                  <td>{row.vertuo}</td><td>{row.vertuo_pop}</td><td>{row.tma}</td>
                  <td>{row.gutscheine}{row.rate_snapshot && Number(row.rate_snapshot.gs) !== Number(rates.gs) && <span className="ml-1 text-xs text-amber-700" title="Sonderrate">*</span>}</td>
                  <td>{row.aeroccino}</td><td className="text-right font-semibold">{row.amount === null ? '—' : euro(row.amount)}</td>
                </tr>
                {expandedPremiumId === row.id && <tr><td colSpan={7} className="pb-3 text-xs text-gray-700">
                  {row.breakdown?.length ? <div className="grid gap-2 sm:grid-cols-5">
                    {row.breakdown.map((item: { key: string; label: string; count: number; rate: number; amount: number }) =>
                      <div key={item.key}><strong>{item.label}</strong><div>{item.count} × {euro(item.rate)} = {euro(item.amount)}</div></div>)}
                  </div> : 'Für diesen Eintrag sind noch keine Prämiensätze hinterlegt.'}
                </td></tr>}
              </Fragment>)}</tbody>
            </table>
            {!premiums.length && <p className="py-6 text-sm text-gray-500">Für diesen Monat liegt noch keine Prämienabrechnung vor.</p>}
          </div>
          <p className="mt-2 text-xs text-gray-500">* Abweichender GS-Satz. Die beim Import verwendeten Sätze bleiben je Abrechnung gespeichert.</p>
        </>
      )}
    </section>
  );
}
