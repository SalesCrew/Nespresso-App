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

    const svc = createSupabaseServiceClient();

    // Fetch all promotors with their names
    const { data: promotors, error } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('role', 'promotor')
      .order('display_name', { ascending: true });

    if (error) {
      console.error('Error fetching promotors:', error);
      return NextResponse.json({ error: 'Failed to fetch promotors' }, { status: 500 });
    }

    if (promotors && promotors.length > 0) {
    }

    // Map to simple structure
    const promotorList = (promotors || []).map(p => ({
      user_id: p.user_id,
      name: p.display_name
    }));

    return NextResponse.json({ promotors: promotorList });
  } catch (e: any) {
    console.error('Error in promotors-list:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

