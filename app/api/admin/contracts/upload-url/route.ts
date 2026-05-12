import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));
  const { user_id, file_ext } = body || {};
  if (!user_id) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const ext = (String(file_ext || 'pdf').replace(/[^a-z0-9]/gi, '').toLowerCase()) || 'pdf';
  if (!['pdf', 'doc', 'docx'].includes(ext)) {
    return NextResponse.json({ error: 'invalid file type' }, { status: 400 });
  }

  const path = `${user_id}/contract_${Date.now()}_${randomUUID().slice(0, 8)}.${ext}`;
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.storage.from('dienstvertraege').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bucket: 'dienstvertraege', path: data?.path, token: data?.token });
}


