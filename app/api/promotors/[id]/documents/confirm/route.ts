import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';

const ALLOWED_TYPES = new Set(['passport','fuehrerschein','citizenship','arbeitserlaubnis','strafregister','additional']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const auth = await requireSelfOrAdmin(userId);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({} as any));
  const { doc_type, path } = body || {};
  if (!ALLOWED_TYPES.has(doc_type) || !path) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const expectedPrefix = `${userId}/${doc_type}.`;
  if (typeof path !== 'string' || !path.startsWith(expectedPrefix) || path.includes('..')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  // Register/Upsert uploaded doc as 'uploaded'
  const { data, error } = await svc
    .from('documents')
    .upsert({ user_id: userId, doc_type, status: 'uploaded', file_path: path }, { onConflict: 'user_id,doc_type', ignoreDuplicates: false })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await recomputeOnboarding(svc as any, userId); } catch {}
  return NextResponse.json({ document: data });
}


