import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const svc = createSupabaseServiceClient();
  const userId = auth.user.id;

  try {
    // Get current week range
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    // Get configured contract hours from profile
    const { data: profile } = await svc
      .from('promotor_profiles')
      .select('contract_hours_per_week')
      .eq('user_id', userId)
      .maybeSingle();

    // Get assignments for the current week
    const { data: participants } = await svc
      .from('assignment_participants')
      .select('assignment:assignments(start_ts, end_ts)')
      .eq('user_id', userId)
      .gte('assignment.start_ts', `${weekStart}T00:00:00`)
      .lte('assignment.start_ts', `${weekEnd}T23:59:59`);

    // Calculate working hours (only count assignments that have already ended)
    let totalHours = 0;
    const currentTime = new Date();

    (participants || []).forEach((p: any) => {
      if (p.assignment?.start_ts && p.assignment?.end_ts) {
        const end = new Date(p.assignment.end_ts);
        
        // Only count if the assignment has already ended
        if (end <= currentTime) {
          const start = new Date(p.assignment.start_ts);
          const durationMs = end.getTime() - start.getTime();
          let hours = durationMs / (1000 * 60 * 60);

          // Subtract 1 hour break if assignment is longer than 6 hours
          if (hours > 6) {
            hours -= 1;
          }

          totalHours += hours;
        }
      }
    });

    const goalHours = profile?.contract_hours_per_week || 0;
    const workedHours = Math.round(totalHours * 10) / 10; // Round to 1 decimal place

    return NextResponse.json({
      goalHours,
      workedHours,
      percentage: goalHours > 0 ? Math.round((workedHours / goalHours) * 100) : 0
    });
  } catch (error: any) {
    console.error('Error fetching work status:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

