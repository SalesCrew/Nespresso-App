import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSelfOrAdmin(params.id);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({} as any));
  const { file_ext } = body || {};
  const ext = (String(file_ext || 'pdf').replace(/[^a-z0-9]/gi,'').toLowerCase()) || 'pdf';
  if (!ALLOWED_EXTENSIONS.has(ext)) return NextResponse.json({ error: 'invalid file_ext' }, { status: 400 });
  const path = `${params.id}/submissions/contract_${Date.now()}.${ext}`;

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.storage.from('contracts').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: data?.path, token: data?.token });
}


