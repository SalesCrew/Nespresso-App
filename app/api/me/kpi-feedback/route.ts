import { publishedRows } from '@/lib/statistics/publishedRows';
import { premiumAmount } from '@/lib/statistics/premium';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/routeGuards';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

export async function GET() {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (auth.role !== 'promotor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const server = await createSupabaseServerClientAsync();
    // Keep text feedback and KPI-only notifications independent: neither hides the other.
    const [messages, kpis] = await Promise.all([
      server.from('kpi_feedback').select('*').eq('user_id', auth.user.id).eq('read', false)
        .neq('feedback_text', '').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      server.from('kpi_feedback').select('*').eq('user_id', auth.user.id).eq('read', false)
        .eq('feedback_text', '').order('created_at', { ascending: false }),
    ]);
    if (messages.error || kpis.error) {
      return NextResponse.json({ error: 'KPIs konnten nicht geladen werden.' }, { status: 500 });
    }
    const { data: premiums, error: premiumError } = await publishedRows(server, 'kpi_praemien', { userId: auth.user.id });
    if (premiumError) return NextResponse.json({ error: 'Prämien konnten nicht geladen werden.' }, { status: 500 });
    const amounts = new Map((premiums || []).map(row => [row.wave_month,premiumAmount(row)]));
    const withPremium = (item: Record<string, any>) => ({ ...item,premium_amount: amounts.get(item.wave_month) ?? null });
    return NextResponse.json({ feedback: messages.data ? withPremium(messages.data) : null, kpis: (kpis.data || []).map(withPremium) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Error fetching KPI notifications:', e);
    return NextResponse.json({ error: 'KPIs konnten nicht geladen werden.' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await requireUser();
    if (!auth.ok) return auth.response;
    if (auth.role !== 'promotor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }); }
    const parsed = z.object({ feedback_id: z.string().uuid() }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'feedback_id required' }, { status: 400 });
    const server = await createSupabaseServerClientAsync();
    const { data, error } = await server.from('kpi_feedback').update({ read: true })
      .eq('id', parsed.data.feedback_id).eq('user_id', auth.user.id).select('id').maybeSingle();
    if (error) return NextResponse.json({ error: 'Lesestatus konnte nicht gespeichert werden.' }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'KPIs nicht gefunden.' }, { status: 404 });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('Error marking KPI notification as read:', e);
    return NextResponse.json({ error: 'Lesestatus konnte nicht gespeichert werden.' }, { status: 500 });
  }
}
