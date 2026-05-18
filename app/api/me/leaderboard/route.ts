import { NextResponse } from 'next/server'
import { createSupabaseServerClientAsync } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  try {
    const server = await createSupabaseServerClientAsync()
    const { data: { user } } = await server.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const timeframe = searchParams.get('timeframe') || '30days'

    const svc = createSupabaseServiceClient()

    // Fetch all KPI feedback
    const { data: allFeedback, error } = await svc
      .from('kpi_feedback')
      .select('user_id, mc_et, tma, vl_value, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching KPI feedback for leaderboard:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!allFeedback || allFeedback.length === 0) {
      return NextResponse.json({ leaderboard: [], currentUserData: null })
    }

    // Group feedback by user_id
    const userFeedbackMap = new Map<string, any[]>()
    allFeedback.forEach((item: any) => {
      if (!userFeedbackMap.has(item.user_id)) {
        userFeedbackMap.set(item.user_id, [])
      }
      userFeedbackMap.get(item.user_id)!.push(item)
    })

    // Calculate stats for each user based on timeframe
    const leaderboardData: any[] = []
    
    userFeedbackMap.forEach((feedback, userId) => {
      // Sort by created_at descending (newest first)
      const sortedFeedback = feedback.sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      let mcet: number, tma: number, vlshare: number

      if (timeframe === '30days') {
        // Latest wave only (most recent entry)
        const latest = sortedFeedback[0]
        mcet = latest.mc_et
        tma = latest.tma
        vlshare = latest.vl_value
      } else if (timeframe === '6months') {
        // Average of last 6 waves (or fewer if less than 6 exist)
        const last6 = sortedFeedback.slice(0, Math.min(6, sortedFeedback.length))
        mcet = last6.reduce((sum, item) => sum + item.mc_et, 0) / last6.length
        tma = last6.reduce((sum, item) => sum + item.tma, 0) / last6.length
        vlshare = last6.reduce((sum, item) => sum + item.vl_value, 0) / last6.length
      } else {
        // All time average
        mcet = sortedFeedback.reduce((sum, item) => sum + item.mc_et, 0) / sortedFeedback.length
        tma = sortedFeedback.reduce((sum, item) => sum + item.tma, 0) / sortedFeedback.length
        vlshare = sortedFeedback.reduce((sum, item) => sum + item.vl_value, 0) / sortedFeedback.length
      }

      leaderboardData.push({
        user_id: userId,
        mcet,
        tma,
        vlshare,
        isCurrentUser: userId === user.id
      })
    })

    // Find current user's data
    const currentUserData = leaderboardData.find(u => u.isCurrentUser) || null

    return NextResponse.json({ 
      leaderboard: leaderboardData,
      currentUserData 
    })
  } catch (e: any) {
    console.error('Server error:', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

