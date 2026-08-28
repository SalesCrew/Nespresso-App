import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(request: NextRequest) {
  try {
    const server = createSupabaseServerClient();
    const { data: auth } = await server.auth.getUser();

    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, userId } = body;

    if (!conversationId || !userId) {
      return NextResponse.json({ error: 'Missing conversationId or userId' }, { status: 400 });
    }

    const supabase = createSupabaseServiceClient();

    // Verify conversation exists and requester is admin or participant
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, type')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    if (conversation.type !== 'group') {
      return NextResponse.json({ error: 'Can only remove participants from group chats' }, { status: 400 });
    }

    // Check if requester is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', auth.user.id)
      .single();

    const isAdmin = ['admin_staff', 'admin_of_admins'].includes(userProfile?.role || '');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can remove participants' }, { status: 403 });
    }

    // Get user info before removing
    const { data: removedUser } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .eq('user_id', userId)
      .single();

    const userName = removedUser?.display_name || 'Unknown';

    // Create system message BEFORE removing participant so they can see it
    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: auth.user.id,
        message_text: `${userName} wurde aus der Gruppe entfernt`,
        message_type: 'system',
      });

    if (messageError) {
      console.error('Error creating system message:', messageError);
      // Continue even if message creation fails
    }

    // Remove participant
    const { error: deleteError } = await supabase
      .from('chat_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error removing participant:', deleteError);
      return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      removedUser: removedUser || { user_id: userId, display_name: 'Unknown' }
    });
  } catch (error) {
    console.error('Error in POST /api/chat/participants/remove:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

