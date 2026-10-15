import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { recordDataAccess } from '@/lib/audit/dataAccess'
import { EINSATZ_PHOTO_URL_FIELDS, withEinsatzPhotoUrls } from '@/lib/storage/einsatzPhotos'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const assignmentId = (await params).id
    if (!assignmentId) {
      return NextResponse.json({ error: 'Missing assignmentId' }, { status: 400 })
    }

    const auth = await requireAdmin()
    if (!auth.ok) return auth.response

    const svc = createSupabaseServiceClient()

    const { data: assignmentRows, error: assignmentError } = await svc
      .from('assignments_with_buddy_info')
      .select('id, title, location_text, postal_code, city, start_ts, end_ts, notes, special_status, lead_user_id, lead_name, buddy_user_id, buddy_display_name')
      .eq('id', assignmentId)

    if (assignmentError || !assignmentRows?.length) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const { data: trackingRows, error: trackingError } = await svc
        .from('assignment_tracking')
        .select('assignment_id, user_id, buddy_user_id, actual_start_time, actual_end_time, status, notes, early_start_reason, minutes_early_start, early_end_reason, minutes_early_end, foto_maschine_url, foto_kapsellade_url, foto_pos_gesamt_url, foto_extra_url')
        .eq('assignment_id', assignmentId)
    if (trackingError) return NextResponse.json({ error: 'Tracking konnte nicht geladen werden.' }, { status: 503 })
    const photoOwners = (trackingRows || []).filter(row => EINSATZ_PHOTO_URL_FIELDS.some(field => row[field]))
    // Historical duplicate lead entries must not turn an existing visit into a
    // 404. When exactly one lead uploaded photos, show that lead's actual record.
    const assignment = (assignmentRows.length > 1 && photoOwners.length === 1
      ? assignmentRows.find(row => row.lead_user_id === photoOwners[0].user_id) : null) || assignmentRows[0]
    const trackingRow = (trackingRows || []).find(row => row.user_id === assignment.lead_user_id)
    const tracking = trackingRow ? withEinsatzPhotoUrls(trackingRow) : null

    const { data: checkins } = await svc
      .from('assignment_daily_checkin')
      .select('checked_in_at')
      .eq('assignment_id', assignmentId)
      .order('checked_in_at', { ascending: true })

    const { data: outsideBreaks } = await svc
      .from('assignment_outside_breaks')
      .select('reported_at, user_id, created_at')
      .eq('assignment_id', assignmentId)
      .order('reported_at', { ascending: true })

    await recordDataAccess({
      actorUserId: auth.user.id,
      action: 'assignment_tracking_read',
      resourceType: 'assignment_tracking',
      resourceId: assignmentId,
      subjectUserId: assignment.lead_user_id || null,
      metadata: { includes_location: true, includes_photos: true },
    })

    return NextResponse.json({
      assignment,
      tracking,
      checkins: checkins || [],
      outsideBreaks: outsideBreaks || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
