import type { SupabaseClient } from '@supabase/supabase-js';
import { missingDeliverySchema } from './monthlyDelivery';

// Legacy rows were visible immediately. After migration, RLS and this filter hide drafts.
export async function publishedRows(client: SupabaseClient, table: 'kpi_praemien' | 'kpi_monthly_sales',
  options: { userId?: string; month?: string; limit?: number } = {}) {
  const query = (filter: boolean) => {
    let result = client.from(table).select('*');
    if (filter) result = result.not('sent_at', 'is', null);
    if (options.userId) result = result.eq('user_id', options.userId);
    if (options.month) result = result.eq('wave_month', options.month);
    result = result.order('wave_month', { ascending: false });
    if (options.limit) result = result.limit(options.limit);
    return result;
  };
  const result = await query(true);
  return missingDeliverySchema(result.error) ? query(false) : result;
}
