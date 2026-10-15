import type { SupabaseClient } from '@supabase/supabase-js';

export type PhotoBucket = 'einsatz-photos' | 'market-photos';
const signedUrls = new Map<string, { url: string; refreshAt: number }>();
const pending = new Map<string, Promise<string>>();
const CACHE_LIMIT = 512;

export class PhotoAccessError extends Error {
  constructor(public readonly status: number) {
    super(status === 404 ? 'Foto nicht gefunden.' : 'Das Foto konnte gerade nicht geladen werden. Bitte erneut versuchen.');
  }
}

export function validPhotoPath(path: string): boolean {
  return !!path && path.length <= 1024 && !path.startsWith('/') && !path.includes('\\')
    && !path.split('/').some(part => part === '.' || part === '..') && !/[\x00-\x1f]/.test(path);
}

// The caller must authorize the current viewer before accessing this cache.
export async function photoAccessUrl(service: SupabaseClient, bucket: PhotoBucket, path: string, refresh = false): Promise<string> {
  const key = `${bucket}/${path}`;
  const cached = signedUrls.get(key);
  if (!refresh && cached && cached.refreshAt > Date.now()) return cached.url;
  const inFlight = pending.get(key);
  if (inFlight) return inFlight;

  const request = (async () => {
    const { data, error } = await service.storage.from(bucket).createSignedUrl(path, 900);
    if (error || !data?.signedUrl) {
      const status = Number((error as any)?.statusCode || (error as any)?.status);
      throw new PhotoAccessError(status === 404 || (error?.message || '').toLowerCase().includes('not found') ? 404 : 503);
    }
    if (signedUrls.size >= CACHE_LIMIT) signedUrls.delete(signedUrls.keys().next().value!);
    signedUrls.set(key, { url: data.signedUrl, refreshAt: Date.now() + 10 * 60 * 1000 });
    return data.signedUrl;
  })();
  pending.set(key, request);
  try { return await request; }
  finally { pending.delete(key); }
}
