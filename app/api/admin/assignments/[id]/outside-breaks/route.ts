import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// GET: fetch outside-break records for an assignment (admin view)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assignmentId } = await params;
    if (!assignmentId) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from('assignment_outside_breaks')
      .select('id, user_id, reported_at, created_at')
      .eq('assignment_id', assignmentId)
      .order('reported_at', { ascending: false });

    if (error) {
      console.error('Error fetching outside breaks:', error);
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    return NextResponse.json({ items: data || [] });
  } catch (err) {
    console.error('Unexpected error fetching outside breaks:', err);
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}

