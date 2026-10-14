import { publishedRows } from '@/lib/statistics/publishedRows';
import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { premiumAmount } from '@/lib/statistics/premium';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: rows, error } = await publishedRows(server, 'kpi_praemien', { userId: user.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const amounts = (rows || []).map(row => premiumAmount(row));
  return NextResponse.json({
    amount: Math.round(amounts.reduce<number>((sum, value) => sum + (value || 0), 0) * 100) / 100,
    count: amounts.filter(value => value !== null).length,
    missingRatesCount: amounts.filter(value => value === null).length,
  });
}


