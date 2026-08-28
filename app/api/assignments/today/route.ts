import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { signEinsatzPhotoFields } from '@/lib/storage/einsatzPhotos';
import {
  ASSIGNMENT_LOCATION_RADIUS_METERS,
  calculateDistanceMeters,
  hasValidCoordinates,
  type Coordinates,
} from '@/lib/location/distance';
import {
  geocodeMarketAddress,
  MarketGeocodingError,
  type GeocodedMarketLocation,
} from '@/lib/location/googleGeocoding';
import { NextResponse } from 'next/server';

type AssignmentLocationInput = Coordinates & {
  accuracy_meters: number;
};

function parseAssignmentLocationInput(value: unknown): AssignmentLocationInput | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.latitude === null
    || candidate.latitude === undefined
    || candidate.latitude === ''
    || candidate.longitude === null
    || candidate.longitude === undefined
    || candidate.longitude === ''
    || candidate.accuracy_meters === null
    || candidate.accuracy_meters === undefined
    || candidate.accuracy_meters === ''
  ) {
    return null;
  }
  const coordinates = {
    latitude: Number(candidate.latitude),
    longitude: Number(candidate.longitude),
  };
  const accuracy = Number(candidate.accuracy_meters);
  if (!hasValidCoordinates(coordinates) || !Number.isFinite(accuracy) || accuracy < 0) return null;
  return { ...coordinates, accuracy_meters: accuracy };
}

