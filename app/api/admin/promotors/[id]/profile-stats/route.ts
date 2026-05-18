import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view other users
    const svc = createSupabaseServiceClient();
    const { data: profile } = await svc
      .from('user_profiles')
      .select('role')
      .eq('user_id', auth.user.id)
      .single();
    if (!profile || !['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    // Completed assignments for this user: tracking rows with actual_end_time
    const { data: trackingRows } = await svc
      .from('assignment_tracking')
      .select('assignment_id, actual_end_time')
      .eq('user_id', userId);

    const completedSet = new Set<string>(
      (trackingRows || [])
        .filter((t: any) => !!t.actual_end_time)
        .map((t: any) => String(t.assignment_id))
    );

    // Krankenstand count from freed_assignments_log
    const { data: freedLogs } = await svc
      .from('freed_assignments_log')
      .select('released_count')
      .eq('user_id', userId);

    const freedCount = (freedLogs || []).reduce((sum: number, row: any) => sum + (Number(row.released_count) || 0), 0);

    // Buddy days: lead assignments with buddy and completed
    const { data: buddyEligible } = await svc
      .from('assignments_with_buddy_info')
      .select('id, buddy_user_id')
      .eq('lead_user_id', userId)
      .not('buddy_user_id', 'is', null);

    const buddyIds = new Set<string>((buddyEligible || []).map((r: any) => String(r.id)));
    let buddyDays = 0;
    buddyIds.forEach((id) => {
      if (completedSet.has(id)) buddyDays += 1;
    });

    const completed = completedSet.size;
    const krankenstand = freedCount;
    const denom = completed + freedCount;
    // Allow negative when Krankenstand > completed by using (completed - krankenstand) / (completed + krankenstand)
    const attendanceRate = denom > 0 ? Math.round(((completed - krankenstand) / denom) * 100) : 0;

    return NextResponse.json({
      completed,
      krankenstand,
      buddyDays,
      attendanceRate,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


