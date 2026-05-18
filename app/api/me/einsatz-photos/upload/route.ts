import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextRequest, NextResponse } from 'next/server';

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
    const file = formData.get('file') as File;
    const photo_type = formData.get('photo_type') as string;
    const assignment_id = formData.get('assignment_id') as string;

    if (!file || !photo_type || !assignment_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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

    // Validate photo type (allow the 3 existing + new optional 'foto_extra')
    const allowedTypes = new Set(['foto_maschine', 'foto_kapsellade', 'foto_pos_gesamt', 'foto_extra']);
    if (!allowedTypes.has(photo_type)) {
      return NextResponse.json({ error: 'Invalid photo_type' }, { status: 400 });
    }

    // Create file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${assignment_id}_${photo_type}_${Date.now()}.${fileExt}`;
    const filePath = `einsatz-photos/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await service.storage
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

    // Save photo reference to assignment_tracking table
    const photoField = `${photo_type}_url`;
    const { error: trackingError } = await service
      .from('assignment_tracking')
      .update({ [photoField]: urlData.publicUrl })
      .eq('assignment_id', assignment_id)
      .eq('user_id', user.id);

    if (trackingError) {
      console.error('Error saving photo URL to tracking:', trackingError);
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
