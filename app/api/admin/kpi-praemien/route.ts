import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { premiumAmount, premiumBreakdown, parsePremiumRates, premiumStatementUpdate } from '@/lib/statistics/premium';
import { validMonth } from '@/lib/statistics/monthlyKpi';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/routeGuards';

export async function GET(req: NextRequest) {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await server.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const monthParam = req.nextUrl.searchParams.get('waveMonth');
    const svc = createSupabaseServiceClient();
    let waveMonth = monthParam ? validMonth(monthParam) : null;
    if (!waveMonth) {
      const { data: latest, error } = await svc.from('kpi_praemien')
        .select('wave_month').order('wave_month', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      waveMonth = latest?.wave_month?.slice(0, 7) || null;
    }
    if (!waveMonth) return NextResponse.json({ waveMonth: null, items: [], totals: { amount: 0 } });
    const { data: rows, error } = await svc.from('kpi_praemien').select('*').eq('wave_month', `${waveMonth}-01`);
    if (error) throw error;
    const ids = (rows || []).map(row => row.user_id);
    const { data: profiles } = ids.length
      ? await svc.from('user_profiles').select('user_id, display_name').in('user_id', ids)
      : { data: [] };
    const names = new Map((profiles || []).map(row => [row.user_id, row.display_name]));
    const items = (rows || []).map(row => ({
      ...row, promotor_name: names.get(row.user_id) || '',
      amount: premiumAmount(row), breakdown: premiumBreakdown(row),
    }));
    const total = Math.round(items.reduce((sum, row) => sum + (row.amount || 0), 0) * 100) / 100;
    return NextResponse.json({ waveMonth, items, totals: { amount: total } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Prämien konnten nicht geladen werden.' }, { status: 500 });
  }
}

const correctionRequest = z.object({
  userId: z.string().uuid(),
  waveMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  preview: z.boolean().default(false),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
  expectedRates: z.unknown().optional(),
});

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }); }
    const parsed = correctionRequest.safeParse(body);
    if (!parsed.success || (!parsed.data.preview && (!parsed.data.expectedUpdatedAt || !parsed.data.expectedRates))) {
      return NextResponse.json({ error: 'Bitte Mitarbeiter, Monat und die bestätigte Vorschau prüfen.' }, { status: 400 });
    }
    const { userId, waveMonth, preview, expectedUpdatedAt, expectedRates } = parsed.data;
    const date = `${waveMonth}-01`;
    const svc = createSupabaseServiceClient();
    const [{ data: person, error: personError }, { data: statement, error: statementError }, { data: rates, error: ratesError }] = await Promise.all([
      svc.from('user_profiles').select('user_id').eq('user_id', userId).eq('role', 'promotor').eq('deleted', false).maybeSingle(),
      svc.from('kpi_praemien').select('*').eq('user_id', userId).eq('wave_month', date).maybeSingle(),
      svc.from('kpi_premium_rates').select('*').eq('wave_month', date),
    ]);
    if (personError || statementError || ratesError) {
      return NextResponse.json({ error: 'Abrechnung konnte nicht geladen werden.' }, { status: 500 });
    }
    if (!person || !statement) return NextResponse.json({ error: 'Abrechnung für diesen Mitarbeiter und Monat nicht gefunden.' }, { status: 404 });
    const savedRates = rates?.find(row => row.user_id === userId) || rates?.find(row => !row.user_id);
    if (!savedRates) return NextResponse.json({ error: 'Bitte zuerst die Prämiensätze für diesen Monat speichern.' }, { status: 400 });
    let update;
    try { update = premiumStatementUpdate(statement, savedRates); }
    catch { return NextResponse.json({ error: 'Bitte die gespeicherten Mengen und Prämiensätze prüfen.' }, { status: 400 }); }
    const result = {
      id: statement.id, userId, waveMonth, oldAmount: premiumAmount(statement),
      newAmount: update.total_amount, rateSnapshot: update.rate_snapshot, updatedAt: statement.updated_at,
    };
    if (preview) return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    let confirmedRates;
    try { confirmedRates = parsePremiumRates(expectedRates); }
    catch { return NextResponse.json({ error: 'Die bestätigte Vorschau ist ungültig.' }, { status: 400 }); }
    const ratesChanged = Object.keys(update.rate_snapshot).some(key =>
      confirmedRates[key as keyof typeof confirmedRates] !== update.rate_snapshot[key as keyof typeof confirmedRates]);
    if (expectedUpdatedAt !== statement.updated_at || ratesChanged) {
      return NextResponse.json({ error: 'Abrechnung oder Prämiensätze wurden geändert. Bitte lade die Daten neu und prüfe eine neue Vorschau.' }, { status: 409 });
    }
    // A single conditional update keeps quantities intact and rejects concurrent edits.
    const { data: saved, error: saveError } = await svc.from('kpi_praemien').update(update)
      .eq('id', statement.id).eq('user_id', userId).eq('wave_month', date)
      .eq('updated_at', expectedUpdatedAt).select('id, updated_at').maybeSingle();
    if (saveError) return NextResponse.json({ error: 'Abrechnung konnte nicht aktualisiert werden. Bitte versuche es erneut.' }, { status: 500 });
    if (!saved) return NextResponse.json({ error: 'Abrechnung wurde inzwischen geändert. Bitte prüfe eine neue Vorschau.' }, { status: 409 });
    return NextResponse.json({ ...result, updatedAt: saved.updated_at, success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Abrechnung konnte nicht aktualisiert werden.' }, { status: 500 });
  }
}
