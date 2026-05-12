import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('days_ahead') || '7');
    const includeAllFuture = searchParams.get('include_all_future') === '1';

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    // Get all assignment participations for this user
    const { data: participations, error: partError } = await service
      .from('assignment_participants')
      .select('assignment_id, role')
      .eq('user_id', params.id);

    if (partError) {
      console.error('Error fetching participations:', partError);
      return NextResponse.json({ error: partError.message }, { status: 500 });
    }

    if (!participations || participations.length === 0) {
      return NextResponse.json({ assignments: [] });
    }

    const assignmentIds = participations.map(p => p.assignment_id);

    // Fetch assignments from the view
    let assignmentsQuery = service
      .from('assignments_with_buddy_info')
      .select('*')
      .in('id', assignmentIds)
      .in('status', ['assigned', 'buddy_tag'])
      .gte('start_ts', today.toISOString())
      .order('start_ts', { ascending: true });

    if (!includeAllFuture) {
      assignmentsQuery = assignmentsQuery.lte('start_ts', futureDate.toISOString());
    }

    const { data: assignments, error: assignmentsError } = await assignmentsQuery;

    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError);
      return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
    }

    // Enrich with user's role for each assignment
    const enrichedAssignments = (assignments || []).map((assignment: any) => {
      const participation = participations.find(p => p.assignment_id === assignment.id);
      return {
        ...assignment,
        user_role: participation?.role || 'unknown'
      };
    });

    return NextResponse.json({ assignments: enrichedAssignments });
  } catch (error) {
    console.error('Unexpected error in GET /api/promotors/[id]/upcoming-assignments:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

