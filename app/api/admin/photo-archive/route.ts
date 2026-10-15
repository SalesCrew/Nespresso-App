import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { photoArchive } from '@/lib/storage/photoArchive';

export const maxDuration = 60;

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const bucket = params.get('bucket');
  if (bucket !== 'einsatz-photos' && bucket !== 'market-photos') {
    return NextResponse.json({ error: 'Ungültiger Fotobereich.' }, { status: 400 });
  }
  try {
    const photos = await photoArchive(createSupabaseServiceClient(), bucket, params.get('refresh') === '1');
    return NextResponse.json({ photos }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Das Fotoarchiv konnte nicht geladen werden.' }, { status: 503 });
  }
}
