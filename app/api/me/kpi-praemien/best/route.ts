import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const PRICE = {
  brutto: { tma: 7.5, gutscheine: 3.5, vertuo: 7.5, vertuo_pop: 7.5, aeroccino: 3.5, vorteilsbox: 0 },
  netto: { tma: 6.19, gutscheine: 2.89, vertuo: 6.19, vertuo_pop: 6.19, aeroccino: 2.89, vorteilsbox: 0 },
};

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = createSupabaseServiceClient();
    const { data: rows, error } = await svc
      .from('kpi_praemien')
      .select('gutscheine, tma, vertuo, vertuo_pop, aeroccino, vorteilsbox')
      .eq('user_id', user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const best = {
      gutscheine: 0,
      tma: 0,
      vertuo: 0,
      vertuo_pop: 0,
      aeroccino: 0,
      vorteilsbox: 0,
    };
    for (const r of rows || []) {
      best.gutscheine = Math.max(best.gutscheine, r.gutscheine || 0);
      best.tma = Math.max(best.tma, r.tma || 0);
      best.vertuo = Math.max(best.vertuo, r.vertuo || 0);
      best.vertuo_pop = Math.max(best.vertuo_pop, r.vertuo_pop || 0);
      best.aeroccino = Math.max(best.aeroccino, r.aeroccino || 0);
      best.vorteilsbox = Math.max(best.vorteilsbox, r.vorteilsbox || 0);
    }

    const calcTotals = (kind: 'brutto' | 'netto') => {
      const p = PRICE[kind];
      const total =
        best.tma * p.tma +
        best.gutscheine * p.gutscheine +
        best.vertuo * p.vertuo +
        best.vertuo_pop * p.vertuo_pop +
        best.aeroccino * p.aeroccino +
        best.vorteilsbox * p.vorteilsbox;
      return Number(total.toFixed(2));
    };

    const totals = { brutto: calcTotals('brutto'), netto: calcTotals('netto') };
    return NextResponse.json({ best, totals, price: PRICE });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


