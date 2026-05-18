import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const date = url.searchParams.get('date'); // YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'Missing date parameter' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Fetch all check-ins for the specified date
    const { data: checkins, error } = await svc
      .from('assignment_daily_checkin')
      .select('assignment_id, user_id, checked_in_at')
      .eq('checkin_date', date);

    if (error) {
      console.error('Error fetching daily check-in status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ checkins: checkins || [] });

  } catch (e: any) {
    console.error('Server error in daily-checkin-status:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

