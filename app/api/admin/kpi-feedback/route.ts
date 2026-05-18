import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  console.log('🔍 KPI-FEEDBACK GET: Request started');
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    
    if (!user) {
      console.log('❌ No authenticated user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ User authenticated:', user.id);

    // Check if user is admin
    const { data: profile } = await server
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    console.log('👤 User profile role:', profile?.role);

    if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
      console.log('❌ User not authorized, role:', profile?.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('✅ Admin access granted');
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

    console.log('Fetched feedback records:', feedback?.length || 0);

    // Fetch promotor details for each feedback
    const userIds = (feedback || []).map((f: any) => f.user_id);
    
    if (userIds.length === 0) {
      console.log('No feedback records found');
      return NextResponse.json({ feedback: [] });
    }
    
    console.log('Fetching profiles for user IDs:', userIds);
    
    const { data: profiles, error: profileError } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    if (profileError) {
      console.error('❌ Error fetching user profiles:', profileError);
    }

    console.log('✅ Fetched profiles:', profiles?.length || 0);
    if (profiles) {
      profiles.forEach((p: any) => console.log(`  Profile: ${p.user_id} → ${p.display_name}`));
    }
    
    console.log('Building profile map...');
    const profileMap = new Map((profiles || []).map((p: any) => {
      console.log(`  Adding to map: ${p.user_id} → ${p.display_name}`);
      return [p.user_id, p];
    }));

    // Map to include promotor details at top level
    const feedbackWithDetails = (feedback || []).map((item: any) => {
      const profile = profileMap.get(item.user_id);
      console.log(`Mapping feedback ${item.id}: user_id=${item.user_id}, profile=${profile?.display_name || 'NOT FOUND'}`);
      return {
        ...item,
        promotor_name: profile?.display_name || 'Name nicht gefunden',
        promotor_email: ''
      };
    });

    console.log('Returning', feedbackWithDetails.length, 'feedback items with details');
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

