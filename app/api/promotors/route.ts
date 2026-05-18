import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  const server = await createSupabaseServerClientAsync();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const svc = createSupabaseServiceClient();

  // Pull promotor base identities
  const { data: users, error: usersErr } = await svc
    .from('user_profiles')
    .select('user_id, display_name, phone, role')
    .eq('role', 'promotor');
  if (usersErr) return NextResponse.json({ error: usersErr.message }, { status: 500 });

  // Pull canonical promotor_profiles and join back to applications for fallback
  const userIds = (users || []).map((u: { user_id: string }) => u.user_id);
  console.log('Loading promotor_profiles for userIds:', userIds);
  const { data: profiles, error: profilesError } = await svc
    .from('promotor_profiles')
    .select('*')
    .in('user_id', userIds);
  console.log('Promotor profiles loaded:', profiles?.length || 0, 'profiles');
  console.log('Profiles error:', profilesError);
  if (profiles) {
    console.log('Sample profile:', profiles[0]);
  }
  const appIds = (profiles || []).map((p: any) => p.application_id).filter(Boolean) as string[];
  const { data: applications } = appIds.length
    ? await svc.from('applications').select('*').in('id', appIds)
    : ({ data: [] } as { data: any[] });

  const appById = new Map((applications || []).map((a: any) => [a.id, a]));
  const profileByUser = new Map((profiles || []).map((p: any) => [p.user_id, p]));

  const cards = (users || []).map((u: any) => {
    const profile: any = profileByUser.get(u.user_id) || null;
    const app: any = profile?.application_id ? appById.get(profile.application_id) : null;
    const fullName = (u.display_name || '').trim() || (app?.full_name || '');
    // Handle both camelCase and snake_case field names from applications table
    const address = [
      profile?.address ?? app?.address,
      profile?.postal_code ?? app?.postalCode ?? app?.postal_code,
      profile?.city ?? app?.city
    ].filter(Boolean).join(', ');
    return {
      id: u.user_id,
      name: fullName,
      email: app?.email || null,
      phone: profile?.phone ?? u.phone ?? app?.phone ?? null,
      address,
      birthDate: profile?.birth_date ?? profile?.birthDate ?? app?.birthDate ?? app?.birth_date ?? null,
      region: profile?.region ?? app?.preferredRegion ?? app?.preferred_region ?? 'wien-noe-bgl',
      workingDays: profile?.working_days ?? app?.workingDays ?? app?.working_days ?? [],
      status: 'active',
      avatar: profile?.profile_picture_url || '/placeholder.svg',
      bankDetails: {
        accountHolder: profile?.bank_holder ?? '',
        bankName: (profile?.bank_name ?? (profile as any)?.bankname) ?? '',
        iban: profile?.bank_iban ?? '',
        bic: profile?.bank_bic ?? ''
      },
      clothingInfo: { 
        height: profile?.height ?? app?.height ?? '', 
        size: profile?.clothing_size ?? app?.clothingSize ?? app?.clothing_size ?? app?.clothingsize ?? '' 
      },
      personalData: { 
        birth_date: profile?.birth_date ?? profile?.birthDate ?? app?.birthDate ?? app?.birth_date ?? '', 
        social_security_number: profile?.social_security_number ?? profile?.socialSecurityNumber ?? app?.socialSecurityNumber ?? '', 
        citizenship: profile?.citizenship ?? app?.citizenship ?? '',
        working_days: profile?.working_days ?? app?.workingDays ?? []
      },
      applicationId: profile?.application_id || null,
    };
  });

  return NextResponse.json({ promotors: cards });
}


