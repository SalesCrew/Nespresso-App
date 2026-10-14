import { publishedRows } from '@/lib/statistics/publishedRows';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { validMonth } from '@/lib/statistics/monthlyKpi';
import { premiumAmount } from '@/lib/statistics/premium';

export async function GET(req: NextRequest) {
  const server = await createSupabaseServerClientAsync();
  const { data: { user } } = await server.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const svc = createSupabaseServiceClient();
    const requested = req.nextUrl.searchParams.get('waveMonth');
    let month = requested ? validMonth(requested.slice(0, 7)) : null;
    if (!month) {
      const { data: rows, error } = await publishedRows(server, 'kpi_praemien', { userId: user.id, limit: 1 });
      const mine = rows?.[0];
      if (error) throw error;
      month = mine?.wave_month?.slice(0, 7) || null;
    }
    if (!month) return NextResponse.json({ waveMonth: null, count: 0, averageAmount: null });
    const { data: rows, error } = await publishedRows(svc, 'kpi_praemien', { month: `${month}-01` });
    if (error) throw error;
    const amounts = (rows || []).map(row => premiumAmount(row)).filter((value): value is number => value !== null);
    return NextResponse.json({
      waveMonth: month,
      count: amounts.length,
      averageAmount: amounts.length ? Math.round(amounts.reduce((sum, value) => sum + value, 0) * 100 / amounts.length) / 100 : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Durchschnitt konnte nicht geladen werden.' }, { status: 400 });
  }
}


