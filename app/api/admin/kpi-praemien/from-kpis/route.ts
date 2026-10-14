import { missingDeliverySchema } from '@/lib/statistics/monthlyDelivery';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { calculatePremium, validMonth } from '@/lib/statistics/monthlyKpi';
import { parsePremiumRates } from '@/lib/statistics/premium';

export async function POST(req: NextRequest) {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await server.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const month = validMonth(body.waveMonth);
    const svc = createSupabaseServiceClient();
    const status = await svc.from('kpi_praemien').select('sent_at').limit(1);
    if (missingDeliverySchema(status.error)) return NextResponse.json({ error: 'Die Berechnung benötigt die vorbereitete Datenbankmigration.' }, { status: 503 });
    if (status.error) throw status.error;
    const date = `${month}-01`;
    const [{ data: sales, error: salesError }, { data: rates, error: ratesError }, { data: existing, error: existingError }] = await Promise.all([
      svc.from('kpi_monthly_sales').select('user_id, tma, gs, vl, vl_up, aeroccino').eq('wave_month', date),
      svc.from('kpi_premium_rates').select('*').eq('wave_month', date),
      svc.from('kpi_praemien').select('user_id').eq('wave_month', date),
    ]);
    if (salesError || ratesError || existingError) throw salesError || ratesError || existingError;
    if (!sales?.length) return NextResponse.json({ error: 'Für diesen Monat sind noch keine KPIs importiert.' }, { status: 400 });
    const defaultRow = rates?.find(row => !row.user_id);
    if (!defaultRow) return NextResponse.json({ error: 'Bitte zuerst die Standard-Prämiensätze für diesen Monat speichern.' }, { status: 400 });
    const defaults = parsePremiumRates(defaultRow);
    const overrideByUser = new Map((rates || []).filter(row => row.user_id).map(row => [row.user_id, parsePremiumRates(row)]));
    const existingUsers = new Set((existing || []).map(row => row.user_id));
    if (existingUsers.size && body.replace !== true) {
      return NextResponse.json({ error: 'Für diesen Monat existieren bereits Prämien. Vorhandene Abrechnungen werden nicht überschrieben.' }, { status: 409 });
    }
    const records = sales.map(row => {
      const rateSnapshot = overrideByUser.get(row.user_id) || defaults;
      const counts = {
        tma: row.tma, gutscheine: row.gs, vertuo: row.vl,
        vertuo_pop: row.vl_up, aeroccino: row.aeroccino,
      };
      return {
        user_id: row.user_id, wave_month: date, sent_at: null, ...counts,
        vorteilsbox: 0, rate_snapshot: rateSnapshot,
        total_amount: calculatePremium({ ...counts, rates: rateSnapshot }),
      };
    });
    const total = Math.round(records.reduce((sum, row) => sum + row.total_amount, 0) * 100) / 100;
    if (body.preview === true) return NextResponse.json({ waveMonth: month, count: records.length, total });
    const { data, error } = await svc.from('kpi_praemien')
      .upsert(records, { onConflict: 'user_id,wave_month' }).select('id');
    if (error) throw error;
    return NextResponse.json({ waveMonth: month, imported: data?.length || 0, total });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Prämien konnten nicht berechnet werden.' }, { status: (error as { code?: string }).code === 'PT409' ? 409 : 500 });
  }
}
