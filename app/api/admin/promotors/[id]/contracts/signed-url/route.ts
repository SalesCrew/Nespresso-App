import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

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
    .createSignedUrl(row.file_path, 1800); // 30 minutes validity
    
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  return NextResponse.json(
    { url: signed?.signedUrl || null },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
  );
}
