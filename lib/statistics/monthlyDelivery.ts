import { z } from 'zod';
import { calculatePremium, salesMetrics } from './monthlyKpi';
import { parsePremiumRates } from './premium';

export const monthlySendSchema = z.object({
  waveMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  kind: z.enum(['kpi', 'premium']),
  rows: z.array(z.object({
    userId: z.string().uuid(),
    salesUpdatedAt: z.string().datetime({ offset: true }),
    premiumUpdatedAt: z.string().datetime({ offset: true }).optional(),
    feedbackText: z.string().trim().max(12000).optional(),
    magicTouch: z.string().trim().max(100).nullable().optional(),
  })).min(1).max(1000),
}).superRefine((request, ctx) => {
  if (new Set(request.rows.map(row => row.userId)).size !== request.rows.length)
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Promotoren dürfen nicht doppelt vorkommen.' });
  if (request.kind === 'premium' && request.rows.some(row => !row.premiumUpdatedAt))
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Prämienvorschau fehlt.' });
});

export type MonthlySalesRow = {
  id: string; user_id: string; wave_month: string; updated_at: string; sent_at?: string | null;
  promotor_name: string; einsatztage: number; mc: number; tma: number; gs: number;
  vl: number; vl_up: number; aeroccino: number; mc_et: number; tap_quote: number; vl_share: number;
};
export type MonthlyPremiumRow = {
  id: string; user_id: string; wave_month: string; updated_at: string; sent_at?: string | null;
  promotor_name: string; tma: number; gutscheine: number; vertuo: number; vertuo_pop: number;
  aeroccino: number; rate_snapshot: Record<string, number> | null; total_amount: number | null;
  amount: number | null; breakdown: Array<{ key: string; label: string; count: number; rate: number; amount: number }>;
};

// Undefined means a record from the pre-migration schema, which was already public.
export const isDelivered = (row: { sent_at?: string | null }) => row.sent_at !== null;

export function validSales(row: MonthlySalesRow): boolean {
  const metrics = salesMetrics(row);
  return Object.values(metrics).every(Number.isFinite) && metrics.mc_et >= 0 && Math.round(metrics.mc_et * 10) / 10 <= 999.9
    && metrics.tap_quote >= 0 && metrics.tap_quote <= 100 && metrics.vl_share >= 0 && metrics.vl_share <= 100;
}

export function premiumReady(sales?: MonthlySalesRow, premium?: MonthlyPremiumRow): boolean {
  if (!sales || !premium || !validSales(sales) || isDelivered(premium)
    || sales.user_id !== premium.user_id || sales.wave_month !== premium.wave_month
    || !premium.rate_snapshot || premium.total_amount === null) return false;
  const fields = ['vl', 'vl_up', 'tma', 'gs', 'aeroccino'];
  if (!fields.every(key => Number.isFinite(Number(premium.rate_snapshot![key])) && Number(premium.rate_snapshot![key]) >= 0)) return false;
  let amount: number;
  try { amount = calculatePremium({ ...premium, rates: parsePremiumRates(premium.rate_snapshot) }); }
  catch { return false; }
  return sales.vl === premium.vertuo && sales.vl_up === premium.vertuo_pop && sales.tma === premium.tma
    && sales.gs === premium.gutscheine && sales.aeroccino === premium.aeroccino
    && amount === Number(premium.total_amount);
}

export function missingDeliverySchema(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === '42703' || error.code === 'PGRST204' || error.code === 'PGRST202');
}
