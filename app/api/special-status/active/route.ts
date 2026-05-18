import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

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
    const today = new Date().toISOString().split('T')[0];
    
    // First get the assignment IDs for this user
    const { data: participations } = await service
      .from('assignment_participants')
      .select('assignment_id')
      .eq('user_id', user.id);
    
    if (participations && participations.length > 0) {
      const assignmentIds = participations.map(p => p.assignment_id);
      
      const { error: assignmentError } = await service
        .from('assignments')
        .update({
          special_status: null,
          updated_at: new Date().toISOString()
        })
        .eq('date', today)
        .in('id', assignmentIds);
      
      if (assignmentError) {
        console.error('Error clearing assignment status:', assignmentError);
        // Don't fail the request if this fails
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/special-status/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
