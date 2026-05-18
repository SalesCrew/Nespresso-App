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

    // Read logs
    const { data: logs, error: logErr } = await svc
      .from('freed_assignments_log')
      .select('id, user_id, reason, assignment_ids, released_count, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 500 });
    }

    const allIds = Array.from(
      new Set(
        (logs || []).flatMap((row: any) =>
          Array.isArray(row.assignment_ids) ? row.assignment_ids : (row.assignment_ids?.ids || [])
        )
      )
    );

    let assignmentsById = new Map<string, any>();
    if (allIds.length > 0) {
      const { data: asgs } = await svc
        .from('assignments')
        .select('id, title, location_text, postal_code, city, start_ts, end_ts')
        .in('id', allIds);
      (asgs || []).forEach((a: any) => assignmentsById.set(String(a.id), a));
    }

    const items = (logs || []).map((row: any) => {
      const ids = Array.isArray(row.assignment_ids)
        ? row.assignment_ids
        : (row.assignment_ids?.ids || []);
      const assignments = ids
        .map((id: any) => assignmentsById.get(String(id)))
        .filter(Boolean);
      return {
        id: row.id,
        created_at: row.created_at,
        released_count: row.released_count,
        assignment_ids: ids,
        reason: row.reason,
        assignments,
      };
    });

    const total = (logs || []).reduce((s: number, r: any) => s + (Number(r.released_count) || 0), 0);
    return NextResponse.json({ userId, total, items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


