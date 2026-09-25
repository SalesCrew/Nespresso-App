import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { salesMetrics } from '@/lib/statistics/monthlyKpi';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows, error } = await server.from('kpi_monthly_sales').select('*')
    .eq('user_id', user.id).order('wave_month', { ascending: false }).limit(12);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: (rows || []).map(row => ({ ...row, ...salesMetrics(row) })) });
}
