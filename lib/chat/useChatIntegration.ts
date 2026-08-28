import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/lib/socket/SocketContext';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message_text: string;
  message_type: string;
  file_url?: string | null;
  file_name?: string | null;
  reply_to_id?: string | null;
  reply_to?: {
    id: string;
    sender_name: string;
    message_text: string;
    message_type: string;
    file_url?: string | null;
    file_name?: string | null;
  } | null;
  edited: boolean;
  deleted_for_all?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  reactions_summary?: Array<{ emoji: string; count: number }>;
  my_reaction?: string | null;
  top_reaction?: { emoji: string; count: number } | null;
  total_reactions?: number;
  // Poll payload (present when message_type === 'poll')
  poll?: {
    id: string;
    question: string;
    allow_multiple: boolean;
    options: Array<{ id: string; text: string; count: number; voterIds?: string[] }>;
    my_votes: string[];
  };
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  type: string;
  name: string;
  description?: string | null;
  is_read_only: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  profile_picture_url?: string | null;
  is_pinned?: boolean;
  pinned_at?: string | null;
  marked_unread?: boolean;
  participants: Array<{
    user_id: string;
    display_name: string;
    role: string;
    last_read_at: string;
    profile_picture_url?: string | null;
  }>;
  last_message: {
    text: string;
    type: string;
    created_at: string;
    sender_name: string;
    sender_id: string;
  } | null;
  unread_count: number;
  is_group: boolean;
}

interface UseChatIntegrationOptions {
  onNewMessage?: (message: Message) => void;
  onUserTyping?: (data: { userId: string; userName: string; conversationId: string }) => void;
  onUserStoppedTyping?: (data: { userId: string; conversationId: string }) => void;
}

