import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';
import { requireAdmin } from '@/lib/auth/routeGuards';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const { user_id, doc_type, status, file_path } = body || {};
  if (!user_id || !doc_type || !['uploaded','approved','rejected'].includes(status)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc
    .from('documents')
    .insert({ user_id, doc_type, status, file_path: file_path ?? null })
    .select('*')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await recomputeOnboarding(svc as any, user_id); } catch {}
  return NextResponse.json({ document: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const { user_id, doc_type, status } = body || {};
  if (!user_id || !doc_type || !['uploaded','approved','rejected'].includes(status)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  const svc = createSupabaseServiceClient();

  if (status === 'rejected') {
    // When rejecting, delete the document row and file from storage
    // First get the file path before deleting
    const { data: docRow } = await svc
      .from('documents')
      .select('file_path')
      .eq('user_id', user_id)
      .eq('doc_type', doc_type)
      .maybeSingle();

    // Delete from database
    const { error: deleteError } = await svc
      .from('documents')
      .delete()
      .eq('user_id', user_id)
      .eq('doc_type', doc_type);

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    // Delete from storage if file exists
    if (docRow?.file_path) {
      try {
        await svc.storage.from('documents').remove([docRow.file_path]);
      } catch (e) {
        console.error('Failed to delete file from storage:', e);
        // Continue anyway - DB deletion is more important
      }
    }
  } else {
    // For approved/uploaded, just update the status
    const { error } = await svc
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('user_id', user_id)
      .eq('doc_type', doc_type);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try { await recomputeOnboarding(svc as any, user_id); } catch {}
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({} as any));
  const { user_id, doc_type } = body || {};
  if (!user_id) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const svc = createSupabaseServiceClient();
  let q = svc.from('documents').delete().eq('user_id', user_id);
  if (doc_type) q = q.eq('doc_type', doc_type);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  try { await recomputeOnboarding(svc as any, user_id); } catch {}
  return NextResponse.json({ ok: true });
}


