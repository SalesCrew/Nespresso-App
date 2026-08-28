import { NextRequest, NextResponse } from 'next/server';
import { recordDataAccess } from '@/lib/audit/dataAccess';
import { requireSelfOrAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSelfOrAdmin(params.id);
  if (!auth.ok) return auth.response;

  const svc = createSupabaseServiceClient();

  const { data: profile } = await svc
    .from('promotor_profiles')
    .select('*')
    .eq('user_id', params.id)
    .maybeSingle();

  let application: any = null;
  if (profile?.application_id) {
    const { data: appRow } = await svc
      .from('applications')
      .select('*')
      .eq('id', profile.application_id)
      .maybeSingle();
    application = appRow || null;
  }

  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'promotor_profile_read',
    resourceType: 'promotor_profile',
    resourceId: params.id,
    subjectUserId: params.id,
    metadata: { includes_financial_data: true, includes_identity_data: true },
  });
  return NextResponse.json(
    { profile: profile || null, application },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireSelfOrAdmin(params.id);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => ({} as any));
  const allowed = {
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    address: typeof raw.address === 'string' ? raw.address : undefined,
    postal_code: typeof raw.postal_code === 'string' ? raw.postal_code : undefined,
    city: typeof raw.city === 'string' ? raw.city : undefined,
    region: typeof raw.region === 'string' ? raw.region : undefined,
    working_days: Array.isArray(raw.working_days) ? raw.working_days : undefined,
    height: typeof raw.height === 'string' ? raw.height : undefined,
    clothing_size: typeof raw.clothing_size === 'string' ? raw.clothing_size : undefined,
    birth_date: typeof raw.birth_date === 'string' ? raw.birth_date : undefined,
    social_security_number: typeof raw.social_security_number === 'string' ? raw.social_security_number : undefined,
    citizenship: typeof raw.citizenship === 'string' ? raw.citizenship : undefined,
    bank_iban: typeof raw.bank_iban === 'string' ? raw.bank_iban : undefined,
    bank_bic: typeof raw.bank_bic === 'string' ? raw.bank_bic : undefined,
    bank_holder: typeof raw.bank_holder === 'string' ? raw.bank_holder : undefined,
    bank_name: typeof raw.bank_name === 'string' ? raw.bank_name : undefined,
    profile_picture_url: typeof raw.profile_picture_url === 'string' ? raw.profile_picture_url.slice(0, 1000) : undefined,
  } as any;

  const email: string | undefined = typeof raw.email === 'string' ? raw.email : undefined;

  const updates: any = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(allowed)) if (v !== undefined) updates[k] = v;
  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  let { error } = await svc
    .from('promotor_profiles')
    .update(updates)
    .eq('user_id', params.id);
  if (error) {
    // Fallback: if project used an alternative column name like 'bankname'
    // try again by mapping bank_name -> bankname
    const bankNameValue = (updates as any).bank_name;
    if (bankNameValue !== undefined && /bank_name/.test(error.message || '')) {
      const alt: any = { ...updates };
      delete alt.bank_name;
      alt.bankname = bankNameValue;
      const retry = await svc.from('promotor_profiles').update(alt).eq('user_id', params.id);
      if (retry.error) return NextResponse.json({ error: 'profile update failed' }, { status: 500 });
    } else {
      return NextResponse.json({ error: 'profile update failed' }, { status: 500 });
    }
  }
  // If email was provided, update the linked application email (source of truth for UI)
  if (email) {
    try {
      const { data: prof } = await svc
        .from('promotor_profiles')
        .select('application_id')
        .eq('user_id', params.id)
        .maybeSingle();
      if (prof?.application_id) {
        await svc
          .from('applications')
          .update({ email })
          .eq('id', prof.application_id);
      }
    } catch (e: any) {
      console.error('Failed to update application email:', e?.message || e);
    }
  }
  // Recompute onboarding after profile change
  try { await recomputeOnboarding(svc as any, params.id); } catch {}
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'promotor_profile_updated',
    resourceType: 'promotor_profile',
    resourceId: params.id,
    subjectUserId: params.id,
    metadata: { changed_field_count: Object.keys(updates).length - 1 },
  });
  return NextResponse.json({ ok: true });
}


