const CHAT_ATTACHMENT_MARKERS = [
  '/storage/v1/object/sign/chat-attachments/',
  '/storage/v1/object/public/chat-attachments/',
  '/storage/v1/object/authenticated/chat-attachments/',
];

export function chatAttachmentProxyUrl(reference: unknown): string | null {
  if (typeof reference !== 'string' || !reference.trim()) return null;
  const value = reference.trim();
  if (value.startsWith('/api/chat/attachments?path=')) return value;

  let path = value;
  for (const marker of CHAT_ATTACHMENT_MARKERS) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      path = value.slice(markerIndex + marker.length).split('?')[0];
      break;
    }
  }
  if (/^https?:\/\//i.test(path)) return null;

  try {
    path = decodeURIComponent(path).replace(/^\/+/, '');
  } catch {
    return null;
  }
  if (!path || path.includes('..') || path.includes('\\')) return null;
  return `/api/chat/attachments?path=${encodeURIComponent(path)}`;
}
