import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';

export async function POST(req: NextRequest) {
  const server = await createSupabaseServerClientAsync();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { ok: isAdmin } = await requireAdmin();
  if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { user_ids } = body || {};
  if (!Array.isArray(user_ids)) return NextResponse.json({ error: 'user_ids array required' }, { status: 400 });

  const svc = createSupabaseServiceClient();
  
  try {
    const { data: participants, error } = await svc
      .from('assignment_participants')
      .select('user_id')
      .in('user_id', user_ids);
    
    if (error) {
      console.error('Assignment participants query error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return array of user_ids that have assignment history
    const userIdsWithHistory = [...new Set((participants || []).map((p: any) => p.user_id))];
    
    return NextResponse.json({ user_ids_with_history: userIdsWithHistory });
  } catch (e: any) {
    console.error('Assignment history check error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
