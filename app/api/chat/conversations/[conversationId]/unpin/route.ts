import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// POST: Unpin a conversation
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = params;

    // Verify user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this conversation' }, { status: 403 });
    }

    // Unpin the conversation
    const service = createSupabaseServiceClient();
    const { error: updateError } = await service
      .from('chat_conversations')
      .update({
        is_pinned: false,
        pinned_at: null,
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error unpinning conversation:', updateError);
      return NextResponse.json({ error: 'Failed to unpin conversation' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pinned: false });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations/[conversationId]/unpin:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

