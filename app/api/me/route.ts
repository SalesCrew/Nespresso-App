import { NextResponse } from 'next/server';
import { createSupabaseServerClientAsync } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createSupabaseServerClientAsync();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('display_name, role, status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ user_id: user.id, profile });
}


