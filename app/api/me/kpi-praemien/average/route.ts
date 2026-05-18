import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const PRICE = {
  brutto: { tma: 7.5, gutscheine: 3.5, vertuo: 7.5, vertuo_pop: 7.5, aeroccino: 3.5, vorteilsbox: 0 },
  netto: { tma: 6.19, gutscheine: 2.89, vertuo: 6.19, vertuo_pop: 6.19, aeroccino: 2.89, vorteilsbox: 0 },
};

export async function GET(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const queryWave = url.searchParams.get('waveMonth'); // expects YYYY-MM or full date

    const svc = createSupabaseServiceClient();

    // Determine target wave_month (date string 'YYYY-MM-01')
    let waveMonthISO: string | null = null;

    if (queryWave) {
      // Normalize query to YYYY-MM-01
      const normalized = queryWave.length === 7 ? `${queryWave}-01` : queryWave;
      waveMonthISO = normalized;
    } else {
      // Try latest user's wave first
      const { data: myRow } = await svc
        .from('kpi_praemien')
        .select('wave_month')
        .eq('user_id', user.id)
        .order('wave_month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (myRow?.wave_month) {
        waveMonthISO = myRow.wave_month as string;
      } else {
        // Fallback: latest wave across all
        const { data: latest } = await svc
          .from('kpi_praemien')
          .select('wave_month')
          .order('wave_month', { ascending: false })
          .limit(1)
          .maybeSingle();
        waveMonthISO = (latest?.wave_month as string) || null;
      }
    }

    if (!waveMonthISO) {
      return NextResponse.json({ waveMonth: null, count: 0, avg: { brutto: 0, netto: 0 } });
    }

    // Load all rows for that wave
    const { data: rows, error } = await svc
      .from('kpi_praemien')
      .select('gutscheine, tma, vertuo, vertuo_pop, aeroccino, vorteilsbox')
      .eq('wave_month', waveMonthISO);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const count = rows?.length || 0;
    if (!rows || count === 0) {
      return NextResponse.json({ waveMonth: waveMonthISO, count: 0, avg: { brutto: 0, netto: 0 } });
    }

    let sumBrutto = 0;
    let sumNetto = 0;
    for (const r of rows) {
      const brutto =
        (r.tma || 0) * PRICE.brutto.tma +
        (r.gutscheine || 0) * PRICE.brutto.gutscheine +
        (r.vertuo || 0) * PRICE.brutto.vertuo +
        (r.vertuo_pop || 0) * PRICE.brutto.vertuo_pop +
        (r.aeroccino || 0) * PRICE.brutto.aeroccino +
        (r.vorteilsbox || 0) * PRICE.brutto.vorteilsbox;

      const netto =
        (r.tma || 0) * PRICE.netto.tma +
        (r.gutscheine || 0) * PRICE.netto.gutscheine +
        (r.vertuo || 0) * PRICE.netto.vertuo +
        (r.vertuo_pop || 0) * PRICE.netto.vertuo_pop +
        (r.aeroccino || 0) * PRICE.netto.aeroccino +
        (r.vorteilsbox || 0) * PRICE.netto.vorteilsbox;

      sumBrutto += brutto;
      sumNetto += netto;
    }

    const avgBrutto = sumBrutto / count;
    const avgNetto = sumNetto / count;

    return NextResponse.json({
      waveMonth: waveMonthISO,
      count,
      avg: { brutto: Number(avgBrutto.toFixed(2)), netto: Number(avgNetto.toFixed(2)) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


