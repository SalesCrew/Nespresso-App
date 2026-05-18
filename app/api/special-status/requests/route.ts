import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// POST: Create a new special status request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { request_type, reason } = await request.json();
    
    if (!request_type || !['krankenstand', 'notfall'].includes(request_type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 });
    }

    // Use service client for database operations to bypass RLS
    const service = createSupabaseServiceClient();

    // Check if user already has a pending request
    const { data: existingRequest } = await service
      .from('special_status_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single();

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request' }, { status: 400 });
    }

    // Create the request
    const { data, error } = await service
      .from('special_status_requests')
      .insert({
        user_id: user.id,
        request_type,
        reason: reason || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating special status request:', error);
      return NextResponse.json({ error: 'Failed to create request' }, { status: 500 });
    }

    return NextResponse.json({ request: data });
  } catch (error) {
    console.error('Unexpected error in POST /api/special-status/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Get pending requests for admins
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client to bypass RLS for admin check
    const service = createSupabaseServiceClient();
    
    // Check user role
    const { data: profile } = await service
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    let requests;
    let error;

    if (['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      // Admin: get all pending requests
      const result = await service
        .from('special_status_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      requests = result.data;
      error = result.error;
    } else {
      // Promotor: get only their own pending requests
      const result = await service
        .from('special_status_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });
      
      requests = result.data;
      error = result.error;
    }

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        console.warn('Special status requests table not found');
        return NextResponse.json({ requests: [] });
      }
      console.error('Error fetching special status requests:', error);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
    
    // If we have requests and user is admin, fetch user profiles
    if (requests && requests.length > 0 && ['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      const userIds = [...new Set(requests.map((r: any) => r.user_id))];
      const { data: profiles } = await service
        .from('user_profiles')
        .select('user_id, display_name')
        .in('user_id', userIds);
      
      // Map profiles to requests
      if (profiles) {
        const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
        requests.forEach((r: any) => {
          r.user_profiles = profileMap[r.user_id] || null;
        });
      }
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/special-status/requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
