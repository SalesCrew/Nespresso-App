import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createEinsatzPhotoSignedUrl } from '@/lib/storage/einsatzPhotos';

const PHOTO_BUCKET = 'einsatz-photos';
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const PHOTO_FIELDS = {
  foto_maschine: 'foto_maschine_url',
  foto_kapsellade: 'foto_kapsellade_url',
  foto_pos_gesamt: 'foto_pos_gesamt_url',
  foto_extra: 'foto_extra_url',
} as const;

type PhotoType = keyof typeof PHOTO_FIELDS;
type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

function getPhotoType(value: unknown): PhotoType | null {
  if (typeof value !== 'string' || !(value in PHOTO_FIELDS)) return null;
  return value as PhotoType;
}

function getContentType(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const contentType = value.split(';')[0].trim().toLowerCase();
  return ALLOWED_PHOTO_TYPES.has(contentType) ? contentType : null;
}

function getFileExtension(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  return 'jpg';
}

async function requireParticipation(
  service: ServiceClient,
  assignmentId: string,
  userId: string
) {
  const { data, error } = await service
    .from('assignment_participants')
    .select('user_id')
    .eq('assignment_id', assignmentId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking assignment participation:', error);
    return NextResponse.json(
      { error: 'Die Einsatz-Zuordnung konnte nicht gepr\u00fcft werden.' },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: 'Sie sind diesem Einsatz nicht zugeordnet.' },
      { status: 403 }
    );
  }

  return null;
}

async function removeUploadedObject(service: ServiceClient, path: string) {
  const { error } = await service.storage.from(PHOTO_BUCKET).remove([path]);
  if (error) {
    console.error('Error cleaning up Einsatz photo:', error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const assignmentId = typeof body?.assignment_id === 'string'
      ? body.assignment_id.trim()
      : '';
    const photoType = getPhotoType(body?.photo_type);
    const contentType = getContentType(body?.content_type);
    const fileSize = Number(body?.file_size);

    if (!assignmentId || assignmentId.length > 128 || !photoType || !contentType) {
      return NextResponse.json(
        { error: 'Ung\u00fcltige Upload-Daten.' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: 'Das Foto darf maximal 5 MB gro\u00df sein.' },
        { status: 400 }
      );
    }

    const service = createSupabaseServiceClient();
    const participationError = await requireParticipation(service, assignmentId, user.id);
    if (participationError) return participationError;

    const filePath = [
      user.id,
      assignmentId,
      `${photoType}_${Date.now()}_${randomUUID()}.${getFileExtension(contentType)}`,
    ].join('/');

    const { data, error } = await service.storage
      .from(PHOTO_BUCKET)
      .createSignedUploadUrl(filePath, { upsert: false });

    if (error || !data?.token || !data.path) {
      console.error('Error creating signed Einsatz photo upload:', error);
      return NextResponse.json(
        { error: 'Der Foto-Upload konnte nicht vorbereitet werden.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      bucket: PHOTO_BUCKET,
      path: data.path,
      token: data.token,
    });
  } catch (error) {
    console.error('Unexpected error preparing Einsatz photo upload:', error);
    return NextResponse.json(
      { error: 'Der Foto-Upload konnte nicht vorbereitet werden.' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const assignmentId = typeof body?.assignment_id === 'string'
      ? body.assignment_id.trim()
      : '';
    const path = typeof body?.path === 'string' ? body.path.trim() : '';
    const photoType = getPhotoType(body?.photo_type);

    if (!assignmentId || assignmentId.length > 128 || !path || !photoType) {
      return NextResponse.json(
        { error: 'Ung\u00fcltige Upload-Daten.' },
        { status: 400 }
      );
    }

    const expectedPathPrefix = `${user.id}/${assignmentId}/${photoType}_`;
    if (path.includes('..') || !path.startsWith(expectedPathPrefix)) {
      return NextResponse.json(
        { error: 'Ung\u00fcltiger Foto-Pfad.' },
        { status: 400 }
      );
    }

    const service = createSupabaseServiceClient();
    const participationError = await requireParticipation(service, assignmentId, user.id);
    if (participationError) return participationError;

    const { data: storedPhoto, error: infoError } = await service.storage
      .from(PHOTO_BUCKET)
      .info(path);

    if (infoError || !storedPhoto) {
      console.error('Uploaded Einsatz photo was not found:', infoError);
      return NextResponse.json(
        { error: 'Das hochgeladene Foto wurde nicht gefunden.' },
        { status: 400 }
      );
    }

    const storedSize = Number(storedPhoto.size ?? storedPhoto.metadata?.size);
    const storedContentType = getContentType(
      storedPhoto.contentType
      ?? storedPhoto.metadata?.mimetype
      ?? storedPhoto.metadata?.contentType
    );

    if (
      !Number.isFinite(storedSize)
      || storedSize <= 0
      || storedSize > MAX_PHOTO_SIZE
      || !storedContentType
    ) {
      await removeUploadedObject(service, path);
      return NextResponse.json(
        { error: 'Das gespeicherte Foto ist ung\u00fcltig oder gr\u00f6\u00dfer als 5 MB.' },
        { status: 400 }
      );
    }

    const photoField = PHOTO_FIELDS[photoType];
    const { error: trackingError } = await service
      .from('assignment_tracking')
      .upsert(
        {
          assignment_id: assignmentId,
          user_id: user.id,
          [photoField]: path,
        },
        { onConflict: 'assignment_id,user_id' }
      );

    if (trackingError) {
      console.error('Error saving Einsatz photo reference:', trackingError);
      await removeUploadedObject(service, path);
      return NextResponse.json(
        { error: 'Das Foto konnte dem Einsatz nicht zugeordnet werden.' },
        { status: 500 }
      );
    }

    const signedUrl = await createEinsatzPhotoSignedUrl(service, path);
    return NextResponse.json({
      photo_url: signedUrl || path,
      photo_type: photoType,
    });
  } catch (error) {
    console.error('Unexpected error confirming Einsatz photo upload:', error);
    return NextResponse.json(
      { error: 'Das Foto konnte nicht gespeichert werden.' },
      { status: 500 }
    );
  }
}
