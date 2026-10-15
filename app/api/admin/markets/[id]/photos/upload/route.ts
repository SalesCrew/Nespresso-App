import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { MARKET_PHOTO_FIELDS, updateMarketWithPhotos } from '@/lib/storage/marketPhotos';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const marketId = (await params).id;
    const server = await createSupabaseServerClientAsync();
    const service = createSupabaseServiceClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin access
    const { data: profile } = await server
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const photo_type = formData.get('photo_type') as string; // 'internal' | 'exterior' | 'interior' | 'products'
    const comment = formData.get('comment') as string || '';
    if (!MARKET_PHOTO_FIELDS.includes(`photos_${photo_type}` as any)) {
      return NextResponse.json({ error: 'Invalid photo type' }, { status: 400 });
    }

    if (!file || !photo_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify market exists
    const { data: market, error: marketError } = await service
      .from('markets')
      .select('id')
      .eq('id', marketId)
      .single();
    
    if (marketError || !market) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    // Create file path
    const fileExt = file.name.split('.').pop();
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `market-photos/${marketId}/${photo_type}/${fileName}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await service.storage
      .from('market-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file', details: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = service.storage
      .from('market-photos')
      .getPublicUrl(filePath);

    // Fetch current photos array
    const photoField = `photos_${photo_type}`;
    // Append new photo to array
    const newPhoto = {
      url: urlData.publicUrl,
      comment: comment,
      order: 0
    };
    
    const saved = await updateMarketWithPhotos(service, marketId, {}, { [photoField]: [newPhoto] }, true);
    const updatedPhotos = saved[photoField] || [];

    return NextResponse.json({ 
      photo: newPhoto,
      photos: updatedPhotos
    });
  } catch (error) {
    console.error('Unexpected error in photo upload:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

