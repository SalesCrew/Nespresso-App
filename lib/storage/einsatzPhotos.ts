import type { SupabaseClient } from "@supabase/supabase-js";

export const EINSATZ_PHOTO_BUCKET = "einsatz-photos";
export const EINSATZ_PHOTO_URL_FIELDS = [
  "foto_maschine_url",
  "foto_kapsellade_url",
  "foto_pos_gesamt_url",
  "foto_extra_url",
] as const;

const LEGACY_MARKERS = [
  `/storage/v1/object/public/${EINSATZ_PHOTO_BUCKET}/`,
  `/storage/v1/object/sign/${EINSATZ_PHOTO_BUCKET}/`,
];

export function extractEinsatzPhotoPath(reference: unknown): string | null {
  if (typeof reference !== "string" || !reference.trim()) return null;
  let path = reference.trim();
  for (const marker of LEGACY_MARKERS) {
    const index = path.indexOf(marker);
    if (index >= 0) {
      path = path.slice(index + marker.length).split("?")[0];
      break;
    }
  }

  if (/^https?:\/\//i.test(path)) return null;
  try {
    path = decodeURIComponent(path);
  } catch {
    return null;
  }
  path = path.replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\")) return null;
  return path;
}

export async function createEinsatzPhotoSignedUrl(
  service: SupabaseClient,
  reference: unknown,
  expiresInSeconds = 900
): Promise<string | null> {
  const path = extractEinsatzPhotoPath(reference);
  if (!path) return null;
  const { data, error } = await service.storage
    .from(EINSATZ_PHOTO_BUCKET)
    .createSignedUrl(path, expiresInSeconds);
  return error ? null : data?.signedUrl || null;
}

export async function signEinsatzPhotoFields<T extends Record<string, any>>(
  service: SupabaseClient,
  row: T,
  fields: readonly string[] = EINSATZ_PHOTO_URL_FIELDS
): Promise<T> {
  const signedEntries = await Promise.all(fields.map(async (field) => {
    const value = row[field];
    if (!value) return [field, value] as const;
    const signedUrl = await createEinsatzPhotoSignedUrl(service, value);
    return [field, signedUrl] as const;
  }));
  return { ...row, ...Object.fromEntries(signedEntries) };
}
