import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    // Use server client for auth check
    const server = createSupabaseServerClient();
    const { data: auth, error: authError } = await server.auth.getUser();

    if (authError || !auth?.user) {
      console.error('Auth error in acknowledge-all API:', authError?.message || 'No user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client for data operations
    const supabase = createSupabaseServiceClient();


    // Update all unacknowledged invitations for this user
    const { data, error } = await supabase
      .from('assignment_invitations')
      .update({ acknowledged_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)
      .is('acknowledged_at', null)
      .in('status', ['accepted', 'rejected'])
      .select();

    if (error) {
      console.error('Error acknowledging invitations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, acknowledged: data?.length || 0 });

  } catch (error) {
    console.error('Error in acknowledge-all:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
