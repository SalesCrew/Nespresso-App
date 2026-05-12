import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok: isAdmin } = await requireAdmin();
  if (!isAdmin && auth.user.id !== params.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const svc = createSupabaseServiceClient();
  const { data: files, error } = await svc
    .from('dienstvertrag_files')
    .select('*')
    .eq('user_id', params.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await svc
    .from('promotor_profiles')
    .select('contract_hours_per_week')
    .eq('user_id', params.id)
    .maybeSingle();

  const hours = profile?.contract_hours_per_week ?? null;
  const contracts = (files || []).map((row: any) => ({
    ...row,
    hours_per_week: hours,
  }));

  return NextResponse.json(
    { contracts },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}


