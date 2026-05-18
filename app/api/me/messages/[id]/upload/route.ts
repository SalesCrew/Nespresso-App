import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    
    if (!auth.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await req.json().catch(() => ({}));
    const { files } = body || {};

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'files array is required' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();
    const uploadResults = [];

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const fileInfo = files[i];
      const { filename, size, type } = fileInfo;
      
      // Clean filename for storage
      const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      const path = `${auth.user.id}/${messageId}/${timestamp}_${cleanFilename}`;

      // Create signed upload URL for message-responses bucket
      console.log('Creating upload URL for path:', path);
      const { data: uploadData, error: uploadError } = await svc.storage
        .from('message-responses')
        .createSignedUploadUrl(path, 600); // 10 minutes

      if (uploadError) {
        console.error('Error creating upload URL for path:', path);
        console.error('Upload error details:', uploadError);
        return NextResponse.json({ 
          error: `Upload URL creation failed: ${uploadError.message}. Make sure 'message-responses' bucket exists.`,
          details: uploadError 
        }, { status: 500 });
      }

      uploadResults.push({
        filename: filename,
        path: path,
        uploadUrl: uploadData.signedUrl,
        token: uploadData.token
      });
    }

    return NextResponse.json({ 
      uploads: uploadResults,
      bucket: 'message-responses'
    });

  } catch (e: any) {
    console.error('Server error in message upload API:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

// Confirm upload completion and save to database
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    
    if (!auth.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { id: messageId } = await params;
    const body = await req.json().catch(() => ({}));
    const { uploadedFiles } = body || {};

    if (!Array.isArray(uploadedFiles) || uploadedFiles.length === 0) {
      return NextResponse.json({ error: 'uploadedFiles array is required' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Save file records to message_responses table
    const fileRecords = uploadedFiles.map(file => ({
      message_id: messageId,
      sender_user_id: auth.user.id,
      response_type: 'file',
      file_url: file.path,
      file_name: file.filename,
      file_size: file.size
    }));

    const { error: saveError } = await svc
      .from('message_responses')
      .insert(fileRecords);

    if (saveError) {
      console.error('Error saving file records:', saveError);
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, filesCount: uploadedFiles.length });

  } catch (e: any) {
    console.error('Server error in message upload confirm API:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