function buildAddress(parts: unknown[]): string {
  return parts
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

async function resolveMarketLocation(
  service: ReturnType<typeof createSupabaseServiceClient>,
  assignment: any,
  existing: any,
): Promise<GeocodedMarketLocation> {
  const storedCoordinates = {
    latitude: Number(existing?.market_latitude),
    longitude: Number(existing?.market_longitude),
  };
  if (hasValidCoordinates(storedCoordinates) && existing?.market_geocoded_address) {
    return {
      ...storedCoordinates,
      formattedAddress: String(existing.market_geocoded_address),
    };
  }

  let market: any = null;
  if (assignment?.matched_market_id) {
    const { data, error } = await service
      .from('markets')
      .select('id, name, address, plz, city')
      .eq('id', assignment.matched_market_id)
      .maybeSingle();
    if (error) {
      throw new MarketGeocodingError(
        'MARKET_GEOCODING_UNAVAILABLE',
        'Die Marktdaten konnten gerade nicht geprüft werden. Bitte versuche es erneut.'
      );
    }
    market = data;
  }

  const address = market
    ? buildAddress([market.name, market.address, buildAddress([market.plz, market.city]), 'Österreich'])
    : buildAddress([
        assignment?.title,
        assignment?.location_text,
        buildAddress([assignment?.postal_code, assignment?.city]),
        'Österreich',
      ]);

  return geocodeMarketAddress(address);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeSchulung = url.searchParams.get('include_schulung') === '1';
    const server = await createSupabaseServerClientAsync();
    const service = createSupabaseServiceClient();

    // Check if user is authenticated
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      console.error('Auth error in /api/assignments/today:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin using service client
    const { data: profile, error: profileError } = await service
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // First, ensure tracking records exist for today's assignments
    const { error: updateError } = await service.rpc('check_and_update_tracking_status');
    if (updateError) {
      console.error('Error updating tracking status:', updateError);
    }

    // Fetch today's assignments with tracking data using the working todays_assignments view
    // First attempt: keep existing sort if column exists
    let { data: assignments, error: assignmentsError } = await service
      .from('todays_assignments')
      .select('*')
      .order('planned_start', { ascending: true });

    // Fallback: if order column changed, retry without ordering to avoid 500s
    if (assignmentsError) {
      console.warn("/api/assignments/today primary query failed, retrying without order:", assignmentsError?.message);
      const retry = await service
        .from('todays_assignments')
        .select('*');
      assignments = retry.data || [];
      assignmentsError = retry.error || null;
    }

    if (assignmentsError) {
      console.error('Error fetching today\'s assignments after retry:', assignmentsError);
      return NextResponse.json({
        error: 'Failed to fetch assignments'
      }, { status: 500 });
    }

    // Keep old default behavior (exclude Schulungen) unless explicitly requested.
    let visibleAssignments = assignments || [];
    if (!includeSchulung) {
      visibleAssignments = visibleAssignments.filter((row: any) => String(row?.type || '').toLowerCase() !== 'schulung');
    }
    const assignmentIds = visibleAssignments
      .map((row: any) => String(row?.assignment_id || row?.id || ''))
      .filter(Boolean);

    // Enrich with assignment type (for Schulung-specific rendering) and participant names.
    // This stays additive so existing consumers keep working unchanged.
    const typeByAssignmentId = new Map<string, string>();
    const participantNamesByAssignmentId = new Map<string, string[]>();
    const trackingByAssignmentUser = new Map<string, any>();

    if (assignmentIds.length > 0) {
      const { data: assignmentTypeRows } = await service
        .from('assignments')
        .select('id, type')
        .in('id', assignmentIds);
      (assignmentTypeRows || []).forEach((r: any) => {
        typeByAssignmentId.set(String(r.id), String(r.type || '').toLowerCase());
      });

      const { data: participantRows } = await service
        .from('assignment_participants')
        .select('assignment_id, user_id, role')
        .in('assignment_id', assignmentIds);

      const participantUserIds = [...new Set((participantRows || []).map((r: any) => String(r.user_id || '')).filter(Boolean))];
      const { data: profileRows } = participantUserIds.length > 0
        ? await service
          .from('user_profiles')
          .select('user_id, display_name')
          .in('user_id', participantUserIds)
        : ({ data: [] } as any);

      const displayNameByUserId = new Map<string, string>();
      (profileRows || []).forEach((p: any) => {
        displayNameByUserId.set(String(p.user_id), String(p.display_name || '').trim());
      });

      const roleWeight: Record<string, number> = { lead: 0, buddy: 1, trainer: 2 };
      const rowsSorted = [...(participantRows || [])].sort((a: any, b: any) => {
        const aw = roleWeight[String(a?.role || '').toLowerCase()] ?? 99;
        const bw = roleWeight[String(b?.role || '').toLowerCase()] ?? 99;
        return aw - bw;
      });

      rowsSorted.forEach((r: any) => {
        const assignmentId = String(r.assignment_id || '');
        const displayName = displayNameByUserId.get(String(r.user_id || '')) || '';
        if (!assignmentId || !displayName) return;
        const current = participantNamesByAssignmentId.get(assignmentId) || [];
        if (!current.includes(displayName)) current.push(displayName);
        participantNamesByAssignmentId.set(assignmentId, current);
      });

      const { data: trackingRows, error: trackingRowsError } = await service
        .from('assignment_tracking')
        .select('assignment_id, user_id, market_latitude, market_longitude, market_geocoded_address, market_geocoded_at, start_latitude, start_longitude, start_accuracy_meters, start_location_captured_at, start_distance_meters, start_location_status, end_latitude, end_longitude, end_accuracy_meters, end_location_captured_at, end_distance_meters, end_location_status')
        .in('assignment_id', [...new Set(assignmentIds)]);

      if (trackingRowsError) {
        console.error('Error enriching today assignments with location details:', trackingRowsError);
      } else {
        (trackingRows || []).forEach((tracking: any) => {
          trackingByAssignmentUser.set(
            `${String(tracking.assignment_id)}:${String(tracking.user_id)}`,
            tracking,
          );
        });
      }
    }

    const enrichedAssignments = await Promise.all(visibleAssignments.map(async (row: any) => {
      const assignmentId = String(row?.assignment_id || row?.id || '');
      const rowUserId = String(row?.user_id || row?.lead_user_id || '');
      const tracking = trackingByAssignmentUser.get(`${assignmentId}:${rowUserId}`);
      return signEinsatzPhotoFields(service, {
        ...row,
        type: String(row?.type || typeByAssignmentId.get(assignmentId) || '').toLowerCase(),
        participant_names: participantNamesByAssignmentId.get(assignmentId) || [],
        market_latitude: row?.market_latitude ?? tracking?.market_latitude ?? null,
        market_longitude: row?.market_longitude ?? tracking?.market_longitude ?? null,
        market_geocoded_address: row?.market_geocoded_address ?? tracking?.market_geocoded_address ?? null,
        market_geocoded_at: row?.market_geocoded_at ?? tracking?.market_geocoded_at ?? null,
        start_latitude: row?.start_latitude ?? tracking?.start_latitude ?? null,
        start_longitude: row?.start_longitude ?? tracking?.start_longitude ?? null,
        start_accuracy_meters: row?.start_accuracy_meters ?? tracking?.start_accuracy_meters ?? null,
        start_location_captured_at: row?.start_location_captured_at ?? tracking?.start_location_captured_at ?? null,
        start_distance_meters: row?.start_distance_meters ?? tracking?.start_distance_meters ?? null,
        start_location_status: row?.start_location_status ?? tracking?.start_location_status ?? null,
        end_latitude: row?.end_latitude ?? tracking?.end_latitude ?? null,
        end_longitude: row?.end_longitude ?? tracking?.end_longitude ?? null,
        end_accuracy_meters: row?.end_accuracy_meters ?? tracking?.end_accuracy_meters ?? null,
        end_location_captured_at: row?.end_location_captured_at ?? tracking?.end_location_captured_at ?? null,
        end_distance_meters: row?.end_distance_meters ?? tracking?.end_distance_meters ?? null,
        end_location_status: row?.end_location_status ?? tracking?.end_location_status ?? null,
      });
    }));

    return NextResponse.json({ assignments: enrichedAssignments });
  } catch (error) {
    console.error('Unexpected error in /api/assignments/today:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Update assignment tracking (start/stop times, status)
export async function PATCH(request: Request) {
  try {
    const server = await createSupabaseServerClientAsync();
    const service = createSupabaseServiceClient();

    // Check authentication
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assignment_id, user_id, action, status, actual_start_time, actual_end_time, early_start_reason, minutes_early_start, early_end_reason, minutes_early_end, foto_maschine_url, foto_kapsellade_url, foto_pos_gesamt_url, foto_extra_url, location } = body;

    if (!assignment_id) {
      return NextResponse.json({ error: 'Missing assignment_id' }, { status: 400 });
    }

    // If user_id is provided, check admin role. If not, use current user (promotor updating their own)
    const targetUserId = user_id || user.id;
    const isAdminUpdate = Boolean(user_id && user_id !== user.id);

    if (isAdminUpdate) {
      // Admin updating someone else's tracking
      const { data: profile } = await service
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || !['admin_of_admins', 'admin_staff'].includes(profile.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // Promotor updating their own - verify they're assigned to this assignment
      const { data: participation } = await service
        .from('assignment_participants')
        .select('user_id')
        .eq('assignment_id', assignment_id)
        .eq('user_id', user.id)
        .single();

      if (!participation) {
        return NextResponse.json({ error: 'Not assigned to this assignment' }, { status: 403 });
      }
    }

    const { data: assignmentSchedule, error: assignmentScheduleError } = await service
      .from('assignments')
      .select('id, title, location_text, postal_code, city, start_ts, end_ts, matched_market_id')
      .eq('id', assignment_id)
      .maybeSingle();

    if (assignmentScheduleError) {
      return NextResponse.json(
        { error: 'Failed to load assignment schedule' },
        { status: 500 }
      );
    }
    if (!assignmentSchedule) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const { data: existing, error: existingError } = await service
      .from('assignment_tracking')
      .select('id, actual_start_time, foto_maschine_url, foto_kapsellade_url, foto_pos_gesamt_url, market_latitude, market_longitude, market_geocoded_address, market_geocoded_at')
      .eq('assignment_id', assignment_id)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (existingError) {
      console.error('Error loading tracking before update:', existingError);
      return NextResponse.json(
        { error: 'Failed to load tracking data' },
        { status: 500 }
      );
    }

    const isPromotorCompletion = !isAdminUpdate && (
      Boolean(actual_end_time) ||
      action === 'stop' ||
      (status === 'beendet' && action !== 'update_status')
    );

    if (isPromotorCompletion) {
      const requiredPhotoFields = [
        'foto_maschine_url',
        'foto_kapsellade_url',
        'foto_pos_gesamt_url',
      ] as const;
      const missingPhotoTypes = requiredPhotoFields.filter((field) => !existing?.[field]);

      if (missingPhotoTypes.length > 0) {
        return NextResponse.json(
          {
            error: 'Vor dem Beenden m\u00fcssen alle drei Pflichtfotos hochgeladen werden.',
            code: 'REQUIRED_PHOTOS_MISSING',
            missing_photo_types: missingPhotoTypes,
          },
          { status: 409 }
        );
      }
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    // Handle direct timestamp updates (from promotor app)
    if (actual_start_time) {
      updateData.actual_start_time = actual_start_time;
    }
    if (actual_end_time) {
      updateData.actual_end_time = actual_end_time;
    }
    if (status) {
      updateData.status = status;
    }

    // Handle early start reasoning
    if (early_start_reason) {
      updateData.early_start_reason = early_start_reason;
    }
    if (minutes_early_start !== undefined) {
      updateData.minutes_early_start = minutes_early_start;
    }

    // Handle early end reasoning
    if (early_end_reason) {
      updateData.early_end_reason = early_end_reason;
    }
    if (minutes_early_end !== undefined) {
      updateData.minutes_early_end = minutes_early_end;
    }

    // Promotor photo references can only be written by the verified upload route.
    // Admin corrections may still provide URLs directly.
    // Handle photo URLs
    if (isAdminUpdate && foto_maschine_url) {
      updateData.foto_maschine_url = foto_maschine_url;
    }
    if (isAdminUpdate && foto_kapsellade_url) {
      updateData.foto_kapsellade_url = foto_kapsellade_url;
    }
    if (isAdminUpdate && foto_pos_gesamt_url) {
      updateData.foto_pos_gesamt_url = foto_pos_gesamt_url;
    }
    if (isAdminUpdate && foto_extra_url) {
      updateData.foto_extra_url = foto_extra_url;
    }

    // Handle action-based updates (legacy admin interface)
    if (action) {
      // Get Austrian local time as ISO string WITHOUT timezone conversion
      const now = new Date();
      // Use sv-SE locale which gives YYYY-MM-DD HH:mm:ss format
      const austrianTimeString = now.toLocaleString('sv-SE', {
        timeZone: 'Europe/Vienna',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).replace(' ', 'T') + '.000Z';  // Add T and fake Z to make it look like ISO but with Austrian time

      switch (action) {
        case 'start':
          updateData.actual_start_time = austrianTimeString;
          updateData.status = 'gestartet';
          break;
        case 'stop':
          updateData.actual_end_time = austrianTimeString;
          updateData.status = 'beendet';
          break;
        case 'update_status':
          if (!status || !['krankenstand', 'urlaub', 'zeitausgleich'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
          }
          updateData.status = status;
          break;
        default:
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
    }

    if (
      !isAdminUpdate
      && updateData.status === 'gestartet'
      && !updateData.actual_start_time
      && !existing?.actual_start_time
    ) {
      return NextResponse.json(
        { error: 'Ein gestarteter Einsatz benötigt einen Startzeitpunkt.' },
        { status: 400 }
      );
    }

    if (!isAdminUpdate && updateData.actual_start_time) {
      const capturedLocation = parseAssignmentLocationInput(location);
      if (!capturedLocation) {
        return NextResponse.json(
          {
            error: 'Für den Start ist eine aktuelle Standortprüfung erforderlich.',
            code: 'LOCATION_REQUIRED',
          },
          { status: 422 }
        );
      }

      try {
        const marketLocation = await resolveMarketLocation(service, assignmentSchedule, existing);
        const distanceMeters = calculateDistanceMeters(capturedLocation, marketLocation);

        if (distanceMeters > ASSIGNMENT_LOCATION_RADIUS_METERS) {
          return NextResponse.json(
            {
              error: `Du bist ${Math.round(distanceMeters)} Meter vom Markt entfernt. Der Einsatz kann nur innerhalb von ${ASSIGNMENT_LOCATION_RADIUS_METERS} Metern gestartet werden.`,
              code: 'LOCATION_OUTSIDE_RADIUS',
              distance_meters: Math.round(distanceMeters),
              allowed_radius_meters: ASSIGNMENT_LOCATION_RADIUS_METERS,
            },
            { status: 422 }
          );
        }

        const capturedAt = new Date().toISOString();
        updateData.market_latitude = marketLocation.latitude;
        updateData.market_longitude = marketLocation.longitude;
        updateData.market_geocoded_address = marketLocation.formattedAddress;
        updateData.market_geocoded_at = existing?.market_geocoded_at || capturedAt;
        updateData.location_confirmed = true;
        updateData.start_latitude = capturedLocation.latitude;
        updateData.start_longitude = capturedLocation.longitude;
        updateData.start_accuracy_meters = capturedLocation.accuracy_meters;
        updateData.start_location_captured_at = capturedAt;
        updateData.start_distance_meters = Math.round(distanceMeters * 100) / 100;
        updateData.start_location_status = 'verified';
      } catch (error) {
        if (error instanceof MarketGeocodingError) {
          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.code === 'MARKET_GEOCODING_UNAVAILABLE' ? 503 : 422 }
          );
        }
        throw error;
      }
    }


    // Update or create tracking record
    let result;
    if (existing) {
      // Update existing record
      result = await service
        .from('assignment_tracking')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      // Create new record
      result = await service
        .from('assignment_tracking')
        .insert({
          assignment_id,
          user_id: targetUserId,
          ...updateData
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating tracking:', result.error);
      return NextResponse.json({
        error: 'Failed to update tracking'
      }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/assignments/today:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
