import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';
import { recomputeOnboarding } from '@/lib/onboarding/recompute';

export async function POST(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { user_id, path, file_path, file_name, mime_type, file_ext, is_active, contract_hours_per_week } = body || {};
  const normalizedPath = path || file_path;
  if (!user_id || !normalizedPath) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });

  const ext = (String(file_ext || '').replace(/[^a-z0-9]/gi, '').toLowerCase()) || normalizedPath.split('.').pop()?.toLowerCase();
  if (!ext || !['pdf', 'doc', 'docx'].includes(ext)) {
    return NextResponse.json({ error: 'invalid file type' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();
  const makeActive = is_active !== false;

  const insertPayload = {
    user_id,
    file_path: normalizedPath,
    file_name: file_name || normalizedPath.split('/').pop() || `contract.${ext}`,
    mime_type: mime_type || (
      ext === 'docx'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'doc'
          ? 'application/msword'
          : 'application/pdf'
    ),
    file_ext: ext,
    is_active: false,
    uploaded_by: auth.user.id,
  };

  const insertRes = await svc
    .from('dienstvertrag_files')
    .insert(insertPayload)
    .select('*')
    .maybeSingle();
  if (insertRes.error) return NextResponse.json({ error: insertRes.error.message }, { status: 500 });

  if (makeActive) {
    const { error: activateErr } = await svc.rpc('activate_dienstvertrag_file', {
      p_user_id: user_id,
      p_file_id: insertRes.data?.id,
    });
    if (activateErr) {
      await svc.from('dienstvertrag_files').delete().eq('id', insertRes.data?.id);
      try {
        await svc.storage.from('dienstvertraege').remove([normalizedPath]);
      } catch {}
      return NextResponse.json({ error: activateErr.message }, { status: 500 });
    }
  }

  if (contract_hours_per_week !== undefined && contract_hours_per_week !== null && String(contract_hours_per_week) !== '') {
    const parsedHours = Number(contract_hours_per_week);
    if (Number.isFinite(parsedHours)) {
      await svc
        .from('promotor_profiles')
        .update({ contract_hours_per_week: parsedHours, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);
    }
  }

  const { data: finalContract } = await svc
    .from('dienstvertrag_files')
    .select('*')
    .eq('id', insertRes.data?.id)
    .maybeSingle();

  try { await recomputeOnboarding(svc as any, user_id); } catch {}
  return NextResponse.json({ contract: finalContract || insertRes.data });
}

export async function PATCH(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { id, is_active, contract_hours_per_week } = body || {};
  if (!id || typeof is_active !== 'boolean') return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const svc = createSupabaseServiceClient();

  // Fetch target row
  const { data: target, error: fetchErr } = await svc
    .from('dienstvertrag_files')
    .select('id, user_id, file_path')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!target) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (is_active) {
    const { error: activateErr } = await svc.rpc('activate_dienstvertrag_file', {
      p_user_id: target.user_id as string,
      p_file_id: id,
    });
    if (activateErr) return NextResponse.json({ error: activateErr.message }, { status: 500 });
  } else {
    const { error: deactivateErr } = await svc
      .from('dienstvertrag_files')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (deactivateErr) return NextResponse.json({ error: deactivateErr.message }, { status: 500 });
  }

  if (contract_hours_per_week !== undefined && contract_hours_per_week !== null && String(contract_hours_per_week) !== '') {
    const parsedHours = Number(contract_hours_per_week);
    if (Number.isFinite(parsedHours)) {
      await svc
        .from('promotor_profiles')
        .update({ contract_hours_per_week: parsedHours, updated_at: new Date().toISOString() })
        .eq('user_id', target.user_id as string);
    }
  }

  try { await recomputeOnboarding(svc as any, target.user_id); } catch {}
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({} as any));
  const { id } = body || {};
  if (!id) return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  const svc = createSupabaseServiceClient();
  const { data: deleted, error } = await svc
    .from('dienstvertrag_files')
    .delete()
    .eq('id', id)
    .select('user_id, file_path')
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (deleted?.file_path) {
    try {
      await svc.storage.from('dienstvertraege').remove([deleted.file_path]);
    } catch {}
  }

  try { await recomputeOnboarding(svc as any, deleted?.user_id); } catch {}
  return NextResponse.json({ ok: true });
}


