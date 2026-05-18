import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';

export async function POST(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { user_id, path, is_active } = body || {};
  if (!user_id || !path) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from('contracts')
    .insert({ user_id, file_path: path, is_active: is_active ?? true })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await recomputeOnboarding(svc as any, user_id); } catch {}
  return NextResponse.json({ contract: data });
}


