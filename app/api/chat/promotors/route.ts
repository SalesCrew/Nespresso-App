import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// GET: Fetch all promotors for chat (admin only - route protection at page level)
export async function GET(request: NextRequest) {
  try {

    // Check authentication only
    const server = createSupabaseServerClient();
    const { data: auth } = await server.auth.getUser();


    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to fetch promotors (bypasses RLS, admin-only pages are protected at route level)
    const svc = createSupabaseServiceClient();

    // Fetch promotors with region from promotor_profiles
    const { data: userProfiles, error: usersError } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('role', 'promotor');

    if (usersError) {
      console.error('[/api/chat/promotors] Error fetching user profiles:', usersError);
      return NextResponse.json({ error: 'Failed to fetch promotors', details: usersError.message }, { status: 500 });
    }

    const userIds = userProfiles?.map(u => u.user_id) || [];

    // Fetch regions from promotor_profiles
    const { data: promotorProfiles } = await svc
      .from('promotor_profiles')
      .select('user_id, region')
      .in('user_id', userIds);

    // Merge user profiles with region data
    const regionByUserId = new Map(promotorProfiles?.map(p => [p.user_id, p.region]) || []);

    const promotors = userProfiles?.map(u => ({
      user_id: u.user_id,
      display_name: u.display_name,
      region: regionByUserId.get(u.user_id) || null
    })).sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));

    return NextResponse.json({ promotors: promotors || [] });
  } catch (error: any) {
    console.error('[/api/chat/promotors] Unexpected error:', error);
    console.error('[/api/chat/promotors] Error stack:', error?.stack);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

