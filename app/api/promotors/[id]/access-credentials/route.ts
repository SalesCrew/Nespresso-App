import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';
import { recordDataAccess } from '@/lib/audit/dataAccess';

const EDITABLE_FIELDS = new Set([
  'huebner_email', 'huebner_password',
  'demotool_email', 'demotool_password',
  'tma_email', 'tma_password',
  'boost_app_email', 'boost_app_password',
  'easyname_email', 'easyname_password',
]);

function sanitizeCredentialUpdate(input: unknown): Record<string, string | null> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input as Record<string, unknown>)
      .filter(([key]) => EDITABLE_FIELDS.has(key))
      .map(([key, value]) => [key, value === null ? null : String(value).slice(0, 500)])
  );
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const promotorId = params.id;
  const auth = await requireSelfOrAdmin(promotorId);
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();

  try {
    const userId = promotorId;

    // Get access credentials for this user
    const { data: credentials, error: credentialsError } = await svc
      .from('access_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (credentialsError && credentialsError.code !== 'PGRST116') {
      console.error('Error fetching access credentials:', credentialsError);
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 });
    }

    await recordDataAccess({
      actorUserId: auth.user.id,
      action: 'external_credentials_read',
      resourceType: 'access_credentials',
      resourceId: credentials?.id || null,
      subjectUserId: userId,
    });

    return NextResponse.json(
      { credentials: credentials || null },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const promotorId = params.id;
  const auth = await requireSelfOrAdmin(promotorId);
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();

  try {
    const userId = promotorId;
    const updateData = sanitizeCredentialUpdate(await req.json().catch(() => null));
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'no editable fields provided' }, { status: 400 });
    }

    // First check if record exists
    const { data: existing, error: checkError } = await svc
      .from('access_credentials')
      .select('*')
      .eq('user_id', userId)
      .single();

    let result;
    if (existing) {
      const { data: updated, error: updateError } = await svc
        .from('access_credentials')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }
      result = updated;
    } else {
      const { data: inserted, error: insertError } = await svc
        .from('access_credentials')
        .insert({ user_id: userId, ...updateData })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }
      result = inserted;
    }

    await recordDataAccess({
      actorUserId: auth.user.id,
      action: 'external_credentials_updated',
      resourceType: 'access_credentials',
      resourceId: result?.id || null,
      subjectUserId: userId,
      metadata: { changed_field_count: Object.keys(updateData).length },
    });

    return NextResponse.json(
      { credentials: result },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
