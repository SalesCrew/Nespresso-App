import { NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { 
      message_text, 
      message_type = 'normal', 
      recipient_ids = [], 
      scheduled_send_time = null,
      send_immediately = true 
    } = body;

    if (!message_text || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return NextResponse.json({ 
        error: 'message_text and recipient_ids are required' 
      }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Always send immediately but keep scheduled_send_time for filtering
    const now = new Date();
    const status = 'sent'; // Always sent immediately
    const sent_at = now.toISOString(); // Always set sent_at

    // Create the message
    console.log('📝 Creating message with:', {
      sender_id: user.id,
      message_text,
      message_type,
      scheduled_send_time,
      status,
      sent_at
    });
    
    const { data: message, error: messageError } = await svc
      .from('messages')
      .insert({
        sender_id: user.id,
        message_text,
        message_type,
        scheduled_send_time,
        status,
        sent_at
      })
      .select('*')
      .single();

    if (messageError) {
      console.error('Error creating message:', messageError);
      return NextResponse.json({ error: messageError.message }, { status: 500 });
    }

    console.log('✅ Message created:', message);

    // Create recipient records
    const recipients = recipient_ids.map((recipient_id: string) => ({
      message_id: message.id,
      recipient_user_id: recipient_id
    }));

    console.log('👥 Creating recipients:', recipients);

    const { error: recipientsError } = await svc
      .from('message_recipients')
      .insert(recipients);

    if (recipientsError) {
      console.error('Error creating recipients:', recipientsError);
      return NextResponse.json({ error: recipientsError.message }, { status: 500 });
    }

    console.log('✅ Recipients created successfully');

    return NextResponse.json({ 
      message: message,
      recipients_count: recipient_ids.length,
      success: true 
    });

  } catch (e: any) {
    console.error('Server error in messages API:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = createSupabaseServiceClient();

    // Get all messages with recipient info (for admin dashboard)
    const { data: messages, error } = await svc
      .from('messages_with_recipients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ messages: messages || [] });

  } catch (e: any) {
    console.error('Server error in messages GET:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}


