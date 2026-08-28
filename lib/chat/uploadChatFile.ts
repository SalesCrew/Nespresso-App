import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export async function uploadChatFile(
  file: File | Blob,
  conversationId: string,
  userId: string,
  fileType: 'photo' | 'pdf'
): Promise<{ url: string; fileName: string } | null> {
  try {
    const allowedTypes = fileType === 'photo'
      ? new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      : new Set(['application/pdf']);
    if (!file.size || file.size > 10 * 1024 * 1024 || !allowedTypes.has(file.type.toLowerCase())) {
      return null;
    }

    const supabase = createSupabaseBrowserClient();
    
    // Generate unique filename
    const timestamp = Date.now();
    const extension = file instanceof File ? file.name.split('.').pop() : (fileType === 'photo' ? 'jpg' : 'pdf');
    const fileName = file instanceof File ? file.name : `${fileType}-${timestamp}.${extension}`;
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const uniqueFileName = `${timestamp}-${crypto.randomUUID()}-${safeFileName}`;
    
    // Storage path: {userId}/{conversationId}/{uniqueFileName}
    const filePath = `${userId}/${conversationId}/${uniqueFileName}`;
    
    
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('[uploadChatFile] Upload error:', uploadError);
      return null;
    }
    return {
      url: `/api/chat/attachments?path=${encodeURIComponent(filePath)}`,
      fileName: fileName,
    };
  } catch (error) {
    console.error('[uploadChatFile] Unexpected error:', error);
    return null;
  }
}

// Helper to convert data URL (from image editor) to Blob
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

