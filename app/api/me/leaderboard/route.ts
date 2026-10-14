import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { buildLeaderboard } from '@/lib/statistics/rankings';

export async function GET(req: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  if (!auth.isAdmin && auth.role !== 'promotor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const month = params.get('waveMonth') || undefined;
  const timeframe = params.get('timeframe') || '30days';
  if ((month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) || !['30days', '6months', 'alltime'].includes(timeframe)) {
    return NextResponse.json({ error: 'Invalid reporting period' }, { status: 400 });
  }
  try {
    const svc = createSupabaseServiceClient();
    const allRows = async (table: string, columns: string, order = 'id') => {
      const rows: Record<string, any>[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await svc.from(table).select(columns).order(order).range(offset, offset + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) return rows;
      }
    };
    const [sales, feedback, profiles] = await Promise.all([
      allRows('kpi_monthly_sales', '*'), allRows('kpi_feedback', '*'),
      allRows('user_profiles', 'user_id,role,deleted,display_name', 'user_id'),
    ]);
    return NextResponse.json(buildLeaderboard(sales, feedback, profiles, { userId: auth.user.id, admin: auth.isAdmin, month, timeframe }),
      { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Leaderboard query failed', error);
    return NextResponse.json({ error: 'Ranks konnten nicht geladen werden.' }, { status: 500 });
  }
}
