import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

export async function GET() {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();

    console.log('Auth check - user:', user?.id, 'error:', authError?.message);

    if (authError || !user) {
      console.error('Auth failed:', authError?.message || 'No user');
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 });
    }

    // Use service client to bypass RLS
    const svc = createSupabaseServiceClient();

    // Simple direct query to get messages for this user
    console.log('Fetching messages for user:', user.id);
    
    // Get all recipient records for this user
    const { data: recipientRecords, error: recipError } = await svc
      .from('message_recipients')
      .select('*')
      .eq('recipient_user_id', user.id);
    
    console.log('Found recipient records:', recipientRecords?.length || 0);
    
    if (!recipientRecords || recipientRecords.length === 0) {
      console.log('No messages for this user');
      return NextResponse.json({ messages: [] });
    }
    
    // Get the message IDs
    const messageIds = recipientRecords.map(r => r.message_id);
    console.log('Message IDs to fetch:', messageIds);
    
    // Get the actual messages (sent status, but filter by scheduled_send_time)
    const { data: messages, error: msgError } = await svc
      .from('messages')
      .select('*')
      .in('id', messageIds)
      .eq('status', 'sent')
      .order('created_at', { ascending: false });
    
    console.log('Found messages:', messages?.length || 0);
    
    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json({ error: msgError.message }, { status: 500 });
    }
    
    // Filter out messages that are scheduled for the future
    // Use UTC time for both comparisons to avoid timezone issues
    const nowUTC = new Date().toISOString();
    const visibleMessages = (messages || []).filter(msg => {
      // If no scheduled_send_time, show immediately (instant messages)
      if (!msg.scheduled_send_time) return true;
      // If scheduled_send_time is in the past or now, show it (compare UTC strings)
      return msg.scheduled_send_time <= nowUTC;
    });
    
    console.log('Messages after time filtering:', visibleMessages?.length || 0);
    
    // Combine message data with recipient data
    const formattedMessages = visibleMessages.map(msg => {
      const recipientData = recipientRecords.find(r => r.message_id === msg.id);
      return {
        id: msg.id,
        sender_id: msg.sender_id,
        message_text: msg.message_text,
        message_type: msg.message_type,
        read_at: recipientData?.read_at || null,
        acknowledged_at: recipientData?.acknowledged_at || null,
        created_at: msg.created_at,
        sent_at: msg.sent_at,
        sender_name: 'Admin'
      };
    });

    console.log('Returning messages:', formattedMessages);

    return NextResponse.json({ messages: formattedMessages });

  } catch (e: any) {
    console.error('Server error in user messages API:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
