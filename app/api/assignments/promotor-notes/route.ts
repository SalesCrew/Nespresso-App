import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, requireUser } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const svc = createSupabaseServiceClient();

  try {
    const { assignment_id, note } = await req.json();

    if (!assignment_id) {
      return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 });
    }

    // Upsert the promotor note
    const { data, error } = await svc
      .from('einsatznotiz_promotor')
      .upsert({
        assignment_id,
        note,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'assignment_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving promotor note:', error);
      return NextResponse.json({ error: 'Failed to save note' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Unexpected error saving promotor note:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const svc = createSupabaseServiceClient();
  const url = new URL(req.url);
  const assignmentId = url.searchParams.get('assignment_id');

  if (!assignmentId) {
    return NextResponse.json({ error: 'assignment_id is required' }, { status: 400 });
  }

  if (!auth.isAdmin) {
    const { data: participant } = await svc
      .from('assignment_participants')
      .select('assignment_id')
      .eq('assignment_id', assignmentId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (!participant) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const { data, error } = await svc
      .from('einsatznotiz_promotor')
      .select('*')
      .eq('assignment_id', assignmentId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching promotor note:', error);
      return NextResponse.json({ error: 'Failed to fetch note' }, { status: 500 });
    }

    return NextResponse.json({ note: data || null });
  } catch (error: any) {
    console.error('Unexpected error fetching promotor note:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}
