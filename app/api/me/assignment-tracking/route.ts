import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClientAsync();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get today's assignment tracking for this promotor
    const { data: tracking, error: trackingError } = await supabase
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

    return NextResponse.json({ assignments: tracking || [] });
  } catch (error) {
    console.error('Unexpected error in /api/me/assignment-tracking:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
