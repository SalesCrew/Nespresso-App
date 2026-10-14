"use client";

import { useEffect, useMemo, useState } from 'react';
import { kpiColor, kpiColorStyle } from '@/lib/statistics/kpiPresentation';
import { BarChart3, Gift } from 'lucide-react';

type SalesRow = {
  wave_month: string;
  einsatztage: number;
  mc: number;
  tma: number;
  gs: number;
  vl: number;
  vl_up: number;
  aeroccino: number;
  mc_et: number;
  tap_quote: number;
  vl_share: number;
};
type PremiumRow = {
  waveMonth: string;
  amount: number | null;
  breakdown: Array<{ key: string; label: string; count: number; rate: number; amount: number }>;
};

const euro = (value: number) => value.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' });
const monthLabel = (value: string) => new Date(`${value.slice(0, 7)}-01T12:00:00`).toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });

export default function MonthlyMetricsPromotor() {
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [premiums, setPremiums] = useState<PremiumRow[]>([]);
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/me/monthly-kpis', { cache: 'no-store' }),
      fetch('/api/me/kpi-praemien', { cache: 'no-store' }),
    ]).then(async ([salesResponse, premiumResponse]) => {
      const [salesData, premiumData] = await Promise.all([salesResponse.json(), premiumResponse.json()]);
      if (!salesResponse.ok || !premiumResponse.ok) throw new Error(salesData.error || premiumData.error || 'Monatszahlen konnten nicht geladen werden.');
      if (!active) return;
      const nextSales = salesData.items || [];
      const nextPremiums = premiumData.items || [];
      setSales(nextSales);
      setPremiums(nextPremiums);
      setMonth((nextSales[0]?.wave_month || nextPremiums[0]?.waveMonth || '').slice(0, 7));
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Monatszahlen konnten nicht geladen werden.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const months = useMemo(() => Array.from(new Set([
    ...sales.map(row => row.wave_month.slice(0, 7)),
    ...premiums.map(row => row.waveMonth.slice(0, 7)),
  ])).sort().reverse(), [sales, premiums]);
  const salesRow = sales.find(row => row.wave_month.startsWith(month));
  const premiumRow = premiums.find(row => row.waveMonth.startsWith(month));

  return (
    <section className="mb-8 border-y border-gray-200 bg-white px-4 py-5 dark:border-gray-800 dark:bg-gray-900" aria-label="Deine Monatszahlen">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Deine Monatszahlen</h2>
        {months.length > 0 && (
          <label className="text-xs text-gray-600 dark:text-gray-300">Monat
            <select value={month} onChange={event => setMonth(event.target.value)}
              className="ml-2 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100">
              {months.map(value => <option key={value} value={value}>{monthLabel(value)}</option>)}
            </select>
          </label>
        )}
      </div>
      {loading && <p className="text-sm text-gray-500">Monatszahlen werden geladen...</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!loading && !error && !months.length && <p className="text-sm text-gray-500">Noch keine Monatszahlen vorhanden.</p>}
      {!loading && !error && months.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"><BarChart3 className="h-4 w-4" /> Verkaufs-KPIs</h3>
            {salesRow ? (
              <>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
                  <div><dt className="text-gray-500">MC/ET</dt><dd className={`font-semibold ${kpiColor('mcet',salesRow.mc_et)}`} style={kpiColorStyle(kpiColor('mcet',salesRow.mc_et))}>{Number(salesRow.mc_et).toFixed(1)}</dd></div>
                  <div><dt className="text-gray-500">TMA/TAP-Quote</dt><dd className={`font-semibold ${kpiColor('tma',salesRow.tap_quote)}`} style={kpiColorStyle(kpiColor('tma',salesRow.tap_quote))}>{Number(salesRow.tap_quote).toFixed(1)} %</dd></div>
                  <div><dt className="text-gray-500">VL Share</dt><dd className={`font-semibold ${kpiColor('vlshare',salesRow.vl_share)}`} style={kpiColorStyle(kpiColor('vlshare',salesRow.vl_share))}>{Number(salesRow.vl_share).toFixed(1)} %</dd></div>
                  <div><dt className="text-gray-500">VL Up</dt><dd className="font-semibold">{salesRow.vl_up}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-gray-500">{salesRow.mc} MC · {Number(salesRow.einsatztage).toLocaleString('de-AT')} ET · {salesRow.tma} TMA/TAP · {salesRow.gs} GS · {salesRow.vl} VL · {salesRow.aeroccino} Aeroccino</p>
              </>
            ) : <p className="text-sm text-gray-500">Für diesen Monat liegen noch keine Verkaufszahlen vor.</p>}
          </div>
          <div className="min-w-0 lg:border-l lg:border-gray-200 lg:pl-6 dark:lg:border-gray-800">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100"><Gift className="h-4 w-4" /> Prämienabrechnung</h3>
            {premiumRow ? (
              premiumRow.amount === null ? <p className="text-sm text-gray-500">Für diese Abrechnung sind noch keine Prämiensätze hinterlegt.</p> : <>
                <p className="mb-3 text-xl font-semibold text-gray-900 dark:text-gray-100">{euro(premiumRow.amount)}</p>
                <div className="space-y-1.5 text-sm">
                  {premiumRow.breakdown.map(item => <div key={item.key} className="flex items-center justify-between gap-3 border-b border-gray-100 py-1 dark:border-gray-800">
                    <span>{item.label}</span><span className="text-right tabular-nums">{item.count} × {euro(item.rate)} = {euro(item.amount)}</span>
                  </div>)}
                </div>
              </>
            ) : <p className="text-sm text-gray-500">Für diesen Monat liegt noch keine Prämienabrechnung vor.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
