"use client";

import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { BarChart3, Gift, Upload, Save, AlertCircle, Loader2, ChevronDown, X, Send, Check } from 'lucide-react';
import XLSX from 'xlsx';
import {
  parsePremiumWorkbook, parseSalesWorkbook, salesWorkbookColumns, salesWorkbookMonths, salesColumnLabels, type SalesColumnMap, type SalesColumn, type PremiumInput,
  type PremiumRates, type SalesInput,
} from '@/lib/statistics/monthlyKpi';
import { Switch } from '@/components/ui/switch';
import { isDelivered, premiumReady, validSales, type MonthlySalesRow, type MonthlyPremiumRow } from '@/lib/statistics/monthlyDelivery';
import { kpiColor, kpiColorStyle, reportingMonthLabel } from '@/lib/statistics/kpiPresentation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AdminStatisticsButton, AdminStatisticsCombobox, AdminStatisticsInput, AdminStatisticsMonthPicker, AdminStatisticsSelect,
  adminScrollClass, adminTabClass,
} from './AdminStatisticsControls';

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

type Props = {
  feedbackMode: boolean; onFeedbackModeChange: (next: boolean) => void; feedbackContent: ReactNode;
  validation: Record<string, boolean>; onValidate: (id: string) => void;
  onRowsChange: (rows: MonthlySalesRow[], month: string) => void;
  feedback: Record<string, string>; categories: Record<string, string>;
  onSent: () => void; importRequest: number; feedbackBusy: boolean; onLockedChange: (locked: boolean) => void;
};

