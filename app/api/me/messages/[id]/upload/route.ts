import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

const MAX_REQUEST_BYTES = 100_000;
const MAX_FILES = 10;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'tiff',
  'webp',
]);

type UploadFileInput = {
  filename: string;
  size: number;
};

function hasAcceptableContentLength(request: NextRequest): boolean {
  const contentLength = Number(request.headers.get('content-length') || 0);
  return Number.isFinite(contentLength) && contentLength <= MAX_REQUEST_BYTES;
}

function cleanFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9.-]/g, '_').slice(0, 180);
}

function parseFiles(value: unknown): UploadFileInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_FILES) return null;

  const result: UploadFileInput[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null;
    const candidate = entry as Record<string, unknown>;
    const filename = typeof candidate.filename === 'string' ? candidate.filename.trim() : '';
    const size = Number(candidate.size);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    if (
      !filename
      || filename.length > 255
      || !ALLOWED_EXTENSIONS.has(extension)
      || !Number.isInteger(size)
      || size <= 0
      || size > MAX_FILE_BYTES
    ) {
      return null;
    }
    result.push({ filename, size });
  }
  return result;
}

async function canRespondToMessage(
  service: ReturnType<typeof createSupabaseServiceClient>,
  messageId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await service
    .from('message_recipients')
    .select('message_id')
    .eq('message_id', messageId)
    .eq('recipient_user_id', userId)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasAcceptableContentLength(req)) {
      return NextResponse.json({ error: 'request too large' }, { status: 413 });
    }

    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const service = createSupabaseServiceClient();
    if (!(await canRespondToMessage(service, messageId, auth.user.id))) {
      return NextResponse.json({ error: 'message not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const files = parseFiles(body?.files);
    if (!files) {
      return NextResponse.json({ error: 'invalid files' }, { status: 400 });
    }

    const uploadResults = [];
    for (const file of files) {
      const cleanFilename = cleanFileName(file.filename);
      const path = `${auth.user.id}/${messageId}/${randomUUID()}_${cleanFilename}`;
      const { data: uploadData, error: uploadError } = await service.storage
        .from('message-responses')
        .createSignedUploadUrl(path, { upsert: false });

      if (uploadError) {
        console.error('Error creating message response upload URL:', uploadError);
        return NextResponse.json({ error: 'upload preparation failed' }, { status: 500 });
      }

      uploadResults.push({
        filename: file.filename,
        path,
        uploadUrl: uploadData.signedUrl,
        token: uploadData.token,
      });
    }

    return NextResponse.json({ uploads: uploadResults, bucket: 'message-responses' });
  } catch (error) {
    console.error('Server error in message upload API:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasAcceptableContentLength(req)) {
      return NextResponse.json({ error: 'request too large' }, { status: 413 });
    }

    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const service = createSupabaseServiceClient();
    if (!(await canRespondToMessage(service, messageId, auth.user.id))) {
      return NextResponse.json({ error: 'message not found' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const uploadedFiles = parseFiles(body?.uploadedFiles);
    if (!uploadedFiles) {
      return NextResponse.json({ error: 'invalid uploaded files' }, { status: 400 });
    }

    const rawFiles = body.uploadedFiles as Array<Record<string, unknown>>;
    const prefix = `${auth.user.id}/${messageId}/`;
    const fileRecords = [];
    for (let index = 0; index < rawFiles.length; index += 1) {
      const rawPath = rawFiles[index].path;
      const path = typeof rawPath === 'string' ? rawPath : '';
      if (!path.startsWith(prefix) || path.includes('..')) {
        return NextResponse.json({ error: 'invalid upload path' }, { status: 400 });
      }

      const objectName = path.slice(prefix.length);
      if (!objectName || objectName.includes('/')) {
        return NextResponse.json({ error: 'invalid upload path' }, { status: 400 });
      }

      const { data: objects, error: listError } = await service.storage
        .from('message-responses')
        .list(prefix.slice(0, -1), { limit: 1, search: objectName });
      const object = objects?.find((entry) => entry.name === objectName);
      const storedSize = Number(object?.metadata?.size || 0);
      if (listError || !object || !storedSize || storedSize > MAX_FILE_BYTES) {
        return NextResponse.json({ error: 'uploaded file could not be verified' }, { status: 400 });
      }

      fileRecords.push({
        message_id: messageId,
        sender_user_id: auth.user.id,
        response_type: 'file',
        file_url: path,
        file_name: uploadedFiles[index].filename,
        file_size: storedSize,
      });
    }

    const { error: saveError } = await service.from('message_responses').insert(fileRecords);
    if (saveError) {
      console.error('Error saving message response file records:', saveError);
      return NextResponse.json({ error: 'upload confirmation failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, filesCount: fileRecords.length });
  } catch (error) {
    console.error('Server error in message upload confirmation API:', error);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
