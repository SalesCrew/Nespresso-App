import { NextRequest, NextResponse } from 'next/server';
import { recordDataAccess } from '@/lib/audit/dataAccess';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const contractId = req.nextUrl.searchParams.get('contract_id');
  if (!contractId) return NextResponse.json({ error: 'contract_id missing' }, { status: 400 });

  const svc = createSupabaseServiceClient();

  // Get contract file path
  const { data: row, error } = await svc
    .from('dienstvertrag_files')
    .select('file_path')
    .eq('id', contractId)
    .eq('user_id', params.id) // Ensure contract belongs to the specified promotor
    .maybeSingle();

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
    resourceId: contractId,
    subjectUserId: params.id,
  });
  return NextResponse.json(
    { url: signed?.signedUrl || null },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}
