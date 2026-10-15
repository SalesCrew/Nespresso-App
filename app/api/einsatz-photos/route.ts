import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { EINSATZ_PHOTO_URL_FIELDS, extractEinsatzPhotoPath } from '@/lib/storage/einsatzPhotos';
import { photoAccessUrl, PhotoAccessError, validPhotoPath, type PhotoBucket } from '@/lib/storage/photoAccess';

export async function GET(request: Request) {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const params = new URL(request.url).searchParams;
  const service = createSupabaseServiceClient();
  let path: string | null = null;
  let bucket: PhotoBucket = 'einsatz-photos';

  try {
    if (params.has('archive')) {
      if (!auth.isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      const archiveBucket = params.get('bucket');
      if (archiveBucket !== 'einsatz-photos' && archiveBucket !== 'market-photos') {
        return NextResponse.json({ error: 'Ungültiger Fotobereich.' }, { status: 400 });
      }
      bucket = archiveBucket;
      path = params.get('archive');
    } else {
      const assignmentId = params.get('assignment');
      const userId = params.get('user');
      const field = params.get('photo');
      if (!assignmentId || !userId || !EINSATZ_PHOTO_URL_FIELDS.includes(field as any)) {
        return NextResponse.json({ error: 'Ungültige Foto-Anfrage.' }, { status: 400 });
      }
      if (!auth.isAdmin && userId !== auth.user.id) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      const { data, error } = await service.from('assignment_tracking')
        .select(EINSATZ_PHOTO_URL_FIELDS.join(','))
        .eq('assignment_id', assignmentId).eq('user_id', userId).maybeSingle();
      if (error) throw new PhotoAccessError(503);
      path = extractEinsatzPhotoPath((data as Record<string, unknown> | null)?.[field!]);
    }
    if (!path || !validPhotoPath(path)) return NextResponse.json({ error: 'Foto nicht gefunden.' }, { status: 404 });
    const url = await photoAccessUrl(service, bucket, path, params.get('refresh') === '1');
    return NextResponse.redirect(url, { status: 307, headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) {
    const status = error instanceof PhotoAccessError ? error.status : 503;
    return NextResponse.json({ error: 'Das Foto konnte gerade nicht geladen werden. Bitte erneut versuchen.' },
      { status, headers: { 'Cache-Control': 'private, no-store', 'Retry-After': '2' } });
  }
}
