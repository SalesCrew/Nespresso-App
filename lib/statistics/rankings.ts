export type RankMetric = 'mcet' | 'tma' | 'vlshare';
export type RankingEntry = {
  user_id: string; mcet: number; tma: number; vlshare: number; isCurrentUser: boolean;
  name?: string;
};
type Row = Record<string, any>;

// One observation per employee/reporting month. Monthly sales supersede legacy feedback.
export function buildLeaderboard(sales: Row[], feedback: Row[], profiles: Row[],
  options: { userId: string; admin: boolean; month?: string; timeframe?: string }) {
  const people = new Map(profiles.filter(row => row.role === 'promotor' && !row.deleted).map(row => [row.user_id, row]));
  const observations = new Map<string, RankingEntry & { month: string }>();
  const salesKeys = new Set(sales.map(row => `${row.user_id}:${String(row.wave_month).slice(0, 7)}`));
  const add = (row: Row, month: string, mcet: number, tma: number, vlshare: number) => {
    if (!people.has(row.user_id) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
      ![mcet, tma, vlshare].every(value => Number.isFinite(value) && value >= 0)) return;
    observations.set(`${row.user_id}:${month}`, { user_id: row.user_id, month, mcet, tma, vlshare,
      isCurrentUser: row.user_id === options.userId });
  };
  [...feedback].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))).forEach(row => {
    const month = String(row.wave_month || ('wave_month' in row ? '' : row.created_at) || '').slice(0, 7);
    if (!salesKeys.has(`${row.user_id}:${month}`)) add(row, month, Number(row.mc_et), Number(row.tma), Number(row.vl_value));
  });
  sales.forEach(row => {
    if (!options.admin && 'sent_at' in row && !row.sent_at) return;
    const et = Number(row.einsatztage), mc = Number(row.mc);
    if (et <= 0 || !Number.isFinite(et) || !Number.isFinite(mc) || mc < 0) return;
    add(row, String(row.wave_month).slice(0, 7), mc / et,
      mc ? Number(row.tma) / mc * 100 : 0, mc ? Number(row.vl) / mc * 100 : 0);
  });
  const months = [...new Set([...observations.values()].map(row => row.month))].sort().reverse();
  const selected = options.month ? [options.month] : options.timeframe === '6months' ? months.slice(0, 6)
    : options.timeframe === 'alltime' ? months : months.slice(0, 1);
  const grouped = new Map<string, Array<RankingEntry & { month: string }>>();
  observations.forEach(row => {
    if (selected.includes(row.month)) grouped.set(row.user_id, [...(grouped.get(row.user_id) || []), row]);
  });
  const leaderboard: RankingEntry[] = [...grouped].map(([userId, rows]) => ({
    user_id: userId, isCurrentUser: userId === options.userId,
    mcet: rows.reduce((sum, row) => sum + row.mcet, 0) / rows.length,
    tma: rows.reduce((sum, row) => sum + row.tma, 0) / rows.length,
    vlshare: rows.reduce((sum, row) => sum + row.vlshare, 0) / rows.length,
    ...(options.admin ? { name: people.get(userId)?.display_name || 'Promotor' } : {}),
  }));
  return { leaderboard, currentUserData: leaderboard.find(row => row.isCurrentUser) || null, waveMonth: selected[0] || null };
}

export function rankLeaderboard<T extends RankingEntry>(entries: T[], metric: RankMetric) {
  const sorted = [...entries].sort((a, b) => b[metric] - a[metric] || a.user_id.localeCompare(b.user_id));
  let rank = 0;
  return sorted.map((entry, index) => {
    if (index === 0 || entry[metric] !== sorted[index - 1][metric]) rank = index + 1;
    return { ...entry, rank };
  });
}
