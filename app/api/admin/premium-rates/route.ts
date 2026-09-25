import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { validMonth } from '@/lib/statistics/monthlyKpi';
import { parsePremiumRates } from '@/lib/statistics/premium';

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
    const month = validMonth(req.nextUrl.searchParams.get('waveMonth'));
    const svc = createSupabaseServiceClient();
    const { data: rows, error } = await svc.from('kpi_premium_rates').select('*').eq('wave_month', `${month}-01`);
    if (error) throw error;
    const { data: promotors, error: promotersError } = await svc.from('user_profiles')
      .select('user_id, display_name').eq('role', 'promotor').eq('deleted', false).order('display_name');
    if (promotersError) throw promotersError;
    const ids = (rows || []).map(row => row.user_id).filter(Boolean);
    const { data: profiles } = ids.length
      ? await svc.from('user_profiles').select('user_id, display_name').in('user_id', ids)
      : { data: [] };
    const names = new Map((profiles || []).map(profile => [profile.user_id, profile.display_name]));
    return NextResponse.json({
      waveMonth: month,
      defaultRates: (rows || []).find(row => !row.user_id) || null,
      overrides: (rows || []).filter(row => row.user_id).map(row => ({ ...row, name: names.get(row.user_id) || '' })),
      promotors: (promotors || []).map(person => ({ user_id: person.user_id, name: person.display_name || '' })),
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Prämiensätze konnten nicht geladen werden.' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await req.json();
    const month = validMonth(body.waveMonth);
    const userId = typeof body.userId === 'string' && body.userId ? body.userId : null;
    const rates = parsePremiumRates(body.rates);
    const svc = createSupabaseServiceClient();
    if (userId) {
      const { data: promotor, error } = await svc.from('user_profiles')
        .select('user_id').eq('user_id', userId).eq('role', 'promotor').eq('deleted', false).maybeSingle();
      if (error || !promotor) return NextResponse.json({ error: 'Promotor nicht gefunden.' }, { status: 404 });
    }
    const lookup = svc.from('kpi_premium_rates').select('id').eq('wave_month', `${month}-01`);
    const { data: existing, error: lookupError } = await (userId
      ? lookup.eq('user_id', userId)
      : lookup.is('user_id', null)).maybeSingle();
    if (lookupError) throw lookupError;
    const values = { wave_month: `${month}-01`, user_id: userId, ...rates, updated_at: new Date().toISOString() };
    const write = existing
      ? await svc.from('kpi_premium_rates').update(values).eq('id', existing.id).select('id').single()
      : await svc.from('kpi_premium_rates').insert(values).select('id').single();
    if (write.error) throw write.error;
    return NextResponse.json({ ok: true, id: write.data.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Prämiensätze konnten nicht gespeichert werden.' }, { status: 400 });
  }
}
