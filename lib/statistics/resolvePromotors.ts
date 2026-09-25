import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { normalizeName } from '@/lib/statistics/monthlyKpi';

export type ImportIdentity = {
  name: string;
  email?: string;
  user_id?: string;
  sourceRow?: number;
};

export async function resolvePromotors<T extends ImportIdentity>(rows: T[]) {
  const svc = createSupabaseServiceClient();
  const { data: profiles, error: profileError } = await svc
    .from('user_profiles')
    .select('user_id, display_name')
    .eq('role', 'promotor')
    .eq('deleted', false);
  if (profileError) throw new Error('Promotoren konnten nicht geladen werden.');
  const { data: authUsers, error: authError } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) throw new Error('Login-Adressen konnten nicht geladen werden.');

  const profileById = new Map((profiles || []).map(profile => [profile.user_id, profile]));
  const nameIds = new Map<string, string[]>();
  for (const profile of profiles || []) {
    const name = normalizeName(profile.display_name);
    if (name) nameIds.set(name, [...(nameIds.get(name) || []), profile.user_id]);
  }
  const emailIds = new Map<string, string[]>();
  for (const authUser of authUsers?.users || []) {
    if (!profileById.has(authUser.id) || !authUser.email) continue;
    const email = authUser.email.trim().toLowerCase();
    emailIds.set(email, [...(emailIds.get(email) || []), authUser.id]);
  }

  const used = new Set<string>();
  const matched: Array<T & { user_id: string }> = [];
  const unmatched: Array<T & { reason: string }> = [];
  for (const row of rows) {
    const explicitId = typeof row.user_id === 'string' ? row.user_id.trim() : '';
    const email = String(row.email || '').trim().toLowerCase();
    const name = normalizeName(row.name);
    const candidates = explicitId
      ? (profileById.has(explicitId) ? [explicitId] : [])
      : email && emailIds.has(email) ? emailIds.get(email) || [] : nameIds.get(name) || [];
    if (candidates.length !== 1) {
      unmatched.push({ ...row, reason: candidates.length > 1 ? 'Name nicht eindeutig' : 'Kein Promotor gefunden' });
      continue;
    }
    const userId = candidates[0];
    if (used.has(userId)) {
      unmatched.push({ ...row, reason: 'Promotor kommt mehrfach in der Datei vor' });
      continue;
    }
    used.add(userId);
    matched.push({ ...row, user_id: userId });
  }
  return { matched, unmatched, promotors: (profiles || []).map(profile => ({ user_id: profile.user_id, name: profile.display_name || '' })) };
}
