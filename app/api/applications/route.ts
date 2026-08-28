import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { z } from 'zod';

const applicationSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Optional detailed fields from the onboarding modal
  title: z.string().optional().nullable(),
  gender: z.string().optional().nullable(),
  pronouns: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  socialSecurityNumber: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  citizenship: z.string().optional().nullable(),
  workPermit: z.boolean().optional().nullable(),
  drivingLicense: z.boolean().optional().nullable(),
  carAvailable: z.boolean().optional().nullable(),
  willingToDrive: z.boolean().optional().nullable(),
  clothingSize: z.string().optional().nullable(),
  height: z.string().optional().nullable(),
  education: z.string().optional().nullable(),
  qualifications: z.string().optional().nullable(),
  currentJob: z.string().optional().nullable(),
  spontaneity: z.string().optional().nullable(),
  preferredRegion: z.string().optional().nullable(),
  workingDays: z.array(z.string()).optional().nullable(),
  hoursPerWeek: z.string().optional().nullable(),
  status: z.literal('received'),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();
  const { data, error } = await svc.from('applications').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data ?? [] });
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 100_000) {
    return NextResponse.json({ error: 'Anfrage zu gross' }, { status: 413 });
  }
  const raw = await req.json().catch(() => ({} as any));
  const fullNameComputed = (raw.full_name ?? `${raw.firstName ?? ''} ${raw.lastName ?? ''}`)?.trim?.() ?? '';
  const emailComputed = typeof raw.email === 'string' ? raw.email.trim() : '';
  // Do not block the flow; persist even with partial data
  const fullName = fullNameComputed || 'Unbekannt';
  const email = emailComputed || null;
  const body = {
    full_name: fullName,
    email,
    phone: raw.phone ? String(raw.phone) : null,
    notes: raw.notes ? String(raw.notes) : null,
    title: raw.title ?? null,
    gender: raw.gender ?? null,
    pronouns: raw.pronouns ?? null,
    address: raw.address ?? null,
    postalCode: raw.postalCode ?? null,
    city: raw.city ?? null,
    socialSecurityNumber: raw.socialSecurityNumber ?? null,
    birthDate: raw.birthDate ?? null,
    citizenship: raw.citizenship ?? null,
    workPermit: raw.workPermit ?? null,
    drivingLicense: raw.drivingLicense ?? null,
    carAvailable: raw.carAvailable ?? null,
    willingToDrive: raw.willingToDrive ?? null,
    clothingSize: raw.clothingSize ?? null,
    height: raw.height ?? null,
    education: raw.education ?? null,
    qualifications: raw.qualifications ?? null,
    currentJob: raw.currentJob ?? null,
    spontaneity: raw.spontaneity ?? null,
    preferredRegion: raw.preferredRegion ?? null,
    workingDays: Array.isArray(raw.workingDays) ? raw.workingDays : null,
    hoursPerWeek: raw.hoursPerWeek ?? null,
    status: 'received' as const,
  };
  // Validate minimally
  const parsed = applicationSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.errors.map(e => e.message).join(', ');
    return NextResponse.json({ error: msg || 'Ungültige Daten' }, { status: 400 });
  }
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from('applications').insert(parsed.data).select('*').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const svc = createSupabaseServiceClient();
  const body = await req.json().catch(() => ({} as any));
  const id = body?.id;
  const status = body?.status;
  if (!id || !['received','review','approved','rejected'].includes(status)) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  const { error } = await svc.from('applications').update({ status }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const svc = createSupabaseServiceClient();
  const body = await req.json().catch(() => ({} as any));
  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }

  const { error } = await svc.from('applications').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

