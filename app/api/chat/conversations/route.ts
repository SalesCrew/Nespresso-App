import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

// GET: Fetch user's conversations with participants, last message, and unread count
export async function GET(request: NextRequest) {
  try {
    console.log('[/api/chat/conversations] Starting request');
    const supabase = await createSupabaseServerClientAsync();
    console.log('[/api/chat/conversations] Supabase client created');
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[/api/chat/conversations] User:', user?.id, 'Auth error:', authError);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user's role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const userRole = userProfile?.role || 'promotor';
    const isAdmin = ['admin_staff', 'admin_of_admins'].includes(userRole);

    // Fetch conversations where user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (participantError) {
      console.error('Error fetching participants:', participantError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    const conversationIds = participantData?.map(p => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    // Fetch conversation details (including pin data)
    const { data: conversations, error: conversationsError } = await supabase
      .from('chat_conversations')
      .select('id, type, name, description, is_read_only, created_by, created_at, updated_at, profile_picture_url, is_pinned, pinned_at')
      .in('id', conversationIds)
      .order('is_pinned', { ascending: false })
      .order('pinned_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
      return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
    }

    // Fetch participants for all conversations (including marked_unread status and cleared_at)
    const { data: allParticipants, error: allParticipantsError } = await supabase
      .from('chat_participants')
      .select('conversation_id, user_id, last_read_at, marked_unread, marked_unread_at, cleared_at')
      .in('conversation_id', conversationIds);

    if (allParticipantsError) {
      console.error('Error fetching all participants:', allParticipantsError);
    }

    // Fetch user profiles for all participants (use service client to bypass RLS)
    const participantUserIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
    const svc = createSupabaseServiceClient();
    const { data: userProfiles, error: profilesError } = await svc
      .from('user_profiles')
      .select('user_id, display_name, role')
      .in('user_id', participantUserIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
    }

    // Fetch profile pictures from promotor_profiles for promotor users
    const promotorUserIds = userProfiles?.filter(p => p.role === 'promotor').map(p => p.user_id) || [];
    const { data: promotorProfiles } = promotorUserIds.length > 0
      ? await svc
          .from('promotor_profiles')
          .select('user_id, profile_picture_url')
          .in('user_id', promotorUserIds)
      : { data: [] };

    // Create a map of user_id to profile_picture_url
    const profilePictureMap = new Map(
      (promotorProfiles || []).map((p: any) => [p.user_id, p.profile_picture_url])
    );

    // Fetch last message for each conversation
    const { data: lastMessages, error: lastMessagesError } = await supabase
      .from('chat_messages')
      .select('conversation_id, message_text, message_type, created_at, sender_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    if (lastMessagesError) {
      console.error('Error fetching last messages:', lastMessagesError);
    }

    // Get unread counts for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations?.map(async (conv) => {
        // Get participants for this conversation
        const convParticipants = allParticipants?.filter(p => p.conversation_id === conv.id) || [];
        
        // Get participant details with profiles
        const participantDetails = convParticipants.map(p => {
          const profile = userProfiles?.find(up => up.user_id === p.user_id);
          const profilePicture = profilePictureMap.get(p.user_id);
          return {
            user_id: p.user_id,
            display_name: profile?.display_name || 'Unknown',
            role: profile?.role || 'promotor',
            last_read_at: p.last_read_at,
            profile_picture_url: profilePicture || null,
          };
        });

        // Get current user's last_read_at, marked_unread status, and cleared_at
        const currentUserParticipant = convParticipants.find(p => p.user_id === user.id);
        const lastReadAt = currentUserParticipant?.last_read_at || new Date(0).toISOString();
        const markedUnread = currentUserParticipant?.marked_unread || false;
        const clearedAt = currentUserParticipant?.cleared_at || '1970-01-01T00:00:00.000Z';

        // Count unread messages (only those created after both last_read_at AND cleared_at)
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', user.id) // Don't count own messages
          .gt('created_at', lastReadAt)
          .gt('created_at', clearedAt);

        // Get last message for this conversation (only messages after cleared_at)
        const lastMessage = lastMessages?.find(m => 
          m.conversation_id === conv.id && 
          new Date(m.created_at) > new Date(clearedAt)
        );
        const lastMessageSender = userProfiles?.find(up => up.user_id === lastMessage?.sender_id);

        // For direct chats, find the other participant
        let conversationName = conv.name;
        let isGroup = conv.type === 'group';
        let profilePictureUrl = conv.profile_picture_url;

        if (conv.type === 'direct' && !conversationName) {
          const otherParticipant = participantDetails.find(p => p.user_id !== user.id);
          conversationName = otherParticipant?.display_name || 'Unknown User';
          // Use other participant's profile picture for direct chats
          if (!profilePictureUrl) {
            profilePictureUrl = otherParticipant?.profile_picture_url || null;
          }
        }

        return {
          id: conv.id,
          type: conv.type,
          name: conversationName,
          description: conv.description,
          is_read_only: conv.is_read_only,
          created_by: conv.created_by,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          profile_picture_url: profilePictureUrl,
          is_pinned: conv.is_pinned || false,
          pinned_at: conv.pinned_at || null,
          marked_unread: markedUnread,
          participants: participantDetails,
          last_message: lastMessage ? {
            text: lastMessage.message_text,
            type: lastMessage.message_type,
            created_at: lastMessage.created_at,
            sender_name: lastMessageSender?.display_name || 'Unknown',
            sender_id: lastMessage.sender_id,
          } : null,
          unread_count: unreadCount || 0,
          is_group: isGroup,
        };
      }) || []
    );

    return NextResponse.json({ conversations: conversationsWithDetails });
  } catch (error) {
    console.error('Error in GET /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new conversation
export async function POST(request: NextRequest) {
  try {
    // Check authentication only (admin pages are protected at route level)
    const server = await createSupabaseServerClientAsync();
    const { data: auth } = await server.auth.getUser();
    
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service client for database operations (bypasses RLS)
    const supabase = createSupabaseServiceClient();

    const body = await request.json();
    const { type, name, description, participantIds, profilePictureUrl } = body;

    // Validate input
    if (!type || !['direct', 'group'].includes(type)) {
      return NextResponse.json({ error: 'Invalid conversation type' }, { status: 400 });
    }

    if (type === 'group' && !name) {
      return NextResponse.json({ error: 'Group conversations require a name' }, { status: 400 });
    }

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 });
    }

    // For direct chats, check if conversation already exists
    if (type === 'direct' && participantIds.length === 1) {
      const otherUserId = participantIds[0];
      
      // Find existing direct conversation between these two users
      const { data: existingParticipants } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .in('user_id', [auth.user.id, otherUserId]);

      if (existingParticipants && existingParticipants.length > 0) {
        // Find conversation where both users are participants
        const conversationCounts = existingParticipants.reduce((acc, p) => {
          acc[p.conversation_id] = (acc[p.conversation_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const existingConvId = Object.keys(conversationCounts).find(
          convId => conversationCounts[convId] === 2
        );

        if (existingConvId) {
          // Check if it's a direct conversation
          const { data: existingConv } = await supabase
            .from('chat_conversations')
            .select('*')
            .eq('id', existingConvId)
            .eq('type', 'direct')
            .single();

          if (existingConv) {
            return NextResponse.json({ 
              conversation: existingConv, 
              existing: true 
            });
          }
        }
      }
    }

    // Create new conversation
    const { data: newConversation, error: conversationError } = await supabase
      .from('chat_conversations')
      .insert({
        type,
        name: type === 'group' ? name : null,
        description: description || null,
        is_read_only: type === 'group', // Groups are always read-only for promotors
        created_by: auth.user.id,
        profile_picture_url: profilePictureUrl || null,
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add participants (creator + selected users)
    const participantsToAdd = [auth.user.id, ...participantIds].filter(
      (id, index, self) => self.indexOf(id) === index // Remove duplicates
    );

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(
        participantsToAdd.map(userId => ({
          conversation_id: newConversation.id,
          user_id: userId,
        }))
      );

    if (participantsError) {
      console.error('Error adding participants:', participantsError);
      // Rollback: delete the conversation
      await supabase.from('chat_conversations').delete().eq('id', newConversation.id);
      return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 });
    }

    return NextResponse.json({ conversation: newConversation, existing: false }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/chat/conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

