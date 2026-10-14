import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { asCount, asNumber, salesMetrics, validMonth, type SalesInput } from '@/lib/statistics/monthlyKpi';
import { missingDeliverySchema } from '@/lib/statistics/monthlyDelivery';
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

export async function GET(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const svc = createSupabaseServiceClient();
    let waveMonth = req.nextUrl.searchParams.get('waveMonth');
    if (waveMonth) waveMonth = validMonth(waveMonth);
    if (!waveMonth) {
      const { data: latest, error } = await svc.from('kpi_monthly_sales')
        .select('wave_month').order('wave_month', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      waveMonth = latest?.wave_month?.slice(0, 7) || null;
    }
    if (!waveMonth) return NextResponse.json({ waveMonth: null, items: [] });
    let { data: rows, error } = await svc.from('kpi_monthly_sales').select('*,sent_at')
      .eq('wave_month', `${waveMonth}-01`).order('mc', { ascending: false });
    const workflowReady = !missingDeliverySchema(error);
    if (!workflowReady) ({ data: rows, error } = await svc.from('kpi_monthly_sales').select('*').eq('wave_month', `${waveMonth}-01`).order('mc', { ascending: false }));
    if (error) throw error;
    const ids = (rows || []).map(row => row.user_id);
    const { data: profiles } = ids.length
      ? await svc.from('user_profiles').select('user_id, display_name').in('user_id', ids)
      : { data: [] };
    const names = new Map((profiles || []).map(profile => [profile.user_id, profile.display_name]));
    return NextResponse.json({
      waveMonth, workflowReady,
      items: (rows || []).map(row => ({ ...row, promotor_name: names.get(row.user_id) || '', ...salesMetrics(row) })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'KPI-Daten konnten nicht geladen werden.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const waveMonth = validMonth(body.waveMonth);
    const rows = body.rows;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 1000) {
      return NextResponse.json({ error: 'Die KPI-Datei muss 1 bis 1000 Zeilen enthalten.' }, { status: 400 });
    }
    const parsed: SalesInput[] = rows.map((row, index) => {
      const label = `Zeile ${Number(row?.sourceRow) || index + 2}`;
      const einsatztage = asNumber(row.einsatztage, `${label} ET`);
      if (einsatztage < 0) throw new Error(`${label}: ET darf nicht negativ sein.`);
      return {
        name: String(row.name || '').trim(), email: String(row.email || '').trim(),
        user_id: typeof row.user_id === 'string' ? row.user_id : undefined,
        sourceRow: Number(row.sourceRow) || index + 2,
        einsatztage, mc: asCount(row.mc, `${label} MC`), tma: asCount(row.tma, `${label} TMA`),
        gs: asCount(row.gs, `${label} GS`), vl: asCount(row.vl, `${label} VL`),
        vl_up: asCount(row.vl_up, `${label} VL Up`), aeroccino: asCount(row.aeroccino, `${label} Aeroccino`),
      };
    });
    const result = await resolvePromotors(parsed);
    const svc = createSupabaseServiceClient();
    const ids = result.matched.map(row => row.user_id);
    const { data: premiumRows, error: premiumError } = ids.length
      ? await svc.from('kpi_praemien').select('user_id, tma, gutscheine, vertuo, vertuo_pop, aeroccino')
        .eq('wave_month', `${waveMonth}-01`).in('user_id', ids)
      : { data: [], error: null };
    if (premiumError) throw premiumError;
    const premiumByUser = new Map((premiumRows || []).map(row => [row.user_id, row]));
    const mismatches = result.matched.flatMap(row => {
      const premium = premiumByUser.get(row.user_id);
      if (!premium) return [];
      const fields = [
        ['TMA', row.tma, premium.tma], ['GS', row.gs, premium.gutscheine],
        ['VL', row.vl, premium.vertuo], ['VL Up', row.vl_up, premium.vertuo_pop],
        ['Aeroccino', row.aeroccino, premium.aeroccino],
      ];
      const different = fields.filter(([, kpi, provision]) => kpi !== provision).map(([label]) => label);
      return different.length ? [{ name: row.name, sourceRow: row.sourceRow, fields: different }] : [];
    });
    const preview = {
      waveMonth,
      matched: result.matched.length,
      unmatched: result.unmatched,
      mismatches,
      promotors: result.promotors,
    };
    if (body.preview === true) return NextResponse.json(preview);
    if (result.unmatched.length || mismatches.length) {
      return NextResponse.json({ ...preview, error: 'Bitte Zuordnung und Mengenabweichungen prüfen.' }, { status: 422 });
    }

    const { data: existing, error: statusError } = await svc.from('kpi_monthly_sales').select('*,sent_at').eq('wave_month', `${waveMonth}-01`);
    if (missingDeliverySchema(statusError)) return NextResponse.json({ error: 'Der neue Import benötigt die vorbereitete Datenbankmigration.' }, { status: 503 });
    if (statusError) throw statusError;
    const published = new Map((existing || []).filter(row => row.sent_at !== null).map(row => [row.user_id,row]));
    const quantityFields = ['einsatztage','mc','tma','gs','vl','vl_up','aeroccino'] as const;
    if (result.matched.some(row => { const old = published.get(row.user_id); return old && quantityFields.some(key => Number(old[key]) !== row[key]); })) {
      return NextResponse.json({ error: 'Diese KPI-Werte wurden bereits gesendet. Ein Import darf gesendete Monatswerte nicht ändern.' }, { status: 409 });
    }
    const pending = result.matched.filter(row => !published.has(row.user_id));
    if (!pending.length) return NextResponse.json({ ...preview, imported: 0, warning: 'Alle Zeilen wurden bereits gesendet.' });
    const { data, error } = await svc.from('kpi_monthly_sales').upsert(
      pending.map(row => ({
        user_id: row.user_id, wave_month: `${waveMonth}-01`, sent_at: null, einsatztage: row.einsatztage,
        mc: row.mc, tma: row.tma, gs: row.gs, vl: row.vl, vl_up: row.vl_up,
        aeroccino: row.aeroccino, updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,wave_month' },
    ).select('id');
    if (error) throw error;
    return NextResponse.json({ ...preview, imported: data?.length || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'KPI-Import fehlgeschlagen.' }, { status: (error as { code?: string }).code === 'PT409' ? 409 : 400 });
  }
}
