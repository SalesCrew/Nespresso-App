import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/routeGuards';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    const result = await requireAdmin();
    if (!result.ok) return result.response;
    return NextResponse.json({
      success: true,
      role: result.role
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'diagnostic failed'
    }, { status: 500 });
  }
}
