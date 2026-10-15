import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { updateMarketWithPhotos } from '@/lib/storage/marketPhotos';

// PATCH - Update market
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const marketId = (await params).id;
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    
    if (!user) {
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

    const body = await req.json();
    const svc = createSupabaseServiceClient();
    
    // Build update object
    const updateData: any = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.plz !== undefined) updateData.plz = body.plz;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.cluster !== undefined) updateData.cluster = body.cluster;
    if (body.stammPromotorId !== undefined) updateData.stamm_promotor_id = body.stammPromotorId || null;
    if (body.marktleiter !== undefined) updateData.marktleiter_name = body.marktleiter;
    if (body.marktleiterPhone !== undefined) updateData.marktleiter_phone = body.marktleiterPhone;
    if (body.marktleiterEmail !== undefined) updateData.marktleiter_email = body.marktleiterEmail;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.internalNotes !== undefined) updateData.internal_notes = body.internalNotes;
    if (body.promotorNotes !== undefined) updateData.promotor_notes = body.promotorNotes;
    
    // Photo arrays
    const photoChanges: any = {};
    if (Array.isArray(body.photosInternal)) photoChanges.photos_internal = body.photosInternal;
    if (Array.isArray(body.photosExterior)) photoChanges.photos_exterior = body.photosExterior;
    if (Array.isArray(body.photosInterior)) photoChanges.photos_interior = body.photosInterior;
    if (Array.isArray(body.photosProducts)) photoChanges.photos_products = body.photosProducts;
    
    // Update market
    const { data: updatedMarket, error: updateError } = Object.keys(photoChanges).length
      ? { data: await updateMarketWithPhotos(svc, marketId, updateData, photoChanges), error: null }
      : await svc
      .from('markets')
      .update(updateData)
      .eq('id', marketId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating market:', updateError);
      return NextResponse.json({ error: 'Failed to update market' }, { status: 500 });
    }

    return NextResponse.json({ market: updatedMarket });
  } catch (error) {
    console.error('Error in market PATCH:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Delete market
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const marketId = (await params).id;
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    
    if (!user) {
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

    const svc = createSupabaseServiceClient();
    
    // Delete market
    const { error: deleteError } = await svc
      .from('markets')
      .delete()
      .eq('id', marketId);
    
    if (deleteError) {
      console.error('Error deleting market:', deleteError);
      return NextResponse.json({ error: 'Failed to delete market' }, { status: 500 });
    }

    // TODO: Also delete all photos from storage for this market
    // This can be implemented later when needed

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in market DELETE:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

