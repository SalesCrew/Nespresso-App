import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function POST(request: Request) {
  try {
    const server = await createSupabaseServerClientAsync();
    const { data: { user }, error: authError } = await server.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { todoType, referenceId, title } = body;

    if (!todoType || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Insert or update todo completion in history
    const { data, error } = await svc
      .from('todo_history')
      .upsert({
        user_id: user.id,
        todo_type: todoType,
        reference_id: referenceId,
        title: title,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,todo_type,reference_id'
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error saving todo completion:', error);
      return NextResponse.json({ error: 'Failed to save completion' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Unexpected error in /api/me/todos/complete:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
