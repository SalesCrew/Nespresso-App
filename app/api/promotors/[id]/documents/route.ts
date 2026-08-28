import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const auth = await requireSelfOrAdmin(userId);
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from('documents')
    .select('id, doc_type, status, file_path, created_at, updated_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ documents: data || [] });
}


