import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { signEinsatzPhotoFields } from '@/lib/storage/einsatzPhotos';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientAsync();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createSupabaseServiceClient();
    const { data: tracking, error: trackingError } = await service
      .from('todays_assignments')
      .select(`
        assignment_id,
        title,
        location_text,
        postal_code,
        city,
        planned_start,
        planned_end,
        user_id,
        role,
        promotor_name,
        actual_start_time,
        actual_end_time,
        tracking_status,
        display_status,
        notes,
        early_start_reason,
        minutes_early_start,
        early_end_reason,
        minutes_early_end,
        foto_maschine_url,
        foto_kapsellade_url,
        foto_pos_gesamt_url,
        foto_extra_url
      `)
      .eq('user_id', user.id)
      .order('planned_start', { ascending: true });

    if (trackingError) {
      console.error('Error fetching promotor tracking data:', trackingError);
      return NextResponse.json({
        error: 'Failed to fetch tracking data',
        details: trackingError.message
      }, { status: 500 });
    }

    const assignments = await Promise.all((tracking || []).map((row: any) => signEinsatzPhotoFields(service, row)));
    return NextResponse.json({ assignments });
  } catch (error) {
    console.error('Unexpected error in /api/me/assignment-tracking:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
