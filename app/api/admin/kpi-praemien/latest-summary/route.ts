import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: profile } = await server.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const svc = createSupabaseServiceClient();
  const [salesLatest, premiumLatest] = await Promise.all([
    svc.from('kpi_monthly_sales').select('wave_month').order('wave_month', { ascending: false }).limit(1).maybeSingle(),
    svc.from('kpi_praemien').select('wave_month').order('wave_month', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (salesLatest.error || premiumLatest.error) {
    return NextResponse.json({ error: 'Monatsdaten konnten nicht geladen werden.' }, { status: 500 });
  }
  const waveMonth = [salesLatest.data?.wave_month, premiumLatest.data?.wave_month]
    .filter(Boolean).sort().pop()?.slice(0, 7) || null;
  if (!waveMonth) return NextResponse.json({ waveMonth: null, completion: 0, highlight: false });
  const [sales, premiums] = await Promise.all([
    svc.from('kpi_monthly_sales').select('user_id').eq('wave_month', `${waveMonth}-01`),
    svc.from('kpi_praemien').select('user_id').eq('wave_month', `${waveMonth}-01`),
  ]);
  if (sales.error || premiums.error) {
    return NextResponse.json({ error: 'Monatsdaten konnten nicht verglichen werden.' }, { status: 500 });
  }
  const salesIds = new Set((sales.data || []).map(row => row.user_id));
  const premiumIds = new Set((premiums.data || []).map(row => row.user_id));
  const missingCount = [...salesIds].filter(id => !premiumIds.has(id)).length;
  return NextResponse.json({
    waveMonth,
    kpiUserCount: salesIds.size,
    praemienCount: premiumIds.size,
    completion: salesIds.size ? Math.round(((salesIds.size - missingCount) / salesIds.size) * 100) : 0,
    highlight: missingCount > 0,
  });
}


