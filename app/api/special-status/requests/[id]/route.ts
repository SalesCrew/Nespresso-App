import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

function viennaDate(value: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

// PATCH: Approve or decline a special status request
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createSupabaseServiceClient();

    // Check if user is admin
    const { data: profile } = await service
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action, end_date } = await request.json();

    if (!action || !['approve', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'approve') {
      // Get the request details first
      const { data: requestData, error: requestError } = await service
        .from('special_status_requests')
        .select('*')
        .eq('id', params.id)
        .eq('status', 'pending')
        .single();

      if (requestError || !requestData) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }

      // 1. Update the request status
      await service
        .from('special_status_requests')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', params.id);

      // 2. Create/update active special status with end_date if provided
      // First, delete any existing active status for this user (to avoid unique constraint)
      const { error: deleteError } = await service
        .from('active_special_status')
        .delete()
        .eq('user_id', requestData.user_id);

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to replace active status' }, { status: 500 });
      }

      // Then, insert new active status
      const activeStatusData: any = {
        user_id: requestData.user_id,
        status_type: requestData.request_type,
        is_active: true,
        started_at: new Date().toISOString()
      };

      if (end_date) {
        activeStatusData.ended_at = end_date;
      }
      const { error: insertError } = await service
        .from('active_special_status')
        .insert(activeStatusData)
        .select();

      if (insertError) {
        console.error('❌ Error inserting active status:', insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // 3. Update today's assignments for this user
      const { data: todaysAssignments } = await service
        .from('assignment_participants')
        .select('assignment_id, assignments!inner(start_ts)')
        .eq('user_id', requestData.user_id);

      if (todaysAssignments) {
        const today = viennaDate(new Date());
        const todayAssignmentIds = todaysAssignments
          .filter((ap: any) => viennaDate(ap.assignments.start_ts) === today)
          .map((ap: any) => ap.assignment_id);

        if (todayAssignmentIds.length > 0) {
          await service
            .from('assignments')
            .update({ special_status: requestData.request_type })
            .in('id', todayAssignmentIds);
        }
      }
    } else {
      // Decline the request
      const { error: declineError } = await service
        .from('special_status_requests')
        .update({
          status: 'declined',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .eq('status', 'pending');

      if (declineError) {
        console.error('Error declining request:', declineError);
        return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/special-status/requests/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
