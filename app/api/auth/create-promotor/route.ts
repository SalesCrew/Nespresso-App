import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const payloadSchema = z.object({
  email: z.string(), // allow free input; validate minimally below
  display_name: z.string().min(1),
  password: z.string().min(6).max(128).optional(),
  applicationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = (parsed.data.email || '').trim();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Ungültige E-Mail für Kontoerstellung' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const password = parsed.data.password ?? crypto.randomUUID().slice(0, 12);

  const { data: authUser, error: signUpError } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: parsed.data.display_name },
  });
  if (signUpError || !authUser?.user) {
    return NextResponse.json({ error: signUpError?.message ?? 'failed to create user' }, { status: 500 });
  }

  const { error: profileError } = await svc.from('user_profiles').insert({
    user_id: authUser.user.id,
    role: 'promotor',
    display_name: parsed.data.display_name,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (parsed.data.applicationId) {
    // Mark application approved and copy core fields into promotor_profiles as canonical source
    const applicationId = parsed.data.applicationId;
    await svc.from('applications').update({ status: 'approved' }).eq('id', applicationId);
    const { data: appRow } = await svc
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle();

    // Upsert profile with mapped fields (field-level fallbacks; arrays preserved)
    await svc.from('promotor_profiles').upsert({
      user_id: authUser.user.id,
      application_id: applicationId,
      phone: appRow?.phone ?? null,
      address: appRow?.address ?? null,
      postal_code: appRow?.postalCode ?? null,
      city: appRow?.city ?? null,
      region: appRow?.preferredRegion ?? null,
      working_days: Array.isArray(appRow?.workingDays) ? appRow?.workingDays : null,
      height: appRow?.height ?? null,
      clothing_size: appRow?.clothingSize ?? null,
      birth_date: appRow?.birthDate ?? null,
      social_security_number: appRow?.socialSecurityNumber ?? null,
      citizenship: appRow?.citizenship ?? null,
    });

    // Seed onboarding steps for the new promotor (idempotent)
    const defaultSteps = [
      { step_key: 'profile_basics', label: 'Profil vervollständigen' },
      { step_key: 'documents', label: 'Dokumente hochladen' },
      { step_key: 'first_training', label: 'Erste Schulung starten' },
      { step_key: 'bank_details', label: 'Bankdaten hinterlegen' },
    ];
    const { data: existingSteps } = await svc
      .from('onboarding_steps')
      .select('step_key')
      .eq('user_id', authUser.user.id);
    const existingKeys = new Set((existingSteps || []).map((r: any) => r.step_key));
    const toInsert = defaultSteps
      .filter(s => !existingKeys.has(s.step_key))
      .map(s => ({ user_id: authUser.user.id, step_key: s.step_key, label: s.label, status: 'pending' as const }));
    if (toInsert.length) {
      await svc.from('onboarding_steps').insert(toInsert as any);
    }
  }

  return NextResponse.json({ ok: true, user_id: authUser.user.id, password });
}


