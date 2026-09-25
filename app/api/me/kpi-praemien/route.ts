import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { premiumAmount, premiumBreakdown } from '@/lib/statistics/premium';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows, error } = await server.from('kpi_praemien').select('*')
    .eq('user_id', user.id).order('wave_month', { ascending: false }).limit(12);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = rows?.[0];
  if (!row) return NextResponse.json({ waveMonth: null, updatedAt: null, values: null, amount: null, breakdown: [], items: [] });
  const items = (rows || []).map(item => ({
    waveMonth: item.wave_month,
    updatedAt: item.updated_at,
    values: {
      gutscheine: item.gutscheine, tma: item.tma, vertuo: item.vertuo,
      vertuo_pop: item.vertuo_pop, aeroccino: item.aeroccino,
    },
    amount: premiumAmount(item),
    breakdown: premiumBreakdown(item),
  }));
  return NextResponse.json({
    ...items[0],
    items,
  });
}


