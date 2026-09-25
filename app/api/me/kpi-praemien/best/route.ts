import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { premiumAmount } from '@/lib/statistics/premium';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows, error } = await server.from('kpi_praemien').select('*').eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const best = (rows || []).map(row => ({ waveMonth: row.wave_month, amount: premiumAmount(row) }))
    .filter(row => row.amount !== null).sort((a, b) => Number(b.amount) - Number(a.amount))[0] || null;
  return NextResponse.json({ best });
}