export const useChatIntegration = (options: UseChatIntegrationOptions = {}) => {
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, Set<string>>>({});
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user_id || '');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };
    fetchCurrentUser();
  }, []);

  // Fetch conversations on mount
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a specific conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/messages/${conversationId}?limit=100`);
      if (response.ok) {
        const data = await response.json();
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages || [],
        }));
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback((
    conversationId: string,
    messageText: string,
    replyToId?: string | null,
    messageType: string = 'text',
    fileUrl?: string | null,
    fileName?: string | null
  ) => {
    return new Promise<Message>((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit(
        'send_message',
        {
          conversationId,
          messageText,
          messageType,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          replyToId: replyToId || null,
        },
        (response: { success?: boolean; message?: Message; error?: string }) => {
          if (response.success && response.message) {
            resolve(response.message);
          } else {
            reject(new Error(response.error || 'Failed to send message'));
          }
        }
      );
    });
  }, [socket]);

  // Create a poll (admin)
  const createPoll = useCallback((
    conversationId: string,
    question: string,
    options: string[],
    allowMultiple: boolean
  ) => {
    return new Promise<Message>((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }
      socket.emit(
        'send_message',
        {
          conversationId,
          messageText: question,
          messageType: 'poll',
          pollQuestion: question,
          pollOptions: options,
          allowMultiple,
        },
        (response: { success?: boolean; message?: Message; error?: string }) => {
          if (response.success && response.message) {
            resolve(response.message);
          } else {
            reject(new Error(response.error || 'Failed to create poll'));
          }
        }
      );
    });
  }, [socket]);

  // Vote / unvote on poll option
  const votePoll = useCallback((
    conversationId: string,
    pollId: string,
    optionId: string,
    checked: boolean
  ) => {
    // Optimistically update my_votes for the current user only
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map(msg => {
        if (msg.poll && msg.poll.id === pollId) {
          const allowMultiple = !!msg.poll.allow_multiple;
          const current = Array.isArray(msg.poll.my_votes) ? msg.poll.my_votes : [];
          let next: string[] = current;
          if (checked) {
            next = allowMultiple ? Array.from(new Set([...current, optionId])) : [optionId];
          } else {
            next = current.filter(id => id !== optionId);
          }
          return { ...msg, poll: { ...msg.poll, my_votes: next } } as any;
        }
        return msg;
      }),
    }));

    return new Promise<void>((resolve, reject) => {
      if (!socket) { reject(new Error('Socket not connected')); return; }
      socket.emit('vote_poll', { conversationId, pollId, optionId, checked }, (resp: { success?: boolean; error?: string }) => {
        if (resp?.success) resolve(); else reject(new Error(resp?.error || 'Failed to vote'));
      });
    });
  }, [socket]);

  // Fetch full poll votes (user_ids grouped by option)
  const getPollVotes = useCallback(async (pollId: string) => {
    const res = await fetch(`/api/chat/polls/${pollId}/votes`, { method: 'GET' });
    if (!res.ok) throw new Error('Failed to load votes');
    return await res.json();
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback((conversationId: string) => {
    return new Promise<void>((resolve, reject) => {
      if (!socket) {
        reject(new Error('Socket not connected'));
        return;
      }

      socket.emit(
        'mark_read',
        { conversationId },
        (response: { success?: boolean; error?: string }) => {
          if (response.success) {
            // Update local conversation unread count
            setConversations(prev => {
              const updated = prev.map(conv =>
                conv.id === conversationId ? { ...conv, unread_count: 0, marked_unread: false } : conv
              );
              // Broadcast updated total unread for realtime pill update
              try {
                const totalUnread = updated.reduce((sum, c) => sum + (c.unread_count || 0), 0);
                localStorage.setItem('promotorUnreadCount', String(totalUnread));
                window.dispatchEvent(new CustomEvent('promotorUnreadChanged', { detail: totalUnread }));
                window.dispatchEvent(new Event('storage'));
              } catch {}
              return updated;
            });
            resolve();
          } else {
            reject(new Error(response.error || 'Failed to mark as read'));
          }
        }
      );
    });
  }, [socket]);

  // Emit typing indicators
  const startTyping = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('typing_start', { conversationId });
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('typing_stop', { conversationId });
    }
  }, [socket]);

  // Join a conversation room (for newly created conversations)
  const joinConversation = useCallback((conversationId: string) => {
    if (socket) {
      socket.emit('join_conversation', { conversationId });
    }
  }, [socket]);

  // Create a new conversation
  const createConversation = useCallback(async (
    type: 'direct' | 'group',
    participantIds: string[],
    name?: string,
    description?: string,
    profilePictureUrl?: string
  ) => {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          description,
          participantIds,
          profilePictureUrl,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Join the conversation room if it's new
        if (!data.existing && socket) {
          joinConversation(data.conversation.id);
        }

        // Refresh conversations list
        await fetchConversations();
        
        return data.conversation;
      } else {
        throw new Error('Failed to create conversation');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [socket, joinConversation, fetchConversations]);

  // Delete a message
  const deleteMessage = useCallback(async (
    conversationId: string,
    messageId: string,
    deleteForEveryone: boolean
  ) => {
    try {
      const response = await fetch('/api/chat/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          messageId,
          deleteForEveryone,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (deleteForEveryone && socket) {
          // Emit socket event for delete-for-everyone to update all clients
          socket.emit('delete_message', {
            conversationId,
            messageId,
            deleteForEveryone: true,
          });
        }

        // Update local messages state
        if (deleteForEveryone) {
          // Replace message with deleted placeholder
          setMessages(prev => ({
            ...prev,
            [conversationId]: prev[conversationId]?.map(msg => 
              msg.id === messageId 
                ? { ...msg, message_text: 'Diese Nachricht wurde gelöscht...', message_type: 'text', file_url: null, file_name: null, deleted_for_all: true }
                : msg
            ) || [],
          }));
        } else {
          // Remove message from local state (delete for me)
          setMessages(prev => ({
            ...prev,
            [conversationId]: prev[conversationId]?.filter(msg => msg.id !== messageId) || [],
          }));
        }
        
        return data;
      } else {
        throw new Error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [socket]);

  // React to a message
  const reactToMessage = useCallback(async (
    conversationId: string,
    messageId: string,
    emoji: string
  ) => {
    try {
      const response = await fetch(`/api/chat/reactions/${messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state with new reaction summary
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions_summary: data.reactionsSummary,
                  my_reaction: data.myReaction,
                  top_reaction: data.topReaction,
                  total_reactions: data.totalReactions,
                }
              : msg
          ),
        }));

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('react_to_message', {
            conversationId,
            messageId,
            emoji,
          });
        }

        return data;
      } else {
        throw new Error('Failed to add reaction');
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, [socket]);

  // Remove reaction from a message
  const removeReaction = useCallback(async (
    conversationId: string,
    messageId: string
  ) => {
    try {
      const response = await fetch(`/api/chat/reactions/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  reactions_summary: data.reactionsSummary,
                  my_reaction: null,
                  top_reaction: data.topReaction,
                  total_reactions: data.totalReactions,
                }
              : msg
          ),
        }));

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('remove_reaction', {
            conversationId,
            messageId,
          });
        }

        return data;
      } else {
        throw new Error('Failed to remove reaction');
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }, [socket]);

  // Edit a message
  const editMessage = useCallback(async (
    conversationId: string,
    messageId: string,
    newText: string
  ) => {
    try {
      // Store original message for rollback
      const originalMessages = messages[conversationId];
      const originalMessage = originalMessages?.find(msg => msg.id === messageId);
      
      // Optimistic update
      setMessages(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || []).map(msg =>
          msg.id === messageId
            ? { 
                ...msg, 
                message_text: newText, 
                edited: true, 
                updated_at: new Date().toISOString() 
              }
            : msg
        ),
      }));

      // API call
      const response = await fetch(`/api/chat/messages/edit/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_text: newText }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update with server response
        setMessages(prev => ({
          ...prev,
          [conversationId]: (prev[conversationId] || []).map(msg =>
            msg.id === messageId 
              ? {
                  ...msg,
                  message_text: data.message.message_text,
                  edited: data.message.edited,
                  updated_at: data.message.updated_at,
                }
              : msg
          ),
        }));

        // Emit socket event for real-time updates
        if (socket) {
          socket.emit('edit_message', {
            conversationId,
            messageId,
            newText,
          });
        }

        return data;
      } else {
        // Revert optimistic update on error
        if (originalMessage) {
          setMessages(prev => ({
            ...prev,
            [conversationId]: (prev[conversationId] || []).map(msg =>
              msg.id === messageId ? originalMessage : msg
            ),
          }));
        }
        throw new Error('Failed to edit message');
      }
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, [socket, messages]);

  // Pin a conversation
  const pinConversation = useCallback(async (conversationId: string) => {
    try {
      // Optimistic update
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, is_pinned: true, pinned_at: new Date().toISOString() }
            : conv
        ).sort((a, b) => {
          // Sort: pinned first, then by pinned_at, then by updated_at
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          if (a.is_pinned && b.is_pinned) {
            const aTime = new Date(a.pinned_at || 0).getTime();
            const bTime = new Date(b.pinned_at || 0).getTime();
            if (aTime !== bTime) return bTime - aTime;
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
      );

      const response = await fetch(`/api/chat/conversations/${conversationId}/pin`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        await fetchConversations();
        throw new Error('Failed to pin conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error pinning conversation:', error);
      throw error;
    }
  }, [fetchConversations]);

  // Unpin a conversation
  const unpinConversation = useCallback(async (conversationId: string) => {
    try {
      // Optimistic update
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, is_pinned: false, pinned_at: null }
            : conv
        ).sort((a, b) => {
          // Sort: pinned first, then by pinned_at, then by updated_at
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          if (a.is_pinned && b.is_pinned) {
            const aTime = new Date(a.pinned_at || 0).getTime();
            const bTime = new Date(b.pinned_at || 0).getTime();
            if (aTime !== bTime) return bTime - aTime;
          }
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        })
      );

      const response = await fetch(`/api/chat/conversations/${conversationId}/unpin`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        await fetchConversations();
        throw new Error('Failed to unpin conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error unpinning conversation:', error);
      throw error;
    }
  }, [fetchConversations]);

  // Mark a conversation as unread
  const markConversationUnread = useCallback(async (conversationId: string) => {
    try {
      // Optimistic update
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, marked_unread: true }
            : conv
        )
      );

      const response = await fetch(`/api/chat/conversations/${conversationId}/mark-unread`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        await fetchConversations();
        throw new Error('Failed to mark conversation as unread');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking conversation as unread:', error);
      throw error;
    }
  }, [fetchConversations]);

  // Mark a conversation as read (clear manual unread flag and unread count)
  const markConversationRead = useCallback(async (conversationId: string) => {
    try {
      // Optimistic update
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, marked_unread: false, unread_count: 0 }
            : conv
        )
      );

      const response = await fetch(`/api/chat/conversations/${conversationId}/mark-read`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        await fetchConversations();
        throw new Error('Failed to mark conversation as read');
      }

      return await response.json();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }, [fetchConversations]);

  // Clear conversation for current user (hide all messages created before now)
  const clearConversationForMe = useCallback(async (conversationId: string) => {
    try {
      // Optimistic update: clear messages and reset unread/marked_unread
      setMessages(prev => ({
        ...prev,
        [conversationId]: [],
      }));

      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { 
                ...conv, 
                unread_count: 0, 
                marked_unread: false,
                last_message: null,
              }
            : conv
        )
      );

      const response = await fetch(`/api/chat/conversations/${conversationId}/clear-for-me`, {
        method: 'POST',
      });

      if (!response.ok) {
        // Revert on error
        await fetchConversations();
        await fetchMessages(conversationId);
        throw new Error('Failed to clear conversation');
      }

      return await response.json();
    } catch (error) {
      console.error('Error clearing conversation:', error);
      throw error;
    }
  }, [fetchConversations, fetchMessages]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      
      // Add message to the conversation
      setMessages(prev => ({
        ...prev,
        [message.conversation_id]: [...(prev[message.conversation_id] || []), message],
      }));

      // Update conversation's last message and move to top
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.id === message.conversation_id) {
            const isOwnMessage = message.sender_id === currentUserId;
            return {
              ...conv,
              last_message: {
                text: message.message_text,
                type: message.message_type,
                created_at: message.created_at,
                sender_name: message.sender_name,
                sender_id: message.sender_id,
              },
              updated_at: message.created_at,
              // Increment unread count if message is not from current user
              unread_count: isOwnMessage ? conv.unread_count : (conv.unread_count + 1),
            };
          }
          return conv;
        });
        
        // Sort by updated_at
        return updated.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });

      if (options.onNewMessage) {
        options.onNewMessage(message);
      }
    };

    const handleUserTyping = (data: { userId: string; userName: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const convTyping = new Set(prev[data.conversationId] || []);
        convTyping.add(data.userId);
        return {
          ...prev,
          [data.conversationId]: convTyping,
        };
      });

      if (options.onUserTyping) {
        options.onUserTyping(data);
      }

      // Auto-clear typing indicator after 3 seconds
      setTimeout(() => {
        setTypingUsers(prev => {
          const convTyping = new Set(prev[data.conversationId] || []);
          convTyping.delete(data.userId);
          if (convTyping.size === 0) {
            const updated = { ...prev };
            delete updated[data.conversationId];
            return updated;
          }
          return {
            ...prev,
            [data.conversationId]: convTyping,
          };
        });
      }, 3000);
    };

    const handleUserStoppedTyping = (data: { userId: string; conversationId: string }) => {
      setTypingUsers(prev => {
        const convTyping = new Set(prev[data.conversationId] || []);
        convTyping.delete(data.userId);
        if (convTyping.size === 0) {
          const updated = { ...prev };
          delete updated[data.conversationId];
          return updated;
        }
        return {
          ...prev,
          [data.conversationId]: convTyping,
        };
      });

      if (options.onUserStoppedTyping) {
        options.onUserStoppedTyping(data);
      }
    };

    const handleMessageEdited = (payload: {
      conversationId: string;
      messageId: string;
      message_text: string;
      edited: boolean;
      updated_at: string;
    }) => {
      setMessages(prev => ({
        ...prev,
        [payload.conversationId]: (prev[payload.conversationId] || []).map(msg =>
          msg.id === payload.messageId
            ? {
                ...msg,
                message_text: payload.message_text,
                edited: true,
                updated_at: payload.updated_at,
              }
            : msg
        ),
      }));
    };

    const handleMessageDeleted = (data: { conversationId: string; messageId: string; deleteForEveryone: boolean }) => {
      if (data.deleteForEveryone) {
        // Replace message with deleted placeholder
        setMessages(prev => ({
          ...prev,
          [data.conversationId]: prev[data.conversationId]?.map(msg => 
            msg.id === data.messageId 
              ? { ...msg, message_text: 'Diese Nachricht wurde gelöscht...', message_type: 'text', file_url: null, file_name: null, deleted_for_all: true }
              : msg
          ) || [],
        }));
      }
    };

    const handleReactionUpdated = (data: { 
      conversationId: string; 
      messageId: string; 
      reactionsSummary: Array<{ emoji: string; count: number }>;
      topReaction: { emoji: string; count: number } | null;
      totalReactions: number;
    }) => {
      
      setMessages(prev => ({
        ...prev,
        [data.conversationId]: (prev[data.conversationId] || []).map(msg =>
          msg.id === data.messageId
            ? {
                ...msg,
                reactions_summary: data.reactionsSummary,
                top_reaction: data.topReaction,
                total_reactions: data.totalReactions,
              }
            : msg
        ),
      }));
    };

    const handlePollUpdated = (data: {
      conversationId: string;
      pollId: string;
      totals: Array<{ optionId: string; count: number }>;
      votersByOption: Record<string, string[]>;
    }) => {
      setMessages(prev => {
        const list = prev[data.conversationId] || [];
        const updated = list.map(msg => {
          if (msg.poll && msg.poll.id === data.pollId) {
            const counts = new Map(data.totals.map(t => [t.optionId, t.count]));
            const voters = data.votersByOption || {};
            return {
              ...msg,
              poll: {
                ...msg.poll,
                options: msg.poll.options.map(o => ({
                  ...o,
                  count: counts.get(o.id) || 0,
                  voterIds: (voters[o.id] || []).slice(0,3),
                })),
                // Keep my_votes unchanged - only optimistic updates modify it
                my_votes: msg.poll.my_votes,
              },
            } as Message;
          }
          return msg;
        });
        return { ...prev, [data.conversationId]: updated };
      });
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('message_edited', handleMessageEdited);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('poll_updated', handlePollUpdated);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('message_edited', handleMessageEdited);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('poll_updated', handlePollUpdated);
    };
  }, [socket, options]);

  // Fetch conversations on mount (don't wait for Socket.IO connection)
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    messages,
    loading,
    typingUsers,
    isConnected,
    currentUserId,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    createConversation,
    joinConversation,
    createPoll,
    votePoll,
    getPollVotes,
    deleteMessage,
    editMessage,
    reactToMessage,
    removeReaction,
    pinConversation,
    unpinConversation,
    markConversationUnread,
    markConversationRead,
    clearConversationForMe,
  };
};

