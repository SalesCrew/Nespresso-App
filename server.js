const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Initialize Supabase client for server-side operations
const supabase = createClient(
  supabaseUrl,
  serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const configuredOriginHosts = [
  process.env.ALLOWED_ORIGIN,
  process.env.APP_ORIGIN,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
]
  .filter(Boolean)
  .flatMap((value) => String(value).split(','))
  .map((value) => value.trim())
  .filter(Boolean)
  .map((value) => {
    try { return new URL(value).host; } catch { return ''; }
  })
  .filter(Boolean);

function isAllowedSocketRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    return originHost === req.headers.host || configuredOriginHosts.includes(originHost);
  } catch {
    return false;
  }
}

function chatAttachmentProxyUrl(reference) {
  if (typeof reference !== 'string' || !reference.trim()) return null;
  const value = reference.trim();
  if (value.startsWith('/api/chat/attachments?path=')) return value;
  const markers = [
    '/storage/v1/object/sign/chat-attachments/',
    '/storage/v1/object/public/chat-attachments/',
    '/storage/v1/object/authenticated/chat-attachments/',
  ];
  let path = value;
  for (const marker of markers) {
    const markerIndex = value.indexOf(marker);
    if (markerIndex >= 0) {
      path = value.slice(markerIndex + marker.length).split('?')[0];
      break;
    }
  }
  if (/^https?:\/\//i.test(path)) return null;
  try {
    path = decodeURIComponent(path).replace(/^\/+/, '');
  } catch {
    return null;
  }
  if (!path || path.includes('..') || path.includes('\\')) return null;
  return `/api/chat/attachments?path=${encodeURIComponent(path)}`;
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
    },
    allowRequest: (req, callback) => callback(null, isAllowedSocketRequest(req)),
    maxHttpBufferSize: 1_000_000,
  });

  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token missing'));
      }

      // Verify token with Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return next(new Error('Invalid authentication token'));
      }

      // Attach user info to socket
      socket.userId = user.id;
      // Fetch user profile for role information
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, display_name')
        .eq('user_id', user.id)
        .single();

      socket.userRole = profile?.role || 'promotor';
      socket.userName = profile?.display_name || user.email;

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Socket.IO connection handler
  io.on('connection', async (socket) => {
    // Join user to their conversation rooms
    try {
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', socket.userId);

      if (participants) {
        participants.forEach(({ conversation_id }) => {
          socket.join(conversation_id);
        });
      }
    } catch (error) {
      console.error('Error joining conversation rooms:', error);
    }

    // Handle sending messages (text, file, poll)
    socket.on('send_message', async (data, callback) => {
      try {
        const { conversationId, messageText, messageType = 'text', fileUrl = null, fileName = null, replyToId = null, pollQuestion, pollOptions, allowMultiple } = data;

        if (!conversationId || !['text', 'file', 'image', 'poll'].includes(String(messageType))) {
          return callback({ error: 'Invalid message payload' });
        }
        if (String(messageText || '').length > 5000 || String(fileName || '').length > 255 || String(fileUrl || '').length > 2000) {
          return callback({ error: 'Message payload too large' });
        }

        // Validate that user is participant in conversation
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .single();

        if (!participant) {
          return callback({ error: 'Not a participant in this conversation' });
        }

        // Check if conversation is read-only and user is not admin
        const { data: conversation } = await supabase
          .from('chat_conversations')
          .select('is_read_only')
          .eq('id', conversationId)
          .single();

        if (conversation?.is_read_only && !['admin_staff', 'admin_of_admins'].includes(socket.userRole)) {
          return callback({ error: 'Cannot send messages to read-only conversation' });
        }

        // Special handling for polls
        let newMessage;
        if (messageType === 'poll') {
          // Only admins can create polls
          const isAdmin = ['admin_staff','admin_of_admins'].includes(socket.userRole);
          if (!isAdmin) {
            return callback({ error: 'Only admins can create polls' });
          }
          const question = (pollQuestion || messageText || '').toString().trim().slice(0, 500);
          const options = Array.isArray(pollOptions)
            ? pollOptions.filter(Boolean).slice(0, 10).map((s) => String(s).trim().slice(0, 200))
            : [];
          if (!question || options.length < 2 || options.some((option) => !option)) {
            return callback({ error: 'Invalid poll payload' });
          }
          // Create poll
          const { data: poll, error: pollErr } = await supabase
            .from('chat_polls')
            .insert({ conversation_id: conversationId, created_by: socket.userId, question, allow_multiple: !!allowMultiple })
            .select('*')
            .single();
          if (pollErr || !poll) {
            return callback({ error: 'Failed to create poll' });
          }
          // Options
          const optionRows = options.map((text, idx) => ({ poll_id: poll.id, option_text: text, order_index: idx }));
          const { data: createdOptions, error: optErr } = await supabase
            .from('chat_poll_options')
            .insert(optionRows)
            .select('*');
          if (optErr) {
            return callback({ error: 'Failed to create poll options' });
          }
          // Create message referencing poll
          const { data: msgRow, error: msgErr } = await supabase
            .from('chat_messages')
            .insert({
              conversation_id: conversationId,
              sender_id: socket.userId,
              message_text: question,
              message_type: 'poll',
              poll_id: poll.id,
              reply_to_id: replyToId,
            })
            .select('*')
            .single();
          if (msgErr || !msgRow) {
            return callback({ error: 'Failed to create poll message' });
          }
          newMessage = msgRow;
          // Build poll payload for broadcast
          const pollPayload = {
            id: poll.id,
            question: poll.question,
            allow_multiple: !!poll.allow_multiple,
            options: (createdOptions || []).sort((a,b)=> (a.order_index||0)-(b.order_index||0)).map(o => ({ id: o.id, text: o.option_text, count: 0 })),
            my_votes: [],
          };
          // Emit message including poll
          const messageWithSender = {
            ...newMessage,
            sender_name: socket.userName,
            sender_role: socket.userRole,
            reply_to: null,
            poll: pollPayload,
          };
          io.to(conversationId).emit('new_message', messageWithSender);
          await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
          return callback({ success: true, message: messageWithSender });
        }

        // Insert standard message into database
        const { data: insertedMessage, error } = await supabase
          .from('chat_messages')
          .insert({
            conversation_id: conversationId,
            sender_id: socket.userId,
            message_text: messageText,
            message_type: messageType,
            file_url: fileUrl,
            file_name: fileName,
            reply_to_id: replyToId,
          })
          .select()
          .single();
        newMessage = insertedMessage;

        if (error) {
          console.error('Error inserting message:', error);
          return callback({ error: 'Failed to send message' });
        }

        // Fetch reply_to message details if this is a reply
        let replyToDetails = null;
        if (replyToId) {
          const { data: replyToMessage } = await supabase
            .from('chat_messages')
            .select('id, sender_id, message_text, message_type, file_url, file_name')
            .eq('id', replyToId)
            .single();

          if (replyToMessage) {
            // Fetch sender name for the reply-to message
            const { data: replyToSenderProfile } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('user_id', replyToMessage.sender_id)
              .single();

            replyToDetails = {
              id: replyToMessage.id,
              sender_name: replyToSenderProfile?.display_name || 'Unknown',
              message_text: replyToMessage.message_text,
              message_type: replyToMessage.message_type,
              file_url: chatAttachmentProxyUrl(replyToMessage.file_url),
              file_name: replyToMessage.file_name,
            };
          }
        }

        // Fetch sender info for the message
        const messageWithSender = {
          ...newMessage,
          file_url: chatAttachmentProxyUrl(newMessage.file_url),
          sender_name: socket.userName,
          sender_role: socket.userRole,
          reply_to: replyToDetails,
        };

        // Emit message to all participants in the conversation room
        io.to(conversationId).emit('new_message', messageWithSender);

        // Send success callback to sender
        callback({ success: true, message: messageWithSender });
      } catch (error) {
        console.error('Error sending message:', error);
        callback({ error: 'Failed to send message' });
      }
    });

    // Vote on a poll
    socket.on('vote_poll', async (data, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const { conversationId, pollId, optionId, checked } = data || {};
        if (!conversationId || !pollId || !optionId) return cb({ error: 'Invalid payload' });

        // Validate participant
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .single();
        if (!participant) return cb({ error: 'Not a participant' });

        // Load poll header
        const { data: poll } = await supabase
          .from('chat_polls')
          .select('id, allow_multiple, conversation_id')
          .eq('id', pollId)
          .single();
        if (!poll || poll.conversation_id !== conversationId) return cb({ error: 'Poll not found' });

        if (!checked) {
          await supabase
            .from('chat_poll_votes')
            .delete()
            .eq('poll_id', pollId)
            .eq('option_id', optionId)
            .eq('user_id', socket.userId);
        } else {
          if (!poll.allow_multiple) {
            await supabase
              .from('chat_poll_votes')
              .delete()
              .eq('poll_id', pollId)
              .eq('user_id', socket.userId);
          }
          await supabase
            .from('chat_poll_votes')
            .insert({ poll_id: pollId, option_id: optionId, user_id: socket.userId });
        }

        // Tally fresh counts and voters
        const { data: votes } = await supabase
          .from('chat_poll_votes')
          .select('option_id, user_id, created_at')
          .eq('poll_id', pollId);

        const tallyMap = new Map();
        const votersMap = new Map();
        (votes || []).forEach(v => {
          tallyMap.set(v.option_id, (tallyMap.get(v.option_id) || 0) + 1);
          const arr = votersMap.get(v.option_id) || [];
          arr.push(v.user_id);
          votersMap.set(v.option_id, arr);
        });

        // Broadcast vote tallies to everyone (no myVotes - each client manages their own)
        io.to(conversationId).emit('poll_updated', {
          conversationId,
          pollId,
          totals: Array.from(tallyMap.entries()).map(([optionId, count]) => ({ optionId, count })),
          votersByOption: Object.fromEntries(Array.from(votersMap.entries()).map(([k,v]) => [k, v.slice(0,3)])),
        });
        cb({ success: true });
      } catch (err) {
        console.error('Error in vote_poll:', err);
        cb({ error: 'Failed to vote' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', async ({ conversationId }) => {
      try {
        // Verify user is participant
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .single();

        if (participant) {
          socket.to(conversationId).emit('user_typing', {
            userId: socket.userId,
            userName: socket.userName,
            conversationId,
          });
        }
      } catch (error) {
        console.error('Error handling typing_start:', error);
      }
    });

    socket.on('typing_stop', async ({ conversationId }) => {
      try {
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .maybeSingle();
        if (participant) {
          socket.to(conversationId).emit('user_stopped_typing', {
            userId: socket.userId,
            conversationId,
          });
        }
      } catch (error) {
        console.error('Error handling typing_stop:', error);
      }
    });

    // Handle marking messages as read
    socket.on('mark_read', async ({ conversationId }, callback) => {
      try {
        // Update last_read_at for this user in this conversation
        const { error } = await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId);

        if (error) {
          console.error('Error marking as read:', error);
          return callback({ error: 'Failed to mark as read' });
        }

        // Notify other participants that this user has read messages
        socket.to(conversationId).emit('user_read', {
          userId: socket.userId,
          conversationId,
        });

        callback({ success: true });
      } catch (error) {
        console.error('Error marking conversation as read:', error);
        callback({ error: 'Failed to mark as read' });
      }
    });

    // Handle user joining a new conversation (for dynamic group creation)
    socket.on('join_conversation', async ({ conversationId }, callback) => {
      const cb = typeof callback === 'function' ? callback : () => {};
      try {
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('conversation_id', conversationId)
          .eq('user_id', socket.userId)
          .maybeSingle();
        if (!participant) return cb({ error: 'Not a participant' });
        await socket.join(conversationId);
        cb({ success: true });
      } catch {
        cb({ error: 'Failed to join conversation' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {});
  });

  httpServer
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

