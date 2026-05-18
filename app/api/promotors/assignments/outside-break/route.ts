import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

// POST: record an out-of-window break timestamp for a specific assignment
export async function POST(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { assignmentId, reportedAt } = body || {};
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    // Use provided reportedAt or current time; store as timestamptz (UTC). Display can use Europe/Vienna.
    const timestamp: string = reportedAt || new Date().toISOString();

    const { error } = await server
      .from('assignment_outside_breaks')
      .insert({ assignment_id: assignmentId, user_id: user.id, reported_at: timestamp });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unexpected error' }, { status: 500 });
  }
}

// GET: check if there is an existing outside-break for assignment (used to keep submitted state)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('id');
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ items: [] }, { status: 200 });
    if (!assignmentId) return NextResponse.json({ items: [] }, { status: 200 });

    const { data, error } = await server
      .from('assignment_outside_breaks')
      .select('id, reported_at')
      .eq('assignment_id', assignmentId)
      .eq('user_id', user.id)
      .limit(1);

    if (error) return NextResponse.json({ items: [] }, { status: 200 });
    return NextResponse.json({ items: data || [] });
  } catch {
    return NextResponse.json({ items: [] });
  }
}


