import { SupabaseClient } from '@supabase/supabase-js';

type OnboardingStatus = 'pending' | 'in_progress' | 'done';

function statusFromFlags(hasAny: boolean, hasAll: boolean): OnboardingStatus {
  if (hasAll) return 'done';
  if (hasAny) return 'in_progress';
  return 'pending';
}

export async function recomputeOnboarding(svc: SupabaseClient, userId: string) {
  // Load canonical profile (may not exist yet)
  const { data: profile } = await svc
    .from('promotor_profiles')
    .select('phone, address, postal_code, city, region, working_days, height, clothing_size, needs_work_permit, bank_iban, bank_bic, bank_holder, application_id')
    .eq('user_id', userId)
    .maybeSingle();

  // Load application data for drivingLicense check
  let application: any = null;
  if (profile?.application_id) {
    const { data: appData } = await svc
      .from('applications')
      .select('drivingLicense')
      .eq('id', profile.application_id)
      .maybeSingle();
    application = appData;
  }

  // Documents: tolerant if table missing
  let docs: Array<{ doc_type: string; status: string }> = [];
  try {
    const { data } = await svc
      .from('documents')
      .select('doc_type, status')
      .eq('user_id', userId);
    docs = (data as any[]) || [];
  } catch {}

  // Dienstvertrag files: tolerant if table missing
  let hasActiveContract = false;
  try {
    const { data } = await svc
      .from('dienstvertrag_files')
      .select('id, is_active, file_path')
      .eq('user_id', userId);
    const rows = (data as any[]) || [];
    hasActiveContract = rows.some(r => r?.is_active && r?.file_path);
  } catch {}

  // Step: profile_basics
  const profileFields = [
    profile?.phone,
    profile?.address ?? [profile?.postal_code, profile?.city].filter(Boolean).join(' '),
    profile?.region,
    Array.isArray(profile?.working_days) && profile!.working_days.length ? 'ok' : '',
    profile?.height,
    profile?.clothing_size,
  ];
  const profileAny = profileFields.some(Boolean);
  const profileAll = profileFields.every(Boolean);
  const profileStatus: OnboardingStatus = statusFromFlags(profileAny, profileAll);

  // Step: documents
  // Required: passport, strafregister
  // Conditional required: fuehrerschein (only if applicant claims to have one), arbeitserlaubnis (only if profile needs it)
  // Optional: citizenship, additional
  const requiredDocs = ['passport', 'strafregister'];
  const needsWP = !!profile?.needs_work_permit;
  const hasDrivingLicense = (application?.drivingLicense ?? (application as any)?.driving_license) ? true : false;
  if (needsWP) requiredDocs.push('arbeitserlaubnis');
  if (hasDrivingLicense) requiredDocs.push('fuehrerschein');
  const docMap = new Map(docs.map(d => [String(d.doc_type), d.status]));
  const anyDoc = requiredDocs.some(k => docMap.has(k));
  const allApproved = requiredDocs.every(k => docMap.get(k) === 'approved');
  const documentsStatus: OnboardingStatus = statusFromFlags(anyDoc, allApproved);

  // Step: dienstvertrag
  const dienstvertragStatus: OnboardingStatus = hasActiveContract ? 'done' : 'pending';

  // Step: bank_details
  const bankFields = [profile?.bank_iban, profile?.bank_bic, profile?.bank_holder];
  const bankAny = bankFields.some(Boolean);
  const bankAll = bankFields.every(Boolean);
  const bankStatus: OnboardingStatus = statusFromFlags(bankAny, bankAll);

  // first_training remains managed by training feature later
  let firstTrainingStatus: OnboardingStatus = 'pending';

  // Upsert/update steps
  const desired = [
    { step_key: 'profile_basics', label: 'Profil vervollständigen', status: profileStatus },
    { step_key: 'documents', label: 'Dokumente hochladen', status: documentsStatus },
    { step_key: 'dienstvertrag', label: 'Dienstvertrag hinterlegt', status: dienstvertragStatus },
    { step_key: 'bank_details', label: 'Bankdaten hinterlegen', status: bankStatus },
    { step_key: 'first_training', label: 'Erste Schulung starten', status: firstTrainingStatus },
  ];

  const { data: existing } = await svc
    .from('onboarding_steps')
    .select('step_key, status')
    .eq('user_id', userId);
  const existingMap = new Map((existing || []).map((s: any) => [s.step_key, s.status]));

  for (const d of desired) {
    const prev = existingMap.get(d.step_key);
    if (!prev) {
      await svc.from('onboarding_steps').insert({ user_id: userId, step_key: d.step_key, label: d.label, status: d.status });
      continue;
    }
    if (prev !== d.status) {
      const update: any = { status: d.status, updated_at: new Date().toISOString() };
      if (d.status === 'done') update.completed_at = new Date().toISOString();
      await svc.from('onboarding_steps').update(update).eq('user_id', userId).eq('step_key', d.step_key);
    }
  }

  // Return latest
  const { data: steps } = await svc
    .from('onboarding_steps')
    .select('id, step_key, label, status, payload, created_at, updated_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return steps || [];
}


