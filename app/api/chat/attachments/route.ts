import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CHAT_ATTACHMENT_BUCKET = 'chat-attachments';

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;

  const path = new URL(request.url).searchParams.get('path')?.trim() || '';
  if (!path || path.length > 1000 || path.includes('..') || path.includes('\\')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const segments = path.split('/');
  const ownerUserId = segments[0];
  const conversationId = segments[1];
  if (segments.length !== 3 || !UUID.test(ownerUserId) || !UUID.test(conversationId) || !segments[2]) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 });
  }

  const service = createSupabaseServiceClient();
  if (!auth.isAdmin) {
    const { data: participant, error: participantError } = await service
      .from('chat_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', auth.user.id)
      .maybeSingle();
    if (participantError || !participant) {
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    }
  }

  const { data, error } = await service.storage
    .from(CHAT_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const response = NextResponse.redirect(data.signedUrl, 307);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
