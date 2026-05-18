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

    let totalBrutto = 0;
    let totalNetto = 0;
    for (const r of rows || []) {
      totalBrutto +=
        (r.tma || 0) * PRICE.brutto.tma +
        (r.gutscheine || 0) * PRICE.brutto.gutscheine +
        (r.vertuo || 0) * PRICE.brutto.vertuo +
        (r.vertuo_pop || 0) * PRICE.brutto.vertuo_pop +
        (r.aeroccino || 0) * PRICE.brutto.aeroccino +
        (r.vorteilsbox || 0) * PRICE.brutto.vorteilsbox;
      totalNetto +=
        (r.tma || 0) * PRICE.netto.tma +
        (r.gutscheine || 0) * PRICE.netto.gutscheine +
        (r.vertuo || 0) * PRICE.netto.vertuo +
        (r.vertuo_pop || 0) * PRICE.netto.vertuo_pop +
        (r.aeroccino || 0) * PRICE.netto.aeroccino +
        (r.vorteilsbox || 0) * PRICE.netto.vorteilsbox;
    }

    return NextResponse.json({
      totals: {
        brutto: Number(totalBrutto.toFixed(2)),
        netto: Number(totalNetto.toFixed(2)),
      },
      count: rows?.length || 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


