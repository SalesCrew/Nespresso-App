import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { premiumAmount, premiumBreakdown } from '@/lib/statistics/premium';
import { validMonth } from '@/lib/statistics/monthlyKpi';

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


