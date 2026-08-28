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
    const { conversationId, userIds } = body;

    if (!conversationId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'Missing conversationId or userIds' }, { status: 400 });
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
      return NextResponse.json({ error: 'Can only add participants to group chats' }, { status: 400 });
    }

    // Check if requester is admin
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', auth.user.id)
      .single();

    const isAdmin = ['admin_staff', 'admin_of_admins'].includes(userProfile?.role || '');

    if (!isAdmin) {
      return NextResponse.json({ error: 'Only admins can add participants' }, { status: 403 });
    }

    // Fetch the names of added users first
    const { data: addedUsers } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    // Add participants
    const participants = userIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (insertError) {
      console.error('Error adding participants:', insertError);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    // Create system message for added users
    const addedNames = addedUsers?.map(u => u.display_name).join(', ') || 'Unknown';
    const messageText = addedUsers && addedUsers.length === 1
      ? `${addedNames} wurde zur Gruppe hinzugefügt`
      : `${addedNames} wurden zur Gruppe hinzugefügt`;

    const { error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: auth.user.id,
        message_text: messageText,
        message_type: 'system',
      });

    if (messageError) {
      console.error('Error creating system message:', messageError);
      // Continue even if message creation fails
    }

    return NextResponse.json({
      success: true,
      addedUsers: addedUsers || []
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

