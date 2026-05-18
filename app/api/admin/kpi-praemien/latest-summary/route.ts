import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET(req: NextRequest) {
  try {
    const server = await createSupabaseServerClientAsync();
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

    const svc = createSupabaseServiceClient();

    // Latest KPI feedback timestamp
    const { data: latestFeedback } = await svc
      .from('kpi_feedback')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!latestFeedback?.created_at) {
      return NextResponse.json({ waveMonth: null, completion: 0, highlight: false });
    }

    const lastKpiAt = new Date(latestFeedback.created_at);
    const waveMonth = `${lastKpiAt.getFullYear()}-${String(lastKpiAt.getMonth() + 1).padStart(2, '0')}`;
    const waveStart = new Date(Date.UTC(lastKpiAt.getFullYear(), lastKpiAt.getMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(lastKpiAt.getFullYear(), lastKpiAt.getMonth() + 1, 1));

    // Count KPI feedback entries in that wave (distinct users)
    const { data: kpiRows } = await svc
      .from('kpi_feedback')
      .select('user_id, created_at')
      .gte('created_at', waveStart.toISOString())
      .lt('created_at', nextMonthStart.toISOString());
    const kpiUserCount = new Set((kpiRows || []).map((r: any) => r.user_id)).size;

    // Prämien stats for that month
    const { data: praemienRows } = await svc
      .from('kpi_praemien')
      .select('id, updated_at, created_at')
      .eq('wave_month', `${waveMonth}-01`);
    const praemienCount = praemienRows?.length || 0;
    const praemienLastAtStr = (praemienRows || [])
      .map((r: any) => r.updated_at || r.created_at)
      .filter(Boolean)
      .sort()
      .pop();
    const praemienLastAt = praemienLastAtStr ? new Date(praemienLastAtStr) : null;

    // Highlight if prämien are missing or not newer than the latest KPI submission
    const hasNewerPraemien = !!(praemienLastAt && praemienLastAt.getTime() > lastKpiAt.getTime());
    const countsOk = praemienCount >= kpiUserCount && kpiUserCount > 0;
    const highlight = !(hasNewerPraemien && countsOk);

    // Completion percentage relative to KPI users in the wave
    const completion = kpiUserCount > 0 ? Math.round((praemienCount / kpiUserCount) * 100) : 0;

    return NextResponse.json({ waveMonth, completion, highlight, kpiUserCount, praemienCount });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


