import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    deployment: {
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
    }
  };

  // Try to connect to Supabase
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    diagnostics.supabase = {
      healthCheckStatus: response.status,
      healthCheckOk: response.ok,
      canReachSupabase: true,
    };
  } catch {
    diagnostics.supabase = {
      canReachSupabase: false,
    };
  }

  return NextResponse.json(diagnostics, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

