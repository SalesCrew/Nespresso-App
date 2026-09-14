import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest) {
  try {
    const server = createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await server
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin_staff', 'admin_of_admins'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const waveMonth: string = body.waveMonth;
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

    if (!waveMonth || !/^\d{4}-\d{2}$/.test(waveMonth)) {
      return NextResponse.json({ error: 'Invalid waveMonth (YYYY-MM)' }, { status: 400 });
    }
    if (!rows.length) {
      return NextResponse.json({ error: 'No rows' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Resolve emails to user_ids in one shot
    const emails = rows.map(r => (r.email || '').toString().trim()).filter(Boolean);
    const { data: profiles } = await svc
      .from('user_profiles')
      .select('user_id, email, display_name')
      .in('email', emails)
      .eq('deleted', false);
    const emailToUser = new Map((profiles || []).map(p => [String(p.email).toLowerCase(), p.user_id]));

    // Prepare name list for fuzzy matching (all promotors)
    const { data: allPromotors } = await svc
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('role', 'promotor')
      .eq('deleted', false);

    const normalize = (str: string) => (str || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const levenshtein = (a: string, b: string): number => {
      const matrix: number[][] = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
            ? matrix[i - 1][j - 1]
            : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
        }
      }
      return matrix[b.length][a.length];
    };
    const fuzzyFindByName = (name: string): string | null => {
      const inputNorm = normalize(name);
      if (!inputNorm) return null;
      let best: { user_id: string; score: number } | null = null;
      for (const p of allPromotors || []) {
        const dbNorm = normalize(p.display_name || '');
        if (!dbNorm) continue;
        if (dbNorm === inputNorm) return p.user_id;
        // Try reversed two-part names
        const parts = inputNorm.split(' ');
        const dbParts = dbNorm.split(' ');
        if (parts.length === 2 && dbParts.length === 2) {
          const rev = `${parts[1]} ${parts[0]}`;
          if (rev === dbNorm) return p.user_id;
        }
        const dist = levenshtein(inputNorm, dbNorm);
        const maxLen = Math.max(inputNorm.length, dbNorm.length);
        const similarity = 1 - (dist / maxLen);
        if (similarity > 0.85 && (!best || similarity > best.score)) {
          best = { user_id: p.user_id, score: similarity };
        }
      }
      return best?.user_id || null;
    };

    const matched: any[] = [];
    const unmatched: any[] = [];

    for (const r of rows) {
      const email = (r.email || '').toString().trim().toLowerCase();
      let user_id = r.user_id || emailToUser.get(email);
      if (!user_id && r.name) {
        user_id = fuzzyFindByName(String(r.name || ''));
      }
      if (!user_id) {
        unmatched.push({
          name: r.name || null,
          email: r.email || null,
          gutscheine: r.gutscheine ?? 0,
          tma: r.tma ?? 0,
          vertuo: r.vertuo ?? 0,
          vertuo_pop: r.vertuo_pop ?? 0,
          aeroccino: r.aeroccino ?? 0,
          vorteilsbox: r.vorteilsbox ?? 0,
        });
        continue;
      }
      const toInt = (v: any) => Number.isFinite(Number(v)) ? parseInt(String(v), 10) : 0;
      matched.push({
        user_id,
        wave_month: `${waveMonth}-01`,
        gutscheine: toInt(r.gutscheine ?? r.Gutscheine),
        tma: toInt(r.tma ?? r.TMA),
        vertuo: toInt(r.vertuo ?? r.Vertuo),
        vertuo_pop: toInt(r.vertuo_pop ?? r['Vertuo Pop+'] ?? r.vertuo_pop_plus),
        aeroccino: toInt(r.aeroccino ?? r.Aeroccino),
        vorteilsbox: toInt(r.vorteilsbox ?? r.Vorteilsbox),
      });
    }

    if (!matched.length && !unmatched.length) {
      return NextResponse.json({ error: 'No valid rows' }, { status: 400 });
    }

    const { data, error } = await svc
      .from('kpi_praemien')
      .upsert(matched, { onConflict: 'user_id,wave_month' })
      .select('id');
    if (error) {
      return NextResponse.json({ error: 'Failed to import', details: error }, { status: 500 });
    }

    return NextResponse.json({ success: true, imported: data?.length || 0, unmatched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


