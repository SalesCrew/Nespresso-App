import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body; // 'read' or 'acknowledge'

    if (!action || !['read', 'acknowledge'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { id: messageId } = await params;
    const svc = createSupabaseServiceClient();

    const updates: Record<string, any> = {};
    const now = new Date().toISOString();

    if (action === 'read') {
      updates.read_at = now;
    } else if (action === 'acknowledge') {
      updates.acknowledged_at = now;
      // When acknowledging, also mark as read if not already
      updates.read_at = now;
    }

    // Update the message recipient record
    const { error } = await svc
      .from('message_recipients')
      .update(updates)
      .eq('message_id', messageId)
      .eq('recipient_user_id', user.id);

    if (error) {
      console.error('Error updating message status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (e: any) {
    console.error('Server error in message update API:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
