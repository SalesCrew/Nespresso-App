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

export function einsatzPhotoUrl(assignmentId: string, userId: string, field: string): string {
  return `/api/einsatz-photos?${new URLSearchParams({ assignment: assignmentId, user: userId, photo: field })}`;
}

// Keep a stable authenticated URL in the UI. Storage access is renewed only when
// an image is actually viewed, rather than signing every photo on every list load.
export function withEinsatzPhotoUrls<T extends Record<string, any>>(
  row: T,
  fields: readonly string[] = EINSATZ_PHOTO_URL_FIELDS
): T {
  const assignmentId = String(row.assignment_id || row.id || '');
  const userId = String(row.user_id || row.lead_user_id || '');
  const entries = fields.map((field) => {
    const value = row[field];
    if (!value) return [field, value] as const;
    return [field, einsatzPhotoUrl(assignmentId, userId, field.replace(/^tracking_/, ''))] as const;
  });
  return { ...row, ...Object.fromEntries(entries) };
}
