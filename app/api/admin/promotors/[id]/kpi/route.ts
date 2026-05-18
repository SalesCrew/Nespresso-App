import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view other users
    const svc = createSupabaseServiceClient();
    const { data: profile } = await svc
      .from('user_profiles')
      .select('role')
      .eq('user_id', auth.user.id)
      .single();
    if (!profile || !['admin_of_admins', 'admin_staff'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const { data: feedback } = await svc
      .from('kpi_feedback')
      .select('mc_et, tma, vl_value')
      .eq('user_id', userId);

    if (!feedback || feedback.length === 0) {
      return NextResponse.json({ mcet: 0, tma: 0, vlshare: 0 });
    }

    const mcet = feedback.reduce((sum: number, r: any) => sum + Number(r.mc_et || 0), 0) / feedback.length;
    const tma = feedback.reduce((sum: number, r: any) => sum + Number(r.tma || 0), 0) / feedback.length;
    const vlshare = feedback.reduce((sum: number, r: any) => sum + Number(r.vl_value || 0), 0) / feedback.length;

    return NextResponse.json({
      mcet: Number.isFinite(mcet) ? Number(mcet.toFixed(1)) : 0,
      tma: Number.isFinite(tma) ? Math.round(tma) : 0,
      vlshare: Number.isFinite(vlshare) ? Math.round(vlshare) : 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


