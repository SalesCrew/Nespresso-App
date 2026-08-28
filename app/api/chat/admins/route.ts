import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// GET: Fetch all admins for chat (promotor only - route protection at page level)
export async function GET(request: NextRequest) {
  try {

    // Check authentication only
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();


    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to fetch admins (bypasses RLS, promotor pages are protected at route level)
    const svc = createSupabaseServiceClient();

    const { data: admins, error: adminsError } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .in('role', ['admin_staff', 'admin_of_admins'])
      .order('display_name', { ascending: true });

    if (admins && admins.length > 0) {
    }

    if (adminsError) {
      console.error('[/api/chat/admins] Error fetching admins:', adminsError);
      return NextResponse.json({ error: 'Failed to fetch admins', details: adminsError.message }, { status: 500 });
    }

    return NextResponse.json({ admins: admins || [] });
  } catch (error: any) {
    console.error('[/api/chat/admins] Unexpected error:', error);
    console.error('[/api/chat/admins] Error stack:', error?.stack);
    return NextResponse.json({ error: 'Internal server error', details: error?.message }, { status: 500 });
  }
}

