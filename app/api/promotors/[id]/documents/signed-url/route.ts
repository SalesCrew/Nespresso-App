import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';
import { recordDataAccess } from '@/lib/audit/dataAccess';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const auth = await requireSelfOrAdmin(userId);
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(req.url);
  const doc_type = searchParams.get('doc_type');
  if (!doc_type) return NextResponse.json({ error: 'missing doc_type' }, { status: 400 });

  const svc = createSupabaseServiceClient();
  const { data: row, error } = await svc
    .from('documents')
    .select('file_path')
    .eq('user_id', userId)
    .eq('doc_type', doc_type)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row?.file_path) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const { data: signed, error: sErr } = await svc.storage
    .from('documents')
    .createSignedUrl(row.file_path, 300);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'document_signed_url_created',
    resourceType: 'document',
    resourceId: doc_type,
    subjectUserId: userId,
  });
  return NextResponse.json({ url: signed?.signedUrl || null });
}


