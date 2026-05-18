import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

const PRICE = {
  brutto: { tma: 7.5, gutscheine: 3.5, vertuo: 7.5, vertuo_pop: 7.5, aeroccino: 3.5, vorteilsbox: 0 },
  netto: { tma: 6.19, gutscheine: 2.89, vertuo: 6.19, vertuo_pop: 6.19, aeroccino: 2.89, vorteilsbox: 0 },
};

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientAsync();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get latest prämien entry for this user (by wave_month then updated_at)
    const { data: rows, error } = await supabase
      .from('kpi_praemien')
      .select('*')
      .eq('user_id', user.id)
      .order('wave_month', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const row: any | undefined = rows?.[0];
    if (!row) {
      return NextResponse.json({ waveMonth: null, updatedAt: null, values: null, totals: { brutto: 0, netto: 0 } });
    }

    const values = {
      gutscheine: row.gutscheine || 0,
      tma: row.tma || 0,
      vertuo: row.vertuo || 0,
      vertuo_pop: row.vertuo_pop || 0,
      aeroccino: row.aeroccino || 0,
      vorteilsbox: row.vorteilsbox || 0,
    };

    const brutto =
      values.tma * PRICE.brutto.tma +
      values.gutscheine * PRICE.brutto.gutscheine +
      values.vertuo * PRICE.brutto.vertuo +
      values.vertuo_pop * PRICE.brutto.vertuo_pop +
      values.aeroccino * PRICE.brutto.aeroccino +
      values.vorteilsbox * PRICE.brutto.vorteilsbox;

    const netto =
      values.tma * PRICE.netto.tma +
      values.gutscheine * PRICE.netto.gutscheine +
      values.vertuo * PRICE.netto.vertuo +
      values.vertuo_pop * PRICE.netto.vertuo_pop +
      values.aeroccino * PRICE.netto.aeroccino +
      values.vorteilsbox * PRICE.netto.vorteilsbox;

    return NextResponse.json({
      waveMonth: row.wave_month, // ISO date like 2025-11-01
      updatedAt: row.updated_at,
      values,
      totals: { brutto: Number(brutto.toFixed(2)), netto: Number(netto.toFixed(2)) },
      price: PRICE,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


