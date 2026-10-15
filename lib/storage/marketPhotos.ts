import type { SupabaseClient } from '@supabase/supabase-js';

export const MARKET_PHOTO_FIELDS = ['photos_internal', 'photos_exterior', 'photos_interior', 'photos_products'] as const;
type MarketPhoto = { url: string; comment?: string; order?: number };

export function marketImportKey(row: Record<string, unknown>): string {
  return ['name', 'address', 'plz', 'city'].map(field => String(row[field] ?? '').trim().normalize('NFC').toLocaleLowerCase('de-AT')).join('\u0000');
}

// Removing photos has its own explicit DELETE action. Saving an old market form
// must never erase photos uploaded since that form was opened.
export function mergeMarketPhotos(current: MarketPhoto[], requested: MarketPhoto[]): MarketPhoto[] {
  const currentByUrl = new Map(current.map(photo => [photo.url, photo]));
  const seen = new Set<string>();
  const merged: MarketPhoto[] = [];
  for (const photo of requested) {
    const stored = currentByUrl.get(photo?.url);
    if (!stored || seen.has(photo.url)) continue;
    seen.add(photo.url);
    merged.push({ ...stored, comment: typeof photo.comment === 'string' ? photo.comment : stored.comment });
  }
  for (const photo of current) if (!seen.has(photo.url)) merged.push(photo);
  return merged.map((photo, order) => ({ ...photo, order }));
}

export async function updateMarketWithPhotos(service: SupabaseClient, id: string, changes: Record<string, unknown>,
  photoChanges: Partial<Record<typeof MARKET_PHOTO_FIELDS[number], MarketPhoto[]>>, append = false) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: current, error: readError } = await service.from('markets').select(MARKET_PHOTO_FIELDS.join(',')).eq('id', id).single();
    if (readError || !current) throw new Error('Markt konnte nicht geladen werden.');
    const update = { ...changes };
    for (const field of MARKET_PHOTO_FIELDS) if (photoChanges[field]) {
      const photos = (current as any)[field] || [];
      update[field] = append ? [...photos, ...photoChanges[field]!].map((photo, order) => ({ ...photo, order })) : mergeMarketPhotos(photos, photoChanges[field]!);
    }
    let query = service.from('markets').update(update).eq('id', id);
    for (const field of MARKET_PHOTO_FIELDS) if (photoChanges[field]) {
      query = (current as any)[field] === null ? query.is(field, null) : query.eq(field, JSON.stringify((current as any)[field]));
    }
    const { data, error } = await query.select().maybeSingle();
    if (error) throw new Error('Markt konnte nicht gespeichert werden.');
    if (data) return data;
  }
  throw new Error('Die Fotos wurden zwischenzeitlich geändert. Bitte erneut speichern.');
}
