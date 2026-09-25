import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { asCount, calculatePremium, validMonth, type PremiumInput, type PremiumRates } from '@/lib/statistics/monthlyKpi';
import { parsePremiumRates } from '@/lib/statistics/premium';
import { resolvePromotors } from '@/lib/statistics/resolvePromotors';

async function requireAdmin() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await server.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

async function saveMonthRates(waveMonth: string, defaults: PremiumRates, exceptions: Array<{ user_id: string; rates: PremiumRates }>) {
  const svc = createSupabaseServiceClient();
  const date = `${waveMonth}-01`;
  const { data: existing, error } = await svc.from('kpi_premium_rates').select('id, user_id').eq('wave_month', date);
  if (error) throw error;
  const byUser = new Map((existing || []).map(row => [row.user_id || '', row.id]));
  const records = [{ user_id: null, rates: defaults }, ...exceptions];
  for (const record of records) {
    const values = { wave_month: date, user_id: record.user_id, ...record.rates, updated_at: new Date().toISOString() };
    const id = byUser.get(record.user_id || '');
    const write = id
      ? await svc.from('kpi_premium_rates').update(values).eq('id', id)
      : await svc.from('kpi_premium_rates').insert(values);
    if (write.error) throw write.error;
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const waveMonth = validMonth(body.waveMonth);
    if (!Array.isArray(body.rows) || body.rows.length < 1 || body.rows.length > 1000) {
      return NextResponse.json({ error: 'Die Provisionsdatei muss 1 bis 1000 Zeilen enthalten.' }, { status: 400 });
    }
    const defaultRates = body.defaultRates ? parsePremiumRates(body.defaultRates) : null;
    const parsed: PremiumInput[] = body.rows.map((row: Record<string, unknown>, index: number) => {
      const label = `Zeile ${Number(row.sourceRow) || index + 2}`;
      const rates = parsePremiumRates(row.rates || defaultRates);
      return {
        name: String(row.name || '').trim(),
        user_id: typeof row.user_id === 'string' ? row.user_id : undefined,
        sourceRow: Number(row.sourceRow) || index + 2,
        vertuo: asCount(row.vertuo, `${label} VL`),
        vertuo_pop: asCount(row.vertuo_pop, `${label} VL Up`),
        tma: asCount(row.tma, `${label} TMA`),
        gutscheine: asCount(row.gutscheine, `${label} GS`),
        aeroccino: asCount(row.aeroccino, `${label} Aeroccino`),
        rates,
      };
    });
    const resolved = await resolvePromotors(parsed);
    const svc = createSupabaseServiceClient();
    const ids = resolved.matched.map(row => row.user_id);
    const { data: salesRows, error: salesError } = ids.length
      ? await svc.from('kpi_monthly_sales').select('user_id, tma, gs, vl, vl_up, aeroccino')
        .eq('wave_month', `${waveMonth}-01`).in('user_id', ids)
      : { data: [], error: null };
    if (salesError) throw salesError;
    const salesByUser = new Map((salesRows || []).map(row => [row.user_id, row]));
    const mismatches = resolved.matched.flatMap(row => {
      const sales = salesByUser.get(row.user_id);
      if (!sales) return [];
      const fields = [
        ['TMA', row.tma, sales.tma], ['GS', row.gutscheine, sales.gs],
        ['VL', row.vertuo, sales.vl], ['VL Up', row.vertuo_pop, sales.vl_up],
        ['Aeroccino', row.aeroccino, sales.aeroccino],
      ];
      const different = fields.filter(([, premium, kpi]) => premium !== kpi).map(([label]) => label);
      return different.length ? [{ name: row.name, sourceRow: row.sourceRow, fields: different }] : [];
    });
    const preview = {
      waveMonth, matched: resolved.matched.length, unmatched: resolved.unmatched,
      mismatches, promotors: resolved.promotors,
      total: resolved.matched.reduce((sum, row) => sum + calculatePremium(row), 0),
    };
    if (body.preview === true) return NextResponse.json(preview);
    if (resolved.unmatched.length || mismatches.length) {
      return NextResponse.json({ ...preview, error: 'Bitte Zuordnung und Mengenabweichungen prüfen.' }, { status: 422 });
    }

    const { data, error } = await svc.from('kpi_praemien').upsert(
      resolved.matched.map(row => ({
        user_id: row.user_id, wave_month: `${waveMonth}-01`,
        gutscheine: row.gutscheine, tma: row.tma, vertuo: row.vertuo,
        vertuo_pop: row.vertuo_pop, aeroccino: row.aeroccino,
        vorteilsbox: 0, rate_snapshot: row.rates,
        total_amount: calculatePremium(row),
      })),
      { onConflict: 'user_id,wave_month' },
    ).select('id');
    if (error) throw error;

    let rateWarning: string | null = null;
    if (defaultRates) {
      const exceptions = resolved.matched.filter(row =>
        Object.keys(defaultRates).some(key => row.rates[key as keyof PremiumRates] !== defaultRates[key as keyof PremiumRates]),
      ).map(row => ({ user_id: row.user_id, rates: row.rates }));
      try {
        await saveMonthRates(waveMonth, defaultRates, exceptions);
      } catch {
        rateWarning = 'Prämien gespeichert, aber die Satzvorlage konnte nicht gespeichert werden.';
      }
    }
    return NextResponse.json({ ...preview, imported: data?.length || 0, warning: rateWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Provisionsimport fehlgeschlagen.' }, { status: 400 });
  }
}


