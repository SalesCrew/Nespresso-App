'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useSocket } from '@/lib/socket/SocketContext';
import { useNotificationCenter, MessageNotification } from './NotificationCenterContext';

interface ConversationCache {
  id: string;
  type: string;
  name: string;
  profile_picture_url?: string | null;
  is_group: boolean;
}

interface SocketMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  message_text: string;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  created_at: string;
}

export function useAdminMessageToasts(currentUserId: string) {
  const pathname = usePathname();
  const { socket } = useSocket();
  const { push } = useNotificationCenter();
  const conversationCacheRef = useRef<Map<string, ConversationCache>>(new Map());
  const isFetchingRef = useRef(false);

  // Fetch conversations and populate cache
  const fetchConversations = useCallback(async () => {
    if (isFetchingRef.current) return;
    
    try {
      isFetchingRef.current = true;
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        const conversations = data.conversations || [];
        
        conversations.forEach((conv: any) => {
          conversationCacheRef.current.set(conv.id, {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            profile_picture_url: conv.profile_picture_url,
            is_group: conv.type === 'group',
          });
        });
      }
    } catch (error) {
      console.error('Error fetching conversations for toast cache:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Fetch single conversation if missing from cache
  const fetchSingleConversation = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        const conv = data.conversation;
        if (conv) {
          conversationCacheRef.current.set(conv.id, {
            id: conv.id,
            type: conv.type,
            name: conv.name,
            profile_picture_url: conv.profile_picture_url,
            is_group: conv.type === 'group',
          });
        }
      }
    } catch (error) {
      console.error('Error fetching single conversation:', error);
    }
  }, []);

  // Initialize cache on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Listen to socket messages
  useEffect(() => {
    if (!socket) {
      return;
    }


    const handleNewMessage = async (message: SocketMessage) => {

      // Don't show toasts on chat page
      if (pathname === '/admin/chat') {
        return;
      }

      // Don't show toasts for own messages
      if (message.sender_id === currentUserId) {
        return;
      }


      // Get conversation from cache
      let conversation = conversationCacheRef.current.get(message.conversation_id);
      
      // If not in cache, fetch it
      if (!conversation) {
        await fetchSingleConversation(message.conversation_id);
        conversation = conversationCacheRef.current.get(message.conversation_id);
      }

      // Build preview text
      let preview = message.message_text || '';
      if (message.message_type === 'photo') {
        preview = '📷 Foto';
      } else if (message.message_type === 'pdf') {
        preview = '📄 PDF';
      }
      preview = preview.trim() || 'Neue Nachricht';

      // Build title and subtitle
      let title = message.sender_name;
      let subtitle: string | undefined = undefined;
      let avatarUrl: string | null | undefined = undefined;

      if (conversation) {
        if (conversation.is_group) {
          // For groups: title is group name, subtitle is sender
          title = conversation.name;
          subtitle = message.sender_name;
          avatarUrl = conversation.profile_picture_url;
        } else {
          // For direct chats: title is sender name
          title = message.sender_name;
          // Try to get sender's profile picture (in cache, it's already mapped)
          // For now, we don't have direct access to sender profile pictures in conversation cache
          // We'll use conversation profile_picture_url (which is the other participant's picture for direct chats)
          avatarUrl = conversation.profile_picture_url;
        }
      }

      const notification: MessageNotification = {
        id: `toast-${message.id}-${Date.now()}`,
        messageId: message.id,
        conversationId: message.conversation_id,
        title,
        subtitle,
        preview,
        avatarUrl,
        timestamp: new Date(message.created_at),
      };

      push(notification);
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, pathname, currentUserId, push, fetchSingleConversation]);
}

