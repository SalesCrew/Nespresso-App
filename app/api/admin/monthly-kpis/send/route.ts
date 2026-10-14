import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { missingDeliverySchema, monthlySendSchema } from '@/lib/statistics/monthlyDelivery';

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const parsed = monthlySendSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Bitte Monat und validierte Zeilen prüfen.' }, { status: 400 });
  const server = await createSupabaseServerClientAsync();
  const { data, error } = await server.rpc('send_monthly_statistics', {
    p_wave_month: `${parsed.data.waveMonth}-01`, p_kind: parsed.data.kind, p_rows: parsed.data.rows,
  });
  if (error) {
    const status = missingDeliverySchema(error) ? 503 : error.code === 'PT409' ? 409 : error.code === '42501' ? 403
      : error.code?.startsWith('22') ? 400 : 500;
    return NextResponse.json({ error: status === 503 ? 'Der Versand benötigt die vorbereitete Datenbankmigration.'
      : status === 500 ? 'Versand fehlgeschlagen. Die Zeilen bleiben zur Prüfung erhalten.' : error.message }, { status });
  }
  return NextResponse.json({ success: true, ...data });
}
