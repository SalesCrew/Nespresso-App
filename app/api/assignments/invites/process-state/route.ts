import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(request: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = createSupabaseServiceClient();

    // Get all active invitations for the user
    const { data: invitations, error } = await svc
      .from('assignment_invitations')
      .select(`
        id,
        assignment_id,
        status,
        responded_at,
        acknowledged_at,
        replacement_for,
        metadata,
        assignment:assignments (
          id,
          title,
          location_text,
          postal_code,
          city,
          start_ts,
          end_ts,
          type
        )
      `)
      .eq('user_id', auth.user.id)
      .or('acknowledged_at.is.null,status.in.(invited,applied)')
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Calculate the current process state
    const activeInvitations = invitations || [];
    const originalInvitations = activeInvitations.filter(inv => !inv.replacement_for);
    const replacementInvitations = activeInvitations.filter(inv => inv.replacement_for);
    
    // Determine the current stage
    let stage: string = 'idle';
    let invitedAssignments: any[] = [];
    let waitingAssignments: any[] = [];
    let acceptedAssignments: any[] = [];
    let rejectedAssignments: any[] = [];
    let replacementAssignments: any[] = [];

    // NEW KEYWORD-BASED LOGIC - same as frontend
    // Process each invitation by status only (ignore replacement_for)
    for (const inv of activeInvitations) {
      const assignment = inv.assignment;
      if (!assignment) continue;

      const assignmentData = {
        id: assignment.id,
        date: new Date(assignment.start_ts).toLocaleDateString('de-DE', { 
          weekday: 'short', 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        time: `${new Date(assignment.start_ts).getUTCHours().toString().padStart(2, '0')}:${new Date(assignment.start_ts).getUTCMinutes().toString().padStart(2, '0')}-${new Date(assignment.end_ts).getUTCHours().toString().padStart(2, '0')}:${new Date(assignment.end_ts).getUTCMinutes().toString().padStart(2, '0')}`,
        location: assignment.location_text,
        invitationId: inv.id,
        status: inv.status,
        isReplacement: !!inv.replacement_for
      };

      // Categorize by status only (no replacement_for logic)
      if (inv.status === 'invited' && !inv.responded_at) {
        invitedAssignments.push(assignmentData);
      } else if (inv.status === 'applied') {
        waitingAssignments.push(assignmentData);
      } else if (inv.status === 'accepted' && !inv.acknowledged_at) {
        acceptedAssignments.push(assignmentData);
      } else if (inv.status === 'rejected' && !inv.acknowledged_at) {
        rejectedAssignments.push(assignmentData);
      }

    }

    // Keyword-based stage determination
    const hasInvited = invitedAssignments.length > 0;
    const hasApplied = waitingAssignments.length > 0;
    const hasAccepted = acceptedAssignments.length > 0;
    const hasRejected = rejectedAssignments.length > 0;

    // For Ersatztermin: invited assignments when there are rejected/accepted
    if (hasRejected || hasAccepted) {
      replacementAssignments = invitedAssignments;
    }

    // Determine stage based on keyword combinations
    if (hasRejected || (hasAccepted && hasInvited)) {
      // Any rejected OR (accepted + invited) → Ersatztermin UI
      stage = 'declined';
    } else if (hasAccepted) {
      // Only accepted → Accepted UI
      stage = 'accepted';
    } else if (hasApplied) {
      // Applied → Waiting stage
      stage = 'waiting';
    } else if (hasInvited) {
      // Only invited → Selection UI
      stage = 'select_assignment';
    }

    return NextResponse.json({
      stage,
      invitedAssignments,
      waitingAssignments,
      acceptedAssignments,
      rejectedAssignments,
      replacementAssignments,
      hasActiveProcess: stage !== 'idle'
    });

  } catch (error) {
    console.error('Error in process-state:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
