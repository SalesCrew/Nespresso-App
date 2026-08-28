import { NextRequest, NextResponse } from 'next/server';
import { recordDataAccess } from '@/lib/audit/dataAccess';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const auth = await requireSelfOrAdmin(userId);
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();
  const url = new URL(req.url);
  const contractId = url.searchParams.get('contract_id');
  const latest = url.searchParams.get('latest') === '1';
  let query = svc
    .from('dienstvertrag_files')
    .select('file_path')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (contractId) {
    query = query.eq('id', contractId);
  } else if (!latest) {
    query = query.eq('is_active', true);
  }

  const { data: row, error } = await query.maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row?.file_path) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const { data: signed, error: sErr } = await svc.storage
    .from('dienstvertraege')
    .createSignedUrl(row.file_path, 300);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'contract_signed_url_created',
    resourceType: 'contract',
    resourceId: contractId || 'active',
    subjectUserId: userId,
  });
  return NextResponse.json(
    { url: signed?.signedUrl || null },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}


