import { NextRequest, NextResponse } from 'next/server';
import { recordDataAccess } from '@/lib/audit/dataAccess';
import { requireAdmin, requireSelfOrAdmin } from '@/lib/auth/routeGuards';
import {
  composeSocialSecurityNumber,
  getSocialSecuritySerial,
  isValidSocialSecurityNumber,
  normalizeSocialSecurityNumber,
} from '@/lib/identity/socialSecurityNumber';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';
import { isValidDateInput, isValidPhoneNumber } from '@/lib/promotors/personalData';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const svc = createSupabaseServiceClient();
  const { data: existingProfile, error: existingProfileError } = await svc
    .from('promotor_profiles')
    .select('*')
    .eq('user_id', params.id)
    .maybeSingle();
  if (existingProfileError) {
    return NextResponse.json({ error: 'profile lookup failed' }, { status: 500 });
  }
  if (!existingProfile) {
    return NextResponse.json({ error: 'Promotorprofil nicht gefunden' }, { status: 404 });
  }

  const hasBirthDateUpdate = typeof raw.birth_date === 'string';
  const hasSocialSecurityNumberUpdate = typeof raw.social_security_number === 'string';
  const birthDateUpdate = hasBirthDateUpdate ? raw.birth_date.trim() : undefined;
  let socialSecurityNumberUpdate = hasSocialSecurityNumberUpdate
    ? raw.social_security_number
    : undefined;

  if (hasBirthDateUpdate || hasSocialSecurityNumberUpdate) {
    const effectiveBirthDate = birthDateUpdate ?? existingProfile.birth_date;
    if (hasSocialSecurityNumberUpdate) {
      socialSecurityNumberUpdate = normalizeSocialSecurityNumber(
        socialSecurityNumberUpdate,
        effectiveBirthDate,
      );
    } else if (existingProfile.social_security_number) {
      socialSecurityNumberUpdate = composeSocialSecurityNumber(
        getSocialSecuritySerial(existingProfile.social_security_number, existingProfile.birth_date),
        effectiveBirthDate,
      );
    }

    if (
      socialSecurityNumberUpdate
      && !isValidSocialSecurityNumber(socialSecurityNumberUpdate, effectiveBirthDate)
    ) {
      return NextResponse.json(
        { error: 'SV-Nummer muss dem Format ####TTMMJJ entsprechen' },
        { status: 400 },
      );
    }
  }

  const allowed = {
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : undefined,
    address: typeof raw.address === 'string' ? raw.address.trim() : undefined,
    postal_code: typeof raw.postal_code === 'string' ? raw.postal_code.trim() : undefined,
    city: typeof raw.city === 'string' ? raw.city.trim() : undefined,
    region: typeof raw.region === 'string' ? raw.region : undefined,
    working_days: Array.isArray(raw.working_days) ? raw.working_days : undefined,
    height: typeof raw.height === 'string' ? raw.height : undefined,
    clothing_size: typeof raw.clothing_size === 'string' ? raw.clothing_size : undefined,
    birth_date: birthDateUpdate,
    social_security_number: socialSecurityNumberUpdate,
    citizenship: typeof raw.citizenship === 'string' ? raw.citizenship : undefined,
    bank_iban: typeof raw.bank_iban === 'string' ? raw.bank_iban : undefined,
    bank_bic: typeof raw.bank_bic === 'string' ? raw.bank_bic : undefined,
    bank_holder: typeof raw.bank_holder === 'string' ? raw.bank_holder : undefined,
    bank_name: typeof raw.bank_name === 'string' ? raw.bank_name : undefined,
    profile_picture_url: typeof raw.profile_picture_url === 'string' ? raw.profile_picture_url.slice(0, 1000) : undefined,
  } as any;

  const email: string | undefined = typeof raw.email === 'string' ? raw.email.trim() : undefined;

  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
  }
  if (allowed.phone && !isValidPhoneNumber(allowed.phone)) {
    return NextResponse.json({ error: 'Ungültige Telefonnummer' }, { status: 400 });
  }
  if (allowed.postal_code && !/^\d{4}$/.test(allowed.postal_code)) {
    return NextResponse.json({ error: 'Die PLZ muss aus vier Ziffern bestehen' }, { status: 400 });
  }
  if (allowed.birth_date && !isValidDateInput(allowed.birth_date)) {
    return NextResponse.json({ error: 'Ungültiges Geburtsdatum' }, { status: 400 });
  }

  const updates: any = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(allowed)) if (v !== undefined) updates[k] = v;
  const hasProfileChanges = Object.keys(updates).length > 1;
  if (!hasProfileChanges && email === undefined) {
    return NextResponse.json({ error: 'no valid fields' }, { status: 400 });
  }

  const rollbackProfile = async () => {
    if (!hasProfileChanges) return;
    const rollback: Record<string, unknown> = {};
    for (const key of Object.keys(allowed)) {
      if (allowed[key] !== undefined) rollback[key] = existingProfile[key];
    }
    await svc.from('promotor_profiles').update(rollback).eq('user_id', params.id);
  };

  let updatedProfile = existingProfile;
  if (hasProfileChanges) {
    let updateResult = await svc
      .from('promotor_profiles')
      .update(updates)
      .eq('user_id', params.id)
      .select('*')
      .maybeSingle();

    if (updateResult.error) {
      const bankNameValue = updates.bank_name;
      if (bankNameValue !== undefined && /bank_name/.test(updateResult.error.message || '')) {
        const alternativeUpdates = { ...updates };
        delete alternativeUpdates.bank_name;
        alternativeUpdates.bankname = bankNameValue;
        updateResult = await svc
          .from('promotor_profiles')
          .update(alternativeUpdates)
          .eq('user_id', params.id)
          .select('*')
          .maybeSingle();
      }
    }
    if (updateResult.error || !updateResult.data) {
      return NextResponse.json({ error: 'profile update failed' }, { status: 500 });
    }
    updatedProfile = updateResult.data;
  }

  if (email !== undefined) {
    const { data: authUserResult, error: authUserError } = await svc.auth.admin.getUserById(params.id);
    if (authUserError || !authUserResult.user) {
      await rollbackProfile();
      return NextResponse.json({ error: 'Auth-Benutzer nicht gefunden' }, { status: 500 });
    }

    const previousAuthEmail = authUserResult.user.email || '';
    const authEmailChanged = previousAuthEmail.toLowerCase() !== email.toLowerCase();
    if (authEmailChanged) {
      const { error: authEmailError } = await svc.auth.admin.updateUserById(params.id, {
        email,
        email_confirm: true,
      });
      if (authEmailError) {
        await rollbackProfile();
        return NextResponse.json({ error: authEmailError.message }, { status: 500 });
      }
    }

    if (existingProfile.application_id) {
      const { data: updatedApplication, error: applicationEmailError } = await svc
        .from('applications')
        .update({ email })
        .eq('id', existingProfile.application_id)
        .select('id')
        .maybeSingle();
      if (applicationEmailError || !updatedApplication) {
        if (authEmailChanged && previousAuthEmail) {
          await svc.auth.admin.updateUserById(params.id, {
            email: previousAuthEmail,
            email_confirm: true,
          });
        }
        await rollbackProfile();
        return NextResponse.json({ error: 'Verknüpfte Bewerbung konnte nicht aktualisiert werden' }, { status: 500 });
      }
    }
  }

  // Recompute onboarding after profile change
  if (hasProfileChanges) {
    try { await recomputeOnboarding(svc as any, params.id); } catch {}
  }
  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'promotor_profile_updated',
    resourceType: 'promotor_profile',
    resourceId: params.id,
    subjectUserId: params.id,
    metadata: { changed_field_count: Object.keys(updates).length - 1 + (email !== undefined ? 1 : 0) },
  });
  return NextResponse.json({ ok: true, profile: updatedProfile, email });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const promotorId = String(params.id || '').trim();
  if (!UUID_PATTERN.test(promotorId)) {
    return NextResponse.json({ error: 'invalid promotor id' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const { data: profile, error: profileError } = await svc
    .from('user_profiles')
    .select('user_id, role, deleted')
    .eq('user_id', promotorId)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: 'promotor lookup failed' }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: 'promotor not found' }, { status: 404 });
  }
  if (profile.role !== 'promotor') {
    return NextResponse.json({ error: 'only promotors can be deleted here' }, { status: 400 });
  }

  const wasDeleted = profile.deleted === true;
  if (!wasDeleted) {
    const { data: updatedProfile, error: updateError } = await svc
      .from('user_profiles')
      .update({ deleted: true, updated_at: new Date().toISOString() })
      .eq('user_id', promotorId)
      .eq('role', 'promotor')
      .eq('deleted', false)
      .select('user_id')
      .maybeSingle();
    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: 'promotor deletion failed' }, { status: 500 });
    }
  }

  const { error: banError } = await svc.auth.admin.updateUserById(promotorId, {
    ban_duration: '876000h',
  });
  if (banError) {
    if (!wasDeleted) {
      await svc
        .from('user_profiles')
        .update({ deleted: false, updated_at: new Date().toISOString() })
        .eq('user_id', promotorId)
        .eq('role', 'promotor');
    }
    return NextResponse.json({ error: 'login access could not be revoked' }, { status: 500 });
  }

  await recordDataAccess({
    actorUserId: auth.user.id,
    action: 'promotor_soft_deleted',
    resourceType: 'promotor_profile',
    resourceId: promotorId,
    subjectUserId: promotorId,
    metadata: { existing_records_preserved: true, auth_account_preserved: true },
  });

  return NextResponse.json({ ok: true, alreadyDeleted: wasDeleted });
}


