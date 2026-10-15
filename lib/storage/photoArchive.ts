import type { SupabaseClient } from '@supabase/supabase-js';
import { EINSATZ_PHOTO_URL_FIELDS, extractEinsatzPhotoPath } from './einsatzPhotos';
import type { PhotoBucket } from './photoAccess';

export type ArchivePhoto = {
  id: string;
  url: string;
  title: string;
  createdAt: string;
  linked: boolean;
};

type StoredPhoto = { id: string; path: string; createdAt: string };
const listings = new Map<PhotoBucket, { expiresAt: number; photos: StoredPhoto[] }>();
const pending = new Map<PhotoBucket, Promise<StoredPhoto[]>>();

async function listPhotos(service: SupabaseClient, bucket: PhotoBucket, refresh: boolean): Promise<StoredPhoto[]> {
  const cached = listings.get(bucket);
  if (!refresh && cached && cached.expiresAt > Date.now()) return cached.photos;
  const running = pending.get(bucket);
  if (running) return running;
  const request = (async () => {
    const folders = [''];
    const photos: StoredPhoto[] = [];
    while (folders.length) {
      const batch = folders.splice(0, 4);
      await Promise.all(batch.map(async folder => {
        for (let offset = 0; ; offset += 1000) {
          const { data, error } = await service.storage.from(bucket).list(folder, {
            limit: 1000, offset, sortBy: { column: 'name', order: 'asc' },
          });
          if (error) throw new Error('Das Fotoarchiv konnte gerade nicht geladen werden.');
          for (const item of data || []) {
            const path = [folder, item.name].filter(Boolean).join('/');
            if (!item.id && !item.metadata) folders.push(path);
            else photos.push({ id: item.id, path, createdAt: item.created_at || '' });
          }
          if (!data || data.length < 1000) break;
        }
      }));
    }
    photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.path.localeCompare(b.path));
    listings.set(bucket, { photos, expiresAt: Date.now() + 5 * 60 * 1000 });
    return photos;
  })();
  pending.set(bucket, request);
  try { return await request; }
  finally { pending.delete(bucket); }
}

export async function photoArchive(service: SupabaseClient, bucket: PhotoBucket, refresh = false): Promise<ArchivePhoto[]> {
  const objects = await listPhotos(service, bucket, refresh);
  const references = new Set<string>();
  if (bucket === 'einsatz-photos') {
    // Page through all tracking records; the archive also covers older visits.
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await service.from('assignment_tracking')
        .select('foto_maschine_url,foto_kapsellade_url,foto_pos_gesamt_url,foto_extra_url').order('id').range(offset, offset + 999);
      if (error) throw new Error('Die Foto-Zuordnungen konnten nicht geladen werden.');
      for (const row of data || []) for (const field of EINSATZ_PHOTO_URL_FIELDS) {
        const path = extractEinsatzPhotoPath((row as Record<string, unknown>)[field]);
        if (path) references.add(path);
      }
      if (!data || data.length < 1000) break;
    }
  } else {
    const { data, error } = await service.from('markets').select('photos_internal,photos_exterior,photos_interior,photos_products');
    if (error) throw new Error('Die Foto-Zuordnungen konnten nicht geladen werden.');
    for (const row of data || []) for (const value of Object.values(row)) {
      if (!Array.isArray(value)) continue;
      for (const photo of value) {
        if (typeof photo?.url !== 'string') continue;
        const marker = '/storage/v1/object/public/market-photos/';
        if (photo.url.includes(marker)) references.add(decodeURIComponent(photo.url.split(marker)[1].split('?')[0]));
      }
    }
  }
  return objects.map(photo => ({
    id: photo.id,
    url: `/api/einsatz-photos?${new URLSearchParams({ bucket, archive: photo.path })}`,
    createdAt: photo.createdAt,
    linked: references.has(photo.path),
    title: photo.path.includes('foto_maschine') ? 'Foto Maschine'
      : photo.path.includes('foto_kapsellade') ? 'Foto Kapsellade'
      : photo.path.includes('foto_pos_gesamt') ? 'Foto POS gesamt'
      : photo.path.includes('/exterior/') ? 'Außenansicht'
      : photo.path.includes('/interior/') ? 'Innenansicht'
      : photo.path.includes('/products/') ? 'Produkte'
      : photo.path.includes('/internal/') ? 'Internes Marktfoto' : 'Weiteres Foto',
  }));
}
