import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

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

    // Map to include promotor details at top level
    const feedbackWithDetails = (feedback || []).map((item: any) => {
      const profile = profileMap.get(item.user_id);
      return {
        ...item,
        promotor_name: profile?.display_name || 'Name nicht gefunden',
        promotor_email: ''
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

    const body = await req.json();
    const { feedbackItems } = body;

    if (!feedbackItems || !Array.isArray(feedbackItems)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Insert all feedback items
    const feedbackRecords = feedbackItems.map((item: any) => ({
      user_id: item.user_id,
      mc_et: parseFloat(item.mc_et),
      vl_value: parseFloat(item.vl_value),
      tma: parseFloat(item.tma),
      feedback_text: item.feedback_text,
      magic_touch: item.magic_touch || null,
      read: false
    }));

    const { data, error } = await svc
      .from('kpi_feedback')
      .insert(feedbackRecords)
      .select();

    if (error) {
      console.error('Error inserting KPI feedback:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      feedback: data
    });
  } catch (e: any) {
    console.error('Error in kpi-feedback:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

