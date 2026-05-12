import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok: isAdmin } = await requireAdmin();
  if (!isAdmin && auth.user.id !== params.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const userId = params.id;
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
    .createSignedUrl(row.file_path, 1800);
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  return NextResponse.json(
    { url: signed?.signedUrl || null },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}


