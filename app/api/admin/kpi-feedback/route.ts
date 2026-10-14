import { publishedRows } from '@/lib/statistics/publishedRows';
import { premiumAmount } from '@/lib/statistics/premium';
import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { kpiDeliverySchema, toKpiFeedbackRecords } from '@/lib/statistics/kpiFeedback';

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Check if user is admin
    const { data: profile } = await server
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();


    if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = createSupabaseServiceClient();

    // Fetch all feedback
    const { data: feedback, error } = await svc
      .from('kpi_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching KPI feedback:', error);
      return NextResponse.json({ error: 'Failed to fetch feedback', details: error }, { status: 500 });
    }


    // Fetch promotor details for each feedback
    const userIds = (feedback || []).map((f: any) => f.user_id);

    if (userIds.length === 0) {
      return NextResponse.json({ feedback: [] });
    }


    const { data: profiles, error: profileError } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError);
    }

    const profileMap = new Map((profiles || []).map((p: any) => {
      return [p.user_id, p];
    }));

    const { data: premiums, error: premiumError } = await publishedRows(svc, 'kpi_praemien');
    if (premiumError) throw premiumError;
    const premiumByMonth = new Map((premiums || []).map(row => [`${row.user_id}:${row.wave_month}`,row]));

    // Map to include promotor details at top level
    const feedbackWithDetails = (feedback || []).map((item: any) => {
      const profile = profileMap.get(item.user_id);
      const premium = premiumByMonth.get(`${item.user_id}:${item.wave_month}`);
      return {
        ...item,
        promotor_name: profile?.display_name || 'Name nicht gefunden',
        promotor_email: '',
        premium_amount: premium ? premiumAmount(premium) : null,
        premium_sent_at: premium?.sent_at || null
      };
    });

    return NextResponse.json({ feedback: feedbackWithDetails });
  } catch (e: any) {
    console.error('Error in kpi-feedback GET:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 }); }
    const parsed = kpiDeliverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Bitte prüfe Promotor, KPI-Werte und die Nachricht.', issues: parsed.error.issues }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();
    const recipientIds = [...new Set(parsed.data.feedbackItems.map(item => item.user_id))];
    const { data: recipients, error: recipientError } = await svc
      .from('user_profiles').select('user_id, role, deleted').in('user_id', recipientIds);
    if (recipientError) return NextResponse.json({ error: 'Promotor-Zuordnung konnte nicht geprüft werden.' }, { status: 500 });
    if (recipients?.length !== recipientIds.length || recipients.some(recipient => recipient.role !== 'promotor' || recipient.deleted === true)) {
      return NextResponse.json({ error: 'Bitte ordne jede Karte einem aktiven Promotor zu.' }, { status: 400 });
    }

    const { data, error } = await svc.from('kpi_feedback')
      .insert(toKpiFeedbackRecords(parsed.data)).select();
    if (error) {
      console.error('Error inserting KPI feedback:', error);
      return NextResponse.json({ error: 'KPIs konnten nicht gespeichert werden.' }, { status: 500 });
    }
    return NextResponse.json({ success: true, count: data?.length || 0, feedback: data });
  } catch (e) {
    console.error('Error in kpi-feedback POST:', e);
    return NextResponse.json({ error: 'KPIs konnten nicht gespeichert werden.' }, { status: 500 });
  }
}
