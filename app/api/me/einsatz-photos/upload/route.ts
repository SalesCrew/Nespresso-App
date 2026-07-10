import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ALLOWED_PHOTO_FIELDS = new Map([
  ['foto_maschine', 'foto_maschine_url'],
  ['foto_kapsellade', 'foto_kapsellade_url'],
  ['foto_pos_gesamt', 'foto_pos_gesamt_url'],
  ['foto_extra', 'foto_extra_url'],
]);

export async function POST(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const service = createSupabaseServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const photo_type = formData.get('photo_type') as string;
    const assignment_id = formData.get('assignment_id') as string;

    if (!(file instanceof File) || !photo_type || !assignment_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Bitte nur JPG-, PNG- oder WebP-Bilder hochladen.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return NextResponse.json(
        { error: 'Das Foto darf maximal 5 MB gro\u00df sein.' },
        { status: 400 }
      );
    }

    // Verify user is assigned to this assignment
    const { data: participation } = await service
      .from('assignment_participants')
      .select('user_id')
      .eq('assignment_id', assignment_id)
      .eq('user_id', user.id)
      .single();
    
    if (!participation) {
      return NextResponse.json({ error: 'Not assigned to this assignment' }, { status: 403 });
    }

    const photoField = ALLOWED_PHOTO_FIELDS.get(photo_type);
    if (!photoField) {
      return NextResponse.json({ error: 'Invalid photo_type' }, { status: 400 });
    }

    // Create file path
    const fileExt = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const fileName = `${assignment_id}_${photo_type}_${Date.now()}.${fileExt}`;
    const filePath = `einsatz-photos/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await service.storage
      .from('einsatz-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = service.storage
      .from('einsatz-photos')
      .getPublicUrl(filePath);

    // Upsert ensures an uploaded photo always has a durable tracking reference,
    // even if the start-time request did not create the tracking row.
    const { error: trackingError } = await service
      .from('assignment_tracking')
      .upsert(
        {
          assignment_id,
          user_id: user.id,
          [photoField]: urlData.publicUrl,
        },
        { onConflict: 'assignment_id,user_id' }
      );

    if (trackingError) {
      console.error('Error saving photo URL to tracking:', trackingError);
      const { error: cleanupError } = await service.storage
        .from('einsatz-photos')
        .remove([filePath]);
      if (cleanupError) {
        console.error('Error cleaning up unreferenced photo:', cleanupError);
      }
      return NextResponse.json({ error: 'Failed to save photo reference' }, { status: 500 });
    }

    return NextResponse.json({ 
      photo_url: urlData.publicUrl,
      photo_type 
    });
  } catch (error) {
    console.error('Unexpected error in photo upload:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