export default function MonthlyMetricsAdmin({ feedbackMode, onFeedbackModeChange, feedbackContent,
  validation, onValidate, onRowsChange, feedback, categories, onSent, importRequest, feedbackBusy, onLockedChange }: Props) {
  const [tab, setTab] = useState<Tab>('kpi');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loadedMonth, setLoadedMonth] = useState('');
  const [sales, setSales] = useState<MonthlySalesRow[]>([]);
  const [premiums, setPremiums] = useState<MonthlyPremiumRow[]>([]);
  const [rates, setRates] = useState<PremiumRates>(emptyRates);
  const [savedDefaultRates, setSavedDefaultRates] = useState<PremiumRates>(emptyRates);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [overrideRates, setOverrideRates] = useState<PremiumRates>(emptyRates);
  const [promotors, setPromotors] = useState<Array<{ user_id: string; name: string }>>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [columnSetup, setColumnSetup] = useState<{ workbook: XLSX.WorkBook; headers: string[]; mapping: SalesColumnMap; month: string } | null>(null);
  const [workflowReady, setWorkflowReady] = useState(false);
  const [premiumValidation, setPremiumValidation] = useState<Record<string, boolean>>({});
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
  const locked = busy || monthLoading || feedbackBusy;
  const pendingSales = workflowReady ? sales.filter(row => !isDelivered(row)) : sales;
  const premiumRows = Array.from(new Set([...sales.map(row => row.user_id), ...premiums.filter(row => !workflowReady || !isDelivered(row)).map(row => row.user_id)]))
    .map(userId => ({ sales: sales.find(row => row.user_id === userId), premium: premiums.find(row => row.user_id === userId) }))
    .filter(row => !workflowReady || !row.premium || !isDelivered(row.premium));
  const sendableSales = pendingSales.filter(row => validation[row.id] && validSales(row));
  const sendablePremiums = premiumRows.filter(row => row.premium && premiumValidation[row.premium.id] && premiumReady(row.sales, row.premium));
  const sendCount = tab === 'kpi' ? sendableSales.length : sendablePremiums.length;
  const importRequestSeen = useRef(importRequest);
  const savedPersonRates = overrides.find(row => row.user_id === selectedUser) || savedDefaultRates;
  const hasUnsavedRates = rateFields.some(field => Number(savedPersonRates[field.key]) !== overrideRates[field.key]);
  const selectedStatement = premiums.find(row => row.user_id === selectedUser);

  useEffect(() => {
    let active = true;
    Promise.all(['/api/admin/kpi-praemien/latest-summary', '/api/admin/monthly-kpis'].map(url =>
      fetch(url, { cache: 'no-store' }).then(response => response.ok ? response.json() : null)))
      .then(results => {
        const latest = results.map(data => data?.waveMonth).filter((value): value is string => typeof value === 'string').sort().at(-1);
        if (active && latest) setMonth(latest);
      })
      .catch(() => {});
    return () => { active = false; };
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
      setWorkflowReady(salesData.workflowReady === true && premiumData.workflowReady === true);
      setPremiumValidation({});
      setSales(salesData.items || []);
      setLoadedMonth(waveMonth);
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
  useEffect(() => { onLockedChange(busy || monthLoading); }, [busy,monthLoading,onLockedChange]);

  useEffect(() => {
    if (!monthLoading && loadedMonth === month) onRowsChange(sales.filter(row => !isDelivered(row)), month);
  }, [sales, month, loadedMonth, monthLoading, onRowsChange]);

  useEffect(() => {
    if (importRequest === importRequestSeen.current) return;
    importRequestSeen.current = importRequest;
    setTab('kpi');
    inputRef.current?.click();
  }, [importRequest]);

  const sendValidated = async () => {
    if (locked || !workflowReady || !sendCount || draft || columnSetup) return;
    setBusy(true); setError(''); setMessage('');
    const rows = tab === 'kpi' ? sendableSales.map(row => ({ userId: row.user_id, salesUpdatedAt: row.updated_at,
      feedbackText: feedback[row.id]?.trim() || '', magicTouch: categories[row.id] || null }))
      : sendablePremiums.map(row => ({ userId: row.sales!.user_id, salesUpdatedAt: row.sales!.updated_at,
        premiumUpdatedAt: row.premium!.updated_at }));
    try {
      const response = await fetch('/api/admin/monthly-kpis/send', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waveMonth: month, kind: tab, rows }) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          rows.forEach(row => { const sale = sales.find(item => item.user_id === row.userId); if (sale && validation[sale.id]) onValidate(sale.id); });
          setPremiumValidation({}); await loadMonth(month);
        }
        throw new Error(data.error || 'Versand fehlgeschlagen.');
      }
      if (!data.success || data.count !== rows.length) throw new Error('Versand konnte nicht bestätigt werden. Bitte History prüfen.');
      setPremiumValidation({});
      await loadMonth(month); onSent();
      setMessage(`${data.count} ${tab === 'kpi' ? 'KPI-Zeilen' : 'Prämienabrechnungen'} für ${reportingMonthLabel(month)} gesendet.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Versand fehlgeschlagen.'); }
    finally { setBusy(false); }
  };


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
      if (tab === 'kpi') {
        const { headers, mapping } = salesWorkbookColumns(workbook);
        let months: string[] = [];
        try { months = salesWorkbookMonths(workbook, mapping, Number(month.slice(0, 4))); } catch {}
        setDraft(null);
        setColumnSetup({ workbook, headers, mapping, month: months.includes(month) ? month : months.at(-1) || month });
        return;
      }
      const parsed = parsePremiumWorkbook(workbook, Number(month.slice(0,4)));
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

  const previewMappedColumns = async () => {
    if (!columnSetup || locked) return;
    setBusy(true); setError('');
    try {
      const parsed = parseSalesWorkbook(columnSetup.workbook, Number(month.slice(0, 4)), { mapping: columnSetup.mapping, month: columnSetup.month });
      const preview = await previewRows('kpi', parsed.waveMonth, parsed.rows);
      setDraft({ kind: 'kpi', waveMonth: parsed.waveMonth, rows: parsed.rows, preview });
      setPromotors(preview.promotors); setMonth(parsed.waveMonth); setColumnSetup(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Spaltenzuordnung konnte nicht geprüft werden.'); }
    finally { setBusy(false); }
  };
  let fileMonths: string[] = [];
  if (columnSetup) {
    try { fileMonths = salesWorkbookMonths(columnSetup.workbook, columnSetup.mapping, Number(month.slice(0, 4))); } catch {}
  }

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
      setMessage(`${data.imported} ${draft.kind === 'kpi' ? 'KPI' : 'Prämien'}-Zeilen zur Prüfung übernommen.${data.warning ? ` ${data.warning}` : ''}`);
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
        onSent();
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
          <AdminStatisticsInput type="number" min="0" step="0.01" value={value[field.key]} disabled={locked}
            onChange={event => setValue({ ...value, [field.key]: Number(event.target.value) })}
            className="mt-1 tabular-nums" />
        </label>
      ))}
    </div>
  );

  return (
    <Tabs value={tab} onValueChange={next => { setTab(next as Tab); setDraft(null); setColumnSetup(null); }}>
    <section id="monthly-metrics" className="mb-8 min-w-0 rounded-lg border border-gray-100 bg-white p-4 shadow-sm sm:p-5" aria-label="Monatszahlen">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">Monatszahlen{monthLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-label="Monatsdaten werden geladen" />}</h2>
          <TabsList className="mt-2 h-auto gap-2 bg-transparent p-0" aria-label="Monatszahlen Ansicht">
            <TabsTrigger value="kpi" disabled={locked} className={adminTabClass}>
              <BarChart3 className="h-4 w-4" /> KPIs
            </TabsTrigger>
            <TabsTrigger value="premium" disabled={locked} className={adminTabClass}>
              <Gift className="h-4 w-4" /> Prämien
            </TabsTrigger>
          </TabsList>
          {tab === 'kpi' && <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
            <Switch checked={feedbackMode && workflowReady} onCheckedChange={onFeedbackModeChange} disabled={locked || !!draft || !!columnSetup || !workflowReady}
              aria-label="Feedback-Modus" className="data-[state=checked]:bg-green-600" /> Feedback-Modus
          </label>}

        </div>
        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto">
          <div className="space-y-1"><span className="block text-xs text-gray-600">Monat</span>
            <AdminStatisticsMonthPicker value={month} disabled={locked} onChange={next => { setMonth(next); setDraft(null); setColumnSetup(null); setCalculation(null); setCorrection(null); setSelectedUser(''); }} />
          </div>
          <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => handleFile(event.target.files?.[0])} />
          <AdminStatisticsButton onClick={() => inputRef.current?.click()} disabled={locked} className="h-auto min-h-9 whitespace-normal text-left">
            <Upload className="h-4 w-4" /> {tab === 'kpi' ? 'KPI-Liste importieren' : 'Provisionsliste importieren'}
          </AdminStatisticsButton>
          {workflowReady && sendCount > 0 && !draft && !columnSetup && <AdminStatisticsButton primary disabled={locked} onClick={() => void sendValidated()}>
            <Send className="h-4 w-4" /> {busy ? 'Wird gesendet…' : tab === 'kpi' ? `KPIs senden (${sendCount})` : `Prämien senden (${sendCount})`}
          </AdminStatisticsButton>}
        </div>
      </div>

      {!monthLoading && !workflowReady && <p role="status" className="mb-3 text-sm text-gray-600">Der neue Versand ist in dieser Umgebung noch nicht aktiviert. Bestehende Monatswerte bleiben hier einsehbar.</p>}
      {error && <p role="alert" className="mb-3 flex items-center gap-2 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</p>}
      {message && <p role="status" className="mb-3 text-sm text-green-700">{message}</p>}

      {columnSetup && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4" aria-label="KPI-Spaltenzuordnung">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Spalten zuordnen</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(Object.keys(salesColumnLabels) as SalesColumn[]).map(field => <div key={field} className="space-y-1">
              <span className="text-xs text-gray-600">{salesColumnLabels[field]}</span>
              <AdminStatisticsSelect label={`Spalte ${salesColumnLabels[field]}`} value={String(columnSetup.mapping[field])} disabled={locked}
                options={[{ value: '-1', label: 'Nicht zugeordnet' }, ...columnSetup.headers.map((header, index) => ({ value: String(index), label: `${XLSX.utils.encode_col(index)}: ${header}` }))]}
                onChange={value => setColumnSetup({ ...columnSetup, mapping: { ...columnSetup.mapping, [field]: Number(value) } })} className="w-full" />
            </div>)}
          </div>
          <div className="mt-4 max-w-sm space-y-1">
            <span className="text-xs text-gray-600">Berichtsmonat importieren</span>
            <AdminStatisticsSelect label="Berichtsmonat importieren" value={columnSetup.month} disabled={locked || !fileMonths.length}
              options={fileMonths.map(value => ({ value, label: reportingMonthLabel(value) }))}
              onChange={value => setColumnSetup({ ...columnSetup, month: value })} className="w-full" />
          </div>
          <p className="mt-2 text-xs text-gray-600">Es werden nur die Zeilen des ausgewählten Monats aus der zugeordneten Monatsspalte übernommen.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <AdminStatisticsButton primary onClick={previewMappedColumns} disabled={locked || !fileMonths.includes(columnSetup.month)}>Vorschau prüfen</AdminStatisticsButton>
            <AdminStatisticsButton onClick={() => setColumnSetup(null)} disabled={locked}>Abbrechen</AdminStatisticsButton>
          </div>
        </div>
      )}

      {draft && (
        <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <strong>Vorschau {reportingMonthLabel(draft.waveMonth)}: {draft.rows.length} Zeilen, {draft.preview.matched} zugeordnet</strong>
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
              <AdminStatisticsCombobox label={`${row.name} zuordnen`} value={draft.rows.find(item => item.sourceRow === row.sourceRow)?.user_id || ''}
                onChange={next => assignRow(row.sourceRow, next)} disabled={locked} placeholder="Promotor auswählen"
                options={[{ value: '', label: 'Promotor auswählen' }, ...draft.preview.promotors.map(person => ({ value: person.user_id, label: person.name }))]}
                className="max-w-64" />
              <AdminStatisticsButton aria-label={`Zeile ${row.sourceRow} aus diesem Import entfernen`} title={`Zeile ${row.sourceRow} aus diesem Import entfernen`} disabled={locked}
                onClick={() => setDraft({ ...draft, rows: draft.rows.filter(item => item.sourceRow !== row.sourceRow) })}
                className="w-9 px-0"><X className="h-4 w-4" /></AdminStatisticsButton>
            </div>
          ))}
          {(draft.preview.mismatches || []).map(row => (
            <p key={row.sourceRow} className="text-sm text-red-700">Zeile {row.sourceRow}: {row.name} – andere Mengen bei {row.fields.join(', ')}.</p>
          ))}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AdminStatisticsButton onClick={recheck} disabled={locked}>Zuordnung prüfen</AdminStatisticsButton>
            <AdminStatisticsButton primary onClick={saveDraft} disabled={locked || !workflowReady || !!draft.preview.unmatched?.length || !!draft.preview.mismatches?.length}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Import übernehmen
            </AdminStatisticsButton>
            <AdminStatisticsButton onClick={() => setDraft(null)} disabled={locked}>Abbrechen</AdminStatisticsButton>
          </div>
        </div>
      )}

      <TabsContent value={tab} className="m-0 focus-visible:ring-0 focus-visible:ring-offset-0">
      {tab === 'kpi' ? (feedbackMode && workflowReady ? feedbackContent :
        <div className={`overflow-x-auto rounded-lg focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-300 ${adminScrollClass}`} tabIndex={0} aria-label="Verkaufszahlen">
          <table className="w-full min-w-[750px] text-left text-sm">
            <thead className="border-b border-gray-200 text-xs text-gray-500"><tr>
              <th className="py-2">Promotor</th><th>MC/ET</th><th>TMA/TAP</th><th>VL Share</th><th>VL Up</th>
              <th>MC</th><th>ET</th><th>TMA</th><th>GS</th><th>VL</th><th>Aeroccino</th><th className="text-right">Prüfung</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {pendingSales.map(row => <tr key={row.id}>
                <td className="py-2 font-medium text-gray-900">{row.promotor_name}</td>
                <td className={kpiColor('mcet',row.mc_et)} style={kpiColorStyle(kpiColor('mcet',row.mc_et))}>{Number(row.mc_et).toFixed(1)}</td>
                <td className={kpiColor('tma',row.tap_quote)} style={kpiColorStyle(kpiColor('tma',row.tap_quote))}>{Number(row.tap_quote).toFixed(1)}%</td>
                <td className={kpiColor('vlshare',row.vl_share)} style={kpiColorStyle(kpiColor('vlshare',row.vl_share))}>{Number(row.vl_share).toFixed(1)}%</td><td>{row.vl_up}</td>
                <td>{row.mc}</td><td>{Number(row.einsatztage).toLocaleString('de-AT')}</td>
                <td>{row.tma}</td><td>{row.gs}</td><td>{row.vl}</td><td>{row.aeroccino}</td>
                <td className="py-2 text-right">{workflowReady ? <AdminStatisticsButton aria-label={`${row.promotor_name}: KPIs validieren`} aria-pressed={!!validation[row.id]}
                  disabled={locked || !workflowReady || !validSales(row)} onClick={() => onValidate(row.id)} className={validation[row.id] ? 'border-green-200 bg-green-50 text-green-700' : ''}>
                  {validation[row.id] ? <><Check className="h-4 w-4" /> Validiert</> : 'Validieren'}
                </AdminStatisticsButton> : <span className="text-xs text-gray-500">Veröffentlicht</span>}</td>
              </tr>)}
            </tbody>
          </table>
          {!pendingSales.length && <p className="py-6 text-sm text-gray-500">Für {reportingMonthLabel(month)} liegen keine ungesendeten KPIs vor.</p>}
        </div>
      ) : (
        <>
          <div className="mb-5 border-b border-gray-200 pb-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-gray-900">Prämiensätze für {reportingMonthLabel(month)}</h3>
              <AdminStatisticsButton primary onClick={() => saveRates(null, rates)} disabled={locked}><Save className="h-4 w-4" /> Sätze speichern</AdminStatisticsButton>
            </div>
            {rateInputs(rates, setRates)}
            <div className="mt-4 flex flex-wrap items-end gap-2">
              <div className="w-full max-w-sm space-y-1">
                <label htmlFor="premium-person" className="block text-xs text-gray-600">Abweichender Satz für</label>
                <AdminStatisticsCombobox id="premium-person" label="Abweichender Satz für" value={selectedUser} disabled={locked} onChange={id => {
                  setSelectedUser(id);
                  const saved = overrides.find(row => row.user_id === id);
                  setOverrideRates(saved ? Object.fromEntries(rateFields.map(field => [field.key, Number(saved[field.key])])) as PremiumRates : rates);
                }} placeholder="Promotor auswählen" options={[{ value: '', label: 'Promotor auswählen' }, ...promotors.map(person => ({ value: person.user_id, label: person.name }))]} />
              </div>
              {selectedUser && <AdminStatisticsButton primary onClick={() => saveRates(selectedUser, overrideRates)} disabled={locked}>Sonderrate speichern</AdminStatisticsButton>}
            </div>
            {selectedUser && <div className="mt-2">{rateInputs(overrideRates, setOverrideRates)}</div>}
            {selectedUser && selectedStatement && <div className="mt-3 space-y-2">
              <AdminStatisticsButton onClick={() => void updateStatement(false)} disabled={locked || hasUnsavedRates}>Abrechnung aktualisieren</AdminStatisticsButton>
              {hasUnsavedRates && <p className="text-xs text-gray-600">Bitte zuerst die Sonderrate speichern.</p>}
              {correction && <div role="region" aria-label="Abrechnung bestätigen" className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium">{promotors.find(person => person.user_id === correction.userId)?.name} · {correction.waveMonth}</p>
                <p className="mt-1 text-sm tabular-nums">Bisher: {correction.oldAmount === null ? '—' : euro(correction.oldAmount)} → Neu: {euro(correction.newAmount)}</p>
                <p className="mt-1 text-xs text-gray-600">Die gespeicherten Verkaufsmengen bleiben erhalten.</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AdminStatisticsButton primary onClick={() => void updateStatement(true)} disabled={locked}>Änderung speichern</AdminStatisticsButton>
                  <AdminStatisticsButton onClick={() => setCorrection(null)} disabled={locked}>Abbrechen</AdminStatisticsButton>
                </div>
              </div>}
            </div>}
            {overrides.length > 0 && <p className="mt-2 text-xs text-gray-500">Sonderraten: {overrides.map(row => row.name).join(', ')}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <AdminStatisticsButton onClick={() => calculateFromKpis(true)} disabled={locked || !sales.length || premiums.length > 0}>Aus KPIs berechnen</AdminStatisticsButton>
              {calculation && <>
                <span className="text-sm text-gray-600">{calculation.count} Personen · {euro(calculation.total)}</span>
                <AdminStatisticsButton primary onClick={() => calculateFromKpis(false)} disabled={locked}>Berechnung speichern</AdminStatisticsButton>
                <AdminStatisticsButton onClick={() => setCalculation(null)} disabled={locked}>Abbrechen</AdminStatisticsButton>
              </>}
            </div>
            {premiums.length > 0 && <p className="mt-2 text-xs text-gray-600">Abrechnungen sind bereits gespeichert. Wähle einen Mitarbeiter, um seine Abrechnung zu aktualisieren.</p>}
          </div>
          <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><strong>Ausstehende Prämien · {reportingMonthLabel(month)}</strong>
            <strong>{euro(premiumRows.reduce((sum, row) => sum + Number(row.premium?.amount || 0), 0))}</strong></div>
          <div className={`max-h-[420px] overflow-auto rounded-lg focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-300 ${adminScrollClass}`} tabIndex={0} aria-label="Prämienabrechnungen">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="border-b border-gray-200 text-xs text-gray-500"><tr><th className="py-2">Promotor</th><th>MC/ET</th><th>TMA/TAP</th><th>VL Share</th><th>VL</th><th>VL Up</th><th>TMA</th><th>GS</th><th>Aeroccino</th><th className="text-right">Prämie</th><th className="text-right">Prüfung</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{premiumRows.map(({ sales: sale, premium: row }) => {
                const id = row?.id || sale!.id;
                const name = sale?.promotor_name || row!.promotor_name;
                const ready = premiumReady(sale,row);
                return <Fragment key={id}>
                  <tr>
                    <td className="py-2 font-medium text-gray-900">{row ? <button type="button" onClick={() => setExpandedPremiumId(expandedPremiumId === id ? null : id)}
                      title={`${name}: Prämie aufschlüsseln`} aria-expanded={expandedPremiumId === id}
                      className="inline-flex items-center gap-1 rounded-lg p-1 text-left hover:bg-gray-50 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-gray-500">
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedPremiumId === id ? 'rotate-180' : ''}`} />{name}
                    </button> : name}</td>
                    {(['mcet','tma','vlshare'] as const).map((metric,index) => { const value = sale ? [sale.mc_et,sale.tap_quote,sale.vl_share][index] : null;
                      return <td key={metric} className={value === null ? 'text-gray-400' : kpiColor(metric,value)} style={value === null ? {} : kpiColorStyle(kpiColor(metric,value))}>
                        {value === null ? '—' : `${Number(value).toFixed(1)}${index ? '%' : ''}`}</td>; })}
                    <td>{sale?.vl ?? row?.vertuo ?? '—'}</td><td>{sale?.vl_up ?? row?.vertuo_pop ?? '—'}</td><td>{sale?.tma ?? row?.tma ?? '—'}</td>
                    <td>{sale?.gs ?? row?.gutscheine ?? '—'}</td><td>{sale?.aeroccino ?? row?.aeroccino ?? '—'}</td>
                    <td className="text-right font-semibold tabular-nums">{row?.amount === null || !row ? '—' : euro(row.amount)}</td>
                    <td className="py-2 text-right">{!workflowReady ? <span className="text-xs text-gray-500">Bisherige Monatswerte</span> : ready && row ? <AdminStatisticsButton aria-label={`${name}: Prämie validieren`} aria-pressed={!!premiumValidation[id]}
                      disabled={locked || !workflowReady} className={premiumValidation[id] ? 'border-green-200 bg-green-50 text-green-700' : ''}
                      onClick={() => setPremiumValidation(previous => ({...previous,[id]:!previous[id]}))}>{premiumValidation[id] ? <><Check className="h-4 w-4" /> Validiert</> : 'Validieren'}</AdminStatisticsButton>
                      : <span className="text-xs text-gray-500">{!row ? 'Prämie fehlt' : !sale ? 'KPIs fehlen' : 'Mengen / Sätze prüfen'}</span>}</td>
                  </tr>
                  {row && expandedPremiumId === id && <tr><td colSpan={11} className="pb-3 text-xs text-gray-700">
                    {row.breakdown?.length ? <div className="grid gap-2 sm:grid-cols-5">{row.breakdown.map(item =>
                      <div key={item.key}><strong>{item.label}</strong><div>{item.count} × {euro(item.rate)} = {euro(item.amount)}</div></div>)}</div>
                      : 'Für diesen Eintrag sind noch keine Prämiensätze hinterlegt.'}
                  </td></tr>}
                </Fragment>;
              })}</tbody>
            </table>
            {!premiumRows.length && <p className="py-6 text-sm text-gray-500">Für {reportingMonthLabel(month)} sind keine Prämien mehr ausständig.</p>}
          </div>
          <p className="mt-2 text-xs text-gray-500">* Abweichender GS-Satz. Die verwendeten Sätze sind je Abrechnung gespeichert.</p>
        </>
      )}
      </TabsContent>
    </section>
    </Tabs>
  );
}
