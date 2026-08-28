import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';

const ALLOWED_TYPES = new Set(['passport','fuehrerschein','citizenship','arbeitserlaubnis','strafregister','additional']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = params.id;
  const auth = await requireSelfOrAdmin(userId);
  if (!auth.ok) return auth.response;
  const body = await req.json().catch(() => ({} as any));
  const { doc_type, file_ext } = body || {};
  if (!ALLOWED_TYPES.has(doc_type)) return NextResponse.json({ error: 'invalid doc_type' }, { status: 400 });
  const ext = (String(file_ext || 'pdf').replace(/[^a-z0-9]/gi,'').toLowerCase()) || 'pdf';
  if (!ALLOWED_EXTENSIONS.has(ext)) return NextResponse.json({ error: 'invalid file_ext' }, { status: 400 });

  const path = `${userId}/${doc_type}.${ext}`;
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.storage.from('documents').createSignedUploadUrl(path, { upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bucket: 'documents', path, token: data?.token });
}


