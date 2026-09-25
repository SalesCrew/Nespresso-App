import { asNumber, calculatePremium, type PremiumRates } from '@/lib/statistics/monthlyKpi';

const RATE_KEYS: Array<keyof PremiumRates> = ['vl', 'vl_up', 'tma', 'gs', 'aeroccino'];

export function parsePremiumRates(value: unknown): PremiumRates {
  if (!value || typeof value !== 'object') throw new Error('Prämiensätze fehlen.');
  const source = value as Record<string, unknown>;
  const rates = {} as PremiumRates;
  for (const key of RATE_KEYS) {
    if (source[key] === null || source[key] === undefined || String(source[key]).trim() === '') {
      throw new Error(`Prämiensatz ${key} fehlt.`);
    }
    const number = asNumber(source[key], `Prämiensatz ${key}`);
    if (number < 0 || Math.abs(Math.round(number * 100) - number * 100) > 0.000001) {
      throw new Error(`Prämiensatz ${key} muss ein positiver Euro-Betrag mit höchstens zwei Nachkommastellen sein.`);
    }
    rates[key] = number;
  }
  if (!RATE_KEYS.some(key => rates[key] > 0)) throw new Error('Mindestens ein Prämiensatz muss größer als null sein.');
  return rates;
}

export function premiumAmount(row: Record<string, any>): number | null {
  if (row.total_amount !== null && row.total_amount !== undefined) return Number(row.total_amount);
  if (!row.rate_snapshot) return null;
  const rates = parsePremiumRates(row.rate_snapshot);
  return calculatePremium({
    tma: Number(row.tma || 0), gutscheine: Number(row.gutscheine || 0),
    vertuo: Number(row.vertuo || 0), vertuo_pop: Number(row.vertuo_pop || 0),
    aeroccino: Number(row.aeroccino || 0), rates,
  });
}

export function premiumBreakdown(row: Record<string, any>) {
  if (!row.rate_snapshot) return [];
  const rates = parsePremiumRates(row.rate_snapshot);
  const categories = [
    { key: 'vertuo', label: 'VL', count: Number(row.vertuo || 0), rate: rates.vl },
    { key: 'vertuo_pop', label: 'VL Up', count: Number(row.vertuo_pop || 0), rate: rates.vl_up },
    { key: 'tma', label: 'TMA/TAP', count: Number(row.tma || 0), rate: rates.tma },
    { key: 'gutscheine', label: 'GS', count: Number(row.gutscheine || 0), rate: rates.gs },
    { key: 'aeroccino', label: 'Aeroccino', count: Number(row.aeroccino || 0), rate: rates.aeroccino },
  ];
  return categories.map(category => ({ ...category, amount: Math.round(category.count * category.rate * 100) / 100 }));
}
