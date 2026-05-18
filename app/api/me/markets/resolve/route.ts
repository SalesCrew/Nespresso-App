import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { computeBestMarket, normalizeForMatch } from '@/lib/matchers/marketMatcher';

export async function POST(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const marketId = String(body.market_id || '').trim();
    const assignment = {
      id: 'resolve',
      location_text: String(body.location_text || '').trim(),
      postal_code: String(body.postal_code || '').trim(),
      city: String(body.city || '').trim(),
    };

    const svc = createSupabaseServiceClient();
    if (marketId) {
      const { data: m, error } = await svc
        .from('markets')
        .select('id, name, address, plz, city, cluster, marktleiter_name, marktleiter_phone, marktleiter_email, photos_exterior, photos_interior, photos_products, updated_at')
        .eq('id', marketId)
        .maybeSingle();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (!m) return NextResponse.json({ market: null });
      const projection = {
        id: (m as any).id,
        name: (m as any).name || '',
        address: (m as any).address || '',
        plz: (m as any).plz || '',
        city: (m as any).city || '',
        cluster: (m as any).cluster || '',
        marktleiter: (m as any).marktleiter_name || '',
        marktleiterPhone: (m as any).marktleiter_phone || '',
        marktleiterEmail: (m as any).marktleiter_email || '',
        photosExterior: (m as any).photos_exterior || [],
        photosInterior: (m as any).photos_interior || [],
        photosProducts: (m as any).photos_products || [],
        updated_at: (m as any).updated_at || null,
      };
      return NextResponse.json({ market: projection });
    }

    const { data: markets, error } = await svc
      .from('markets')
      .select('id, name, address, plz, city, cluster, marktleiter_name, marktleiter_phone, marktleiter_email, photos_exterior, photos_interior, photos_products, updated_at');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const list = Array.isArray(markets) ? markets : [];
    const { market } = computeBestMarket(assignment as any, list as any);
    if (!market) return NextResponse.json({ market: null });

    // Sanitize: exclude acceptance list and interior photos
    const projection = {
      id: market.id,
      name: (market as any).name || '',
      address: (market as any).address || '',
      plz: (market as any).plz || '',
      city: (market as any).city || '',
      cluster: (market as any).cluster || '',
      marktleiter: (market as any).marktleiter_name || '',
      marktleiterPhone: (market as any).marktleiter_phone || '',
      marktleiterEmail: (market as any).marktleiter_email || '',
      photosExterior: (market as any).photos_exterior || [],
      photosInterior: (market as any).photos_interior || [],
      photosProducts: (market as any).photos_products || [],
      updated_at: (market as any).updated_at || null,
    };
    return NextResponse.json({ market: projection });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


