import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (auth.user.id !== params.id) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as any));
  const { file_ext } = body || {};
  const ext = (String(file_ext || 'pdf').replace(/[^a-z0-9]/gi,'').toLowerCase()) || 'pdf';
  const path = `${params.id}/submissions/contract_${Date.now()}.${ext}`;

  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.storage.from('contracts').createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: data?.path, token: data?.token });
}


