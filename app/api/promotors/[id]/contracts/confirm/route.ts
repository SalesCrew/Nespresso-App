import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (auth.user.id !== params.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  // Support two shapes: { path } OR { contract_id, file_path }
  const path = body?.path || body?.file_path;
  const contractId = body?.contract_id as string | undefined;
  if (!path) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

  const svc = createSupabaseServiceClient();
  if (contractId) {
    const { error } = await svc
      .from('contracts')
      .update({ file_path: path, updated_at: new Date().toISOString() })
      .eq('id', contractId)
      .eq('user_id', params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // Upsert latest row where file_path is null into signed one, or create new
    const { data: existing } = await svc
      .from('contracts')
      .select('id')
      .eq('user_id', params.id)
      .is('file_path', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await svc
        .from('contracts')
        .update({ file_path: path, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await svc
        .from('contracts')
        .insert({ user_id: params.id, file_path: path, is_active: false });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try { await recomputeOnboarding(svc as any, params.id); } catch {}
  return NextResponse.json({ ok: true });
}


