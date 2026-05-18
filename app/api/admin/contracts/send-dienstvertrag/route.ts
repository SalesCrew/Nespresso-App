import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { requireAdmin } from '@/lib/supabase/queries';

export async function POST(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { contract_id, user_id, html_content } = body;

    if (!contract_id || !user_id || !html_content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const svc = createSupabaseServiceClient();

    // Upsert the sent Dienstvertrag HTML
    const { data, error } = await svc
      .from('sent_dienstvertrag')
      .upsert(
        {
          contract_id,
          user_id,
          html_content,
          sent_by: auth.user.id,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'contract_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error saving sent Dienstvertrag:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent_dienstvertrag: data });
  } catch (error: any) {
    console.error('Unexpected error saving sent Dienstvertrag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const server = createSupabaseServerClient();
  const { data: auth } = await server.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const contractId = req.nextUrl.searchParams.get('contract_id');
  
  if (!contractId) {
    return NextResponse.json({ error: 'contract_id required' }, { status: 400 });
  }

  const svc = createSupabaseServiceClient();

  try {
    const { data, error } = await svc
      .from('sent_dienstvertrag')
      .select('*')
      .eq('contract_id', contractId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return NextResponse.json({ sent_dienstvertrag: null });
      }
      console.error('Error fetching sent Dienstvertrag:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent_dienstvertrag: data });
  } catch (error: any) {
    console.error('Unexpected error fetching sent Dienstvertrag:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

