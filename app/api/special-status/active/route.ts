import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

function viennaDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

// GET: Get user's active special status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createSupabaseServiceClient();
    
    const { data: activeStatus, error } = await service
      .from('active_special_status')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (error) {
      // If table doesn't exist or no rows found, return null
      if (error.code === '42P01' || error.code === 'PGRST116') {
        return NextResponse.json({ activeStatus: null });
      }
      console.error('Error fetching active status:', error);
      return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }

    return NextResponse.json({ activeStatus: activeStatus || null });
  } catch (error) {
    console.error('Unexpected error in GET /api/special-status/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: End active special status
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createSupabaseServiceClient();

    // Update active status to inactive
    const { error: updateError } = await service
      .from('active_special_status')
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (updateError) {
      console.error('Error ending active status:', updateError);
      return NextResponse.json({ error: 'Failed to end status' }, { status: 500 });
    }

    // Clear special status from today's assignments
    const now = new Date();
    const today = viennaDate(now);
    
    // First get the assignment IDs for this user
    const { data: participations } = await service
      .from('assignment_participants')
      .select('assignment_id')
      .eq('user_id', user.id);
    
    if (participations && participations.length > 0) {
      const assignmentIds = participations.map(p => p.assignment_id);
      
      const windowStart = new Date(now.getTime() - 36 * 60 * 60 * 1000).toISOString();
      const windowEnd = new Date(now.getTime() + 36 * 60 * 60 * 1000).toISOString();
      const { data: assignments, error: assignmentLookupError } = await service
        .from('assignments')
        .select('id, start_ts')
        .in('id', assignmentIds)
        .gte('start_ts', windowStart)
        .lt('start_ts', windowEnd);

      if (assignmentLookupError) {
        console.error('Error loading assignments while clearing status:', assignmentLookupError);
      } else {
        const todayIds = (assignments || [])
          .filter((assignment: any) => viennaDate(assignment.start_ts) === today)
          .map((assignment: any) => assignment.id);

        if (todayIds.length > 0) {
          const { error: assignmentError } = await service
            .from('assignments')
            .update({
              special_status: null,
              updated_at: now.toISOString()
            })
            .in('id', todayIds);
      
          if (assignmentError) {
            console.error('Error clearing assignment status:', assignmentError);
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/special-status/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
