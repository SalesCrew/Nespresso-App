import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const userId = auth.user.id;

    const svc = createSupabaseServiceClient();

    // Tracking rows for this user (completed assignments in the past have an actual_end_time)
    const { data: trackingRows } = await svc
      .from('assignment_tracking')
      .select('assignment_id, actual_end_time, status')
      .eq('user_id', userId);

    const completedSet = new Set<string>(
      (trackingRows || [])
        .filter((t: any) => !!t.actual_end_time)
        .map((t: any) => String(t.assignment_id))
    );

    // Sum of missed assignments from freed_assignments_log (Krankenstand releases)
    const { data: freedLogs } = await svc
      .from('freed_assignments_log')
      .select('released_count')
      .eq('user_id', userId);

    const freedCount = (freedLogs || []).reduce((sum: number, row: any) => sum + (Number(row.released_count) || 0), 0);

    // Buddy day count: lead assignments with buddy, completed
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
    const attendanceRate = denom > 0 ? Math.round((completed / denom) * 100) : 0;

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


