import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { marketImportKey } from '@/lib/storage/marketPhotos';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify admin access
    const { data: profile } = await server
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json({ error: 'rows array required' }, { status: 400 });
    }
    const rows = body.rows as Array<any>;

    const mapped = rows.map((r) => ({
      name: r.name ?? '',
      address: r.address ?? '',
      plz: r.plz ?? '',
      city: r.city ?? '',
      cluster: r.cluster ?? 'wien-noe-bgl',
      marktleiter_name: r.marktleiter ?? r.marktleiter_name ?? '',
      marktleiter_email: r.marktleiterEmail ?? r.email ?? '',
      status: r.status ?? 'active',
      opening_hours: r.openingHours ?? r.opening_hours ?? null,
    }));

    const svc = createSupabaseServiceClient();
    const existingKeys = new Set<string>();
    for (let offset = 0; ; offset += 1000) {
      const { data: existing, error } = await svc.from('markets').select('id,name,address,plz,city').order('id').range(offset, offset + 999);
      if (error) return NextResponse.json({ error: 'Bestehende Märkte konnten nicht geprüft werden.' }, { status: 503 });
      for (const market of existing || []) existingKeys.add(marketImportKey(market));
      if (!existing || existing.length < 1000) break;
    }
    // Reimporting an identical market retains its ID, notes and photo links.
    const newMarkets = mapped.filter(market => {
      const key = marketImportKey(market);
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    if (!newMarkets.length) return NextResponse.json({ inserted: 0, unchanged: mapped.length });
    const { data, error } = await svc.from('markets').insert(newMarkets).select('id');
    if (error) {
      console.error('Import markets error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ inserted: data?.length ?? 0, unchanged: mapped.length - newMarkets.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


