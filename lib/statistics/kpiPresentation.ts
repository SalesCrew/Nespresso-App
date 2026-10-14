export type KpiMetric = 'mcet' | 'tma' | 'vlshare';

export function kpiColor(metric: KpiMetric, value: number): string {
  const displayedValue = Math.round(value * 10) / 10;
  const [green, orange] = metric === 'mcet' ? [4.5, 4] : metric === 'tma' ? [75, 65] : [10, 6];
  if (displayedValue >= green) return 'text-green-600 dark:text-green-400';
  if (displayedValue >= orange) return 'custom-orange';
  return 'text-red-600 dark:text-red-400';
}

export const kpiColorStyle = (color: string) => color === 'custom-orange' ? { color: '#FD7E14' } : {};
export const reportingMonthLabel = (value: string) => new Date(`${value.slice(0, 7)}-01T12:00:00`)
  .toLocaleDateString('de-AT', { month: 'long', year: 'numeric' });
