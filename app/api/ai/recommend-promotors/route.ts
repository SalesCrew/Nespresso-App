import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import OpenAI from 'openai'

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(req: Request) {
  console.log('🚀 AI Recommendation Request Started')
  
  try {
    const body = await req.json().catch(() => ({}))
    const assignmentId = body?.assignmentId
    const maxRecommendations = body?.maxRecommendations || 6

    console.log('📋 Request Parameters:', {
      assignmentId,
      maxRecommendations,
      hasApiKey: !!process.env.OPENAI_API_KEY
    })

    if (!assignmentId) {
      console.log('❌ Missing assignmentId')
      return NextResponse.json({ error: 'assignmentId required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ Missing OpenAI API key')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const svc = createSupabaseServiceClient()
    console.log('📊 Database connection established')
    
    // Get assignment details with matched_market_id
    console.log('🎯 Fetching assignment details for ID:', assignmentId)
    const { data: assignment, error: assignmentError } = await svc
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .single()
    
    if (assignmentError || !assignment) {
      console.log('❌ Assignment fetch error:', assignmentError?.message || 'Assignment not found')
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }
    
    console.log('✅ Assignment found:', {
      id: assignment.id,
      title: assignment.title,
      location: assignment.location_text,
      region: assignment.region,
      postal_code: assignment.postal_code,
      start_ts: assignment.start_ts,
      end_ts: assignment.end_ts,
      matched_market_id: assignment.matched_market_id
    })

    // Get matched market details if available
    let matchedMarket: any = null
    let stammPromotorId: string | null = null
    let marketCluster: string | null = null

    if (assignment.matched_market_id) {
      console.log('🏪 Fetching matched market details:', assignment.matched_market_id)
      const { data: market, error: marketError } = await svc
        .from('markets')
        .select('id, name, plz, cluster, stamm_promotor_id, internal_notes')
        .eq('id', assignment.matched_market_id)
        .maybeSingle()
      
      if (market) {
        matchedMarket = market
        stammPromotorId = market.stamm_promotor_id
        marketCluster = market.cluster
        console.log('✅ Matched market found:', {
          id: market.id,
          name: market.name,
          plz: market.plz,
          cluster: market.cluster,
          stammPromotorId: market.stamm_promotor_id
        })
      } else if (marketError) {
        console.log('⚠️ Market fetch error:', marketError.message)
      }
    } else {
      console.log('ℹ️ No matched market for this assignment')
    }

    // Determine target cluster from matched market or assignment PLZ
    let targetCluster: string | null = null
    if (marketCluster) {
      targetCluster = marketCluster
      console.log('🎯 Using cluster from matched market:', targetCluster)
    } else if (assignment.postal_code) {
      // Fallback: determine cluster from assignment PLZ
      targetCluster = getClusterFromPLZ(assignment.postal_code)
      console.log('🎯 Determined cluster from assignment PLZ:', assignment.postal_code, '→', targetCluster)
    } else {
      console.log('⚠️ WARNING: No matched market cluster AND no assignment postal_code!')
      console.log('⚠️ Assignment data:', {
        id: assignment.id,
        postal_code: assignment.postal_code,
        region: assignment.region,
        matched_market_id: assignment.matched_market_id
      })
    }

    // Get all promotors with comprehensive data
    console.log('👥 Fetching promotor users...')
    const { data: users, error: usersError } = await svc
      .from('user_profiles')
      .select('user_id, display_name, phone, role')
      .eq('role', 'promotor')

    if (usersError) {
      console.log('❌ Users fetch error:', usersError.message)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    console.log(`✅ Found ${users?.length || 0} promotor users`)
    const userIds = (users || []).map((u: any) => u.user_id)
    console.log('🔍 User IDs:', userIds.slice(0, 3), userIds.length > 3 ? `... (${userIds.length} total)` : '')
    
    // Get promotor profiles with detailed info
    console.log('📋 Fetching promotor profiles for', userIds.length, 'users...')
    console.log('📋 Sample userIds:', userIds.slice(0, 3))
    
    // Fetch ALL profiles first to check if table has data
    const { data: allProfiles, error: allProfilesError } = await svc
      .from('promotor_profiles')
      .select('user_id, region')
    
    console.log('📊 Total profiles in database:', allProfiles?.length || 0)
    if (allProfilesError) {
      console.log('⚠️ All profiles fetch error:', allProfilesError.message)
    }
    
    // Now fetch filtered profiles
    const { data: profiles, error: profilesError } = await svc
      .from('promotor_profiles')
      .select('user_id, phone, region, postal_code, city, address, working_days, stammmarkt, has_driving_license, has_car')
      .in('user_id', userIds)

    if (profilesError) {
      console.log('⚠️ Profiles fetch error:', profilesError.message, profilesError)
    }
    console.log(`✅ Found ${profiles?.length || 0} promotor profiles matching user IDs`)
    
    // Debug: Check if any profile user_ids match our userIds
    if (allProfiles && allProfiles.length > 0) {
      const profileUserIds = allProfiles.map((p: any) => p.user_id)
      const matchingIds = userIds.filter((id: string) => profileUserIds.includes(id))
      console.log(`🔍 Matching IDs: ${matchingIds.length} of ${userIds.length} users have profiles`)
      if (matchingIds.length === 0 && userIds.length > 0) {
        console.log('⚠️ NO MATCH! Sample profile user_ids:', profileUserIds.slice(0, 3))
        console.log('⚠️ Sample requested user_ids:', userIds.slice(0, 3))
      }
    }
    
    // FALLBACK: If no profiles found, create synthetic profiles from users with default region
    let workingProfiles = profiles || []
    if (workingProfiles.length === 0 && users && users.length > 0) {
      console.log('⚠️ NO PROFILES FOUND! Creating synthetic profiles with default region...')
      workingProfiles = users.map((u: any) => ({
        user_id: u.user_id,
        phone: u.phone || '',
        region: 'wien-noe-bgl', // Default to Wien cluster
        postal_code: '',
        city: '',
        address: '',
        working_days: [],
        stammmarkt: null,
        has_driving_license: false,
        has_car: false
      }))
      console.log(`✅ Created ${workingProfiles.length} synthetic profiles with region="wien-noe-bgl"`)
    }
    
    // DEBUG: Log all promotor regions to see what values are stored
    if (workingProfiles && workingProfiles.length > 0) {
      const regionCounts: { [key: string]: number } = {}
      workingProfiles.forEach((p: any) => {
        const region = p.region || 'NULL/UNDEFINED'
        regionCounts[region] = (regionCounts[region] || 0) + 1
      })
      console.log('📊 Promotor regions breakdown:', regionCounts)
      
      // Log first 5 profiles with their regions
      const sampleProfiles = workingProfiles.slice(0, 5).map((p: any) => {
        const user = (users || []).find((u: any) => u.user_id === p.user_id)
        return `${user?.display_name || 'Unknown'}: region="${p.region || 'NULL'}"`
      })
      console.log('👥 Sample promotor regions:', sampleProfiles.join(' | '))
    }

    // HARD FILTER #1: Cluster Match - Filter promotors by target cluster
    let clusterFilteredProfiles = workingProfiles || []
    console.log(`🎯 Target cluster for filtering: "${targetCluster}"`)
    console.log(`📊 Working profiles count before filter: ${workingProfiles.length}`)
    
    if (targetCluster) {
      // USE workingProfiles (which includes fallback synthetic profiles), NOT the original profiles!
      clusterFilteredProfiles = workingProfiles.filter((p: any) => p.region === targetCluster)
      console.log(`🔍 FILTER #1 - Cluster Match: ${workingProfiles.length} → ${clusterFilteredProfiles.length} (target: ${targetCluster})`)
      
      // Log which promotors survived cluster filter
      const clusterSurvivors = clusterFilteredProfiles.map((p: any) => {
        const user = (users || []).find((u: any) => u.user_id === p.user_id)
        return user?.display_name || 'Unknown'
      })
      console.log('✅ Cluster filter survivors:', clusterSurvivors.length > 0 ? clusterSurvivors.join(', ') : 'NONE')
      
      // If no survivors, log what regions exist vs what we're looking for
      if (clusterFilteredProfiles.length === 0 && workingProfiles.length > 0) {
        const existingRegions = [...new Set(workingProfiles.map((p: any) => p.region || 'NULL'))].join(', ')
        console.log(`⚠️ NO CLUSTER MATCH! Looking for "${targetCluster}" but profiles have: ${existingRegions}`)
      }
    } else {
      console.log('⚠️ No target cluster determined, skipping cluster filter')
    }

    const clusterFilteredUserIds = clusterFilteredProfiles.map((p: any) => p.user_id)

    // Get configured weekly hours from promotor profiles (only for cluster-filtered promotors)
    console.log('📄 Fetching configured weekly hours...')
    const { data: profileHours, error: contractsError } = await svc
      .from('promotor_profiles')
      .select('user_id, contract_hours_per_week')
      .in('user_id', clusterFilteredUserIds)
      .not('contract_hours_per_week', 'is', null)

    if (contractsError) {
      console.log('⚠️ Contracts fetch error:', contractsError.message)
    }
    console.log(`✅ Found ${profileHours?.length || 0} configured weekly-hours entries`)

    // Calculate current calendar week from assignment date
    const assignmentDate = new Date(assignment.start_ts || assignment.date)
    const currentKW = getCalendarWeek(assignmentDate)
    console.log('📅 Assignment date analysis:', {
      assignmentDate: assignmentDate.toISOString(),
      currentKW,
      formattedDate: assignmentDate.toLocaleDateString('de-DE')
    })
    
    // Get week start and end for weekly hours calculation
    const weekStart = getWeekStart(assignmentDate)
    const weekEnd = getWeekEnd(assignmentDate)
    console.log('📊 Current week range:', {
      weekStart: weekStart.toLocaleDateString('de-DE'),
      weekEnd: weekEnd.toLocaleDateString('de-DE'),
      weekKW: currentKW
    })
    
    // Get assignment date for same-day filtering
    const assignmentDateOnly = new Date(assignmentDate.getFullYear(), assignmentDate.getMonth(), assignmentDate.getDate())
    console.log('📅 Assignment date for filtering:', assignmentDateOnly.toLocaleDateString('de-DE'))
    
    // HARD FILTER #2: Same-Day Availability - Filter out promotors with assignments on same day
    console.log('🚫 Fetching same-day assignments to exclude busy promotors...')
    const { data: sameDayAssignments, error: sameDayError } = await svc
      .from('assignment_participants')
      .select(`
        user_id,
        assignments!inner(id, start_ts, end_ts, status, special_status)
      `)
      .in('user_id', clusterFilteredUserIds)
      .gte('assignments.start_ts', assignmentDateOnly.toISOString())
      .lt('assignments.start_ts', new Date(assignmentDateOnly.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .neq('assignments.id', assignmentId) // Exclude the current assignment itself

    if (sameDayError) {
      console.log('⚠️ Same-day assignments fetch error:', sameDayError.message)
    }
    
    // Get promotors with special status assignments (krankenstand within 3 days, others on same day)
    console.log('🏥 Fetching special status assignments to exclude promotors...')
    const threeDaysFromAssignment = new Date(assignmentDateOnly.getTime() + 3 * 24 * 60 * 60 * 1000)
    
    const { data: specialStatusAssignments, error: specialStatusError } = await svc
      .from('assignment_participants')
      .select(`
        user_id,
        assignments!inner(id, start_ts, end_ts, special_status)
      `)
      .in('user_id', clusterFilteredUserIds)
      .not('assignments.special_status', 'is', null)
      .neq('assignments.id', assignmentId)

    if (specialStatusError) {
      console.log('⚠️ Special status assignments fetch error:', specialStatusError.message)
    }

    // Create set of user IDs who are busy on the same day or have special status conflicts
    const busyUserIds = new Set<string>()
    
    // Add users with same-day assignments
    if (sameDayAssignments) {
      sameDayAssignments.forEach((item: any) => {
        busyUserIds.add(item.user_id)
      })
    }
    
    // Add users with conflicting special statuses
    if (specialStatusAssignments) {
      specialStatusAssignments.forEach((item: any) => {
        const assignmentStart = new Date(item.assignments.start_ts)
        const assignmentDateOnlyStart = new Date(assignmentStart.getFullYear(), assignmentStart.getMonth(), assignmentStart.getDate())
        const specialStatus = item.assignments.special_status
        
        if (specialStatus === 'krankenstand') {
          // Krankenstand: exclude if within 3 days of selected assignment
          if (assignmentDateOnlyStart >= assignmentDateOnly && assignmentDateOnlyStart <= threeDaysFromAssignment) {
            busyUserIds.add(item.user_id)
          }
        } else if (['urlaub', 'zeitausgleich'].includes(specialStatus)) {
          // Urlaub/Zeitausgleich: exclude only on same day
          if (assignmentDateOnlyStart.getTime() === assignmentDateOnly.getTime()) {
            busyUserIds.add(item.user_id)
          }
        }
      })
    }
    
    console.log(`🔍 FILTER #2 - Same-Day Availability: ${busyUserIds.size} promotors busy on this day`)
    
    // Log who is busy
    if (busyUserIds.size > 0) {
      const busyNames = Array.from(busyUserIds).map(id => {
        const user = (users || []).find((u: any) => u.user_id === id)
        return user?.display_name || 'Unknown'
      })
      console.log('🚫 Busy promotors:', busyNames.join(', '))
    }
    
    // Filter cluster-filtered users to only available ones
    const availableUserIds = clusterFilteredUserIds.filter((id: string) => !busyUserIds.has(id))
    console.log(`✅ After same-day filter: ${clusterFilteredUserIds.length} → ${availableUserIds.length} available`)
    
    // Log who is available
    if (availableUserIds.length > 0) {
      const availableNames = availableUserIds.map(id => {
        const user = (users || []).find((u: any) => u.user_id === id)
        return user?.display_name || 'Unknown'
      })
      console.log('✅ Available promotors:', availableNames.join(', '))
    }

    // HARD FILTER #3: Weekly Hours - Filter out promotors who have completed their weekly hours
    console.log('⏱️ Fetching current week assignments for workload calculation...')
    const { data: currentWeekAssignments, error: weekAssignmentsError } = await svc
      .from('assignment_participants')
      .select(`
        user_id,
        assignments!inner(id, start_ts, end_ts, status)
      `)
      .in('user_id', availableUserIds)
      .gte('assignments.start_ts', weekStart.toISOString())
      .lte('assignments.start_ts', weekEnd.toISOString())

    if (weekAssignmentsError) {
      console.log('⚠️ Week assignments fetch error:', weekAssignmentsError.message)
    }
    console.log(`✅ Found ${currentWeekAssignments?.length || 0} current week assignment participations`)

    // Create maps for quick lookup
    console.log('🗂️ Creating lookup maps...')
    const profileByUser = new Map(clusterFilteredProfiles.map((p: any) => [p.user_id, p]))
    const contractByUser = new Map((profileHours || []).map((c: any) => [c.user_id, c]))
    console.log(`📋 Profile map: ${profileByUser.size} entries`)
    console.log(`📄 Contract map: ${contractByUser.size} entries`)
    
    // Group current week assignments by user
    console.log('📊 Grouping week assignments by user...')
    const weekAssignmentsByUser = new Map()
    ;(currentWeekAssignments || []).forEach((item: any) => {
      const userId = item.user_id
      if (!weekAssignmentsByUser.has(userId)) {
        weekAssignmentsByUser.set(userId, [])
      }
      weekAssignmentsByUser.get(userId).push(item.assignments)
    })
    console.log(`⏱️ Week assignments grouped for ${weekAssignmentsByUser.size} users`)
    
    // Calculate worked hours and filter by availability
    const weeklyHoursFilteredUserIds: string[] = []
    const weeklyHoursFullUserIds: string[] = []
    
    availableUserIds.forEach((userId: string) => {
      const contract = contractByUser.get(userId)
      const contractHours = contract?.contract_hours_per_week || 0
      
      if (contractHours === 0) {
        // No contract hours defined, include promotor
        weeklyHoursFilteredUserIds.push(userId)
        return
      }
      
      const weekAssignments = weekAssignmentsByUser.get(userId) || []
      const workedHours = calculateWorkedHours(weekAssignments)
      const remainingHours = Math.max(0, contractHours - workedHours)
      
      // Check if promotor has enough remaining hours (at least 6 hours for a typical assignment)
      if (remainingHours >= 6) {
        weeklyHoursFilteredUserIds.push(userId)
      } else {
        weeklyHoursFullUserIds.push(userId)
      }
    })
    
    console.log(`🔍 FILTER #3 - Weekly Hours: ${availableUserIds.length} → ${weeklyHoursFilteredUserIds.length} with available hours`)
    console.log(`⏱️ ${weeklyHoursFullUserIds.length} promotors have full weekly hours`)
    
    // Log who has available hours
    if (weeklyHoursFilteredUserIds.length > 0) {
      const availableHoursNames = weeklyHoursFilteredUserIds.map(id => {
        const user = (users || []).find((u: any) => u.user_id === id)
        const contract = contractByUser.get(id)
        const weekAssignments = weekAssignmentsByUser.get(id) || []
        const worked = calculateWorkedHours(weekAssignments)
        const remaining = Math.max(0, (contract?.contract_hours_per_week || 0) - worked)
        return `${user?.display_name || 'Unknown'} (${remaining}h free)`
      })
      console.log('✅ Promotors with available hours:', availableHoursNames.join(', '))
    }
    
    // Log who has full hours
    if (weeklyHoursFullUserIds.length > 0) {
      const fullHoursNames = weeklyHoursFullUserIds.map(id => {
        const user = (users || []).find((u: any) => u.user_id === id)
        const contract = contractByUser.get(id)
        const weekAssignments = weekAssignmentsByUser.get(id) || []
        const worked = calculateWorkedHours(weekAssignments)
        const remaining = Math.max(0, (contract?.contract_hours_per_week || 0) - worked)
        return `${user?.display_name || 'Unknown'} (${remaining}h free)`
      })
      console.log('⏱️ Promotors with full hours:', fullHoursNames.join(', '))
    }
    
    // BACKUP: If ALL promotors are filtered out due to weekly hours, disable this filter
    let finalFilteredUserIds = weeklyHoursFilteredUserIds
    if (weeklyHoursFilteredUserIds.length === 0 && availableUserIds.length > 0) {
      console.log('⚠️ BACKUP ACTIVATED: All promotors filtered by weekly hours, disabling this filter')
      finalFilteredUserIds = availableUserIds
      
      // Log backup survivors
      const backupNames = finalFilteredUserIds.map(id => {
        const user = (users || []).find((u: any) => u.user_id === id)
        return user?.display_name || 'Unknown'
      })
      console.log('🆘 Backup mode - including all available promotors:', backupNames.join(', '))
    }
    
    console.log(`✅ Final filtered promotors: ${finalFilteredUserIds.length}`)
    
    // Filter users to only those who passed all hard filters
    const filteredUsers = (users || []).filter((u: any) => finalFilteredUserIds.includes(u.user_id))
    
    // Final summary of who will be sent to AI
    const finalNames = filteredUsers.map(u => u.display_name).join(', ')
    console.log(`🎯 Promotors being sent to AI for evaluation: ${finalNames || 'NONE'}`)
    
    // EARLY RETURN if no promotors after filters
    if (filteredUsers.length === 0) {
      console.log('❌ NO PROMOTORS AFTER ALL FILTERS!')
      console.log('📊 Filter summary:', {
        totalUsers: users?.length || 0,
        dbProfiles: profiles?.length || 0,
        workingProfiles: workingProfiles.length,
        afterClusterFilter: clusterFilteredProfiles.length,
        afterSameDayFilter: availableUserIds.length,
        afterWeeklyHoursFilter: weeklyHoursFilteredUserIds.length,
        finalFilteredUserIds: finalFilteredUserIds.length,
        targetCluster
      })
      
      return NextResponse.json({
        success: true,
        assignmentId,
        recommendations: [],
        timestamp: new Date().toISOString(),
        source: 'no-candidates',
        debug: {
          message: 'All promotors filtered out by hard filters',
          totalUsers: users?.length || 0,
          dbProfiles: profiles?.length || 0,
          workingProfiles: workingProfiles.length,
          afterClusterFilter: clusterFilteredProfiles.length,
          afterSameDayFilter: availableUserIds.length,
          afterWeeklyHoursFilter: weeklyHoursFilteredUserIds.length,
          finalFiltered: finalFilteredUserIds.length,
          targetCluster,
          hasMatchedMarket: !!matchedMarket,
          existingRegions: workingProfiles.length > 0 ? [...new Set(workingProfiles.map((p: any) => p.region || 'NULL'))].join(', ') : 'NO PROFILES'
        }
      })
    }
    
    console.log(`👥 Building comprehensive promotor data for ${filteredUsers.length} promotors...`)
    const promotors = filteredUsers.map((u: any, index: number) => {
      const profile = profileByUser.get(u.user_id) as any
      const contract = contractByUser.get(u.user_id) as any
      const weekAssignments = weekAssignmentsByUser.get(u.user_id) || []
      
      // Calculate worked hours this week
      const workedHours = calculateWorkedHours(weekAssignments)
      const contractHours = contract?.contract_hours_per_week || 0
      const remainingHours = Math.max(0, contractHours - workedHours)
      
      const promotorData = {
        ...u,
        phone: profile?.phone || u.phone || '+43 123 456 789',
        region: profile?.region || 'wien-noe-bgl',
        postal_code: profile?.postal_code || '',
        city: profile?.city || '',
        address: profile?.address || '', // Full address for distance calculation
        working_days: profile?.working_days || [],
        contract_hours_per_week: contractHours,
        worked_hours_this_week: workedHours,
        remaining_hours_this_week: remainingHours,
        current_week_assignments: weekAssignments.length,
        stammmarkt: profile?.stammmarkt || null,
        has_driving_license: profile?.has_driving_license || false,
        has_car: profile?.has_car || false,
        // Flag if this is the Stammpromotor for the matched market
        is_stammpromotor: stammPromotorId === u.user_id
      }
      
      if (index < 3) {
        console.log(`👤 Promotor ${index + 1}: ${promotorData.display_name}`, {
          region: promotorData.region,
          contractHours: promotorData.contract_hours_per_week,
          workedHours: promotorData.worked_hours_this_week,
          remainingHours: promotorData.remaining_hours_this_week,
          weekAssignments: promotorData.current_week_assignments,
          isStammpromotor: promotorData.is_stammpromotor
        })
      }
      
      return promotorData
    })
    
    console.log(`✅ Built data for ${promotors.length} promotors`)
    
    // Check if Stammpromotor is available
    let stammpromotorData: any = null
    if (stammPromotorId) {
      stammpromotorData = promotors.find((p: any) => p.user_id === stammPromotorId)
      if (stammpromotorData) {
        console.log('✅ Stammpromotor is AVAILABLE:', stammpromotorData.display_name)
      } else {
        console.log('⚠️ Stammpromotor is NOT available (filtered out or not in cluster)')
      }
    }

    // Get date range for context (4 weeks before/after)
    const contextStartDate = new Date(assignmentDate)
    contextStartDate.setDate(contextStartDate.getDate() - 28)
    const contextEndDate = new Date(assignmentDate) 
    contextEndDate.setDate(contextEndDate.getDate() + 28)

    console.log('🕰️ Context date range:', {
      contextStart: contextStartDate.toLocaleDateString('de-DE'),
      contextEnd: contextEndDate.toLocaleDateString('de-DE')
    })

    // Get assignment history for context (4 weeks before/after current assignment)
    console.log('📚 Fetching assignment history...')
    const { data: assignmentHistory, error: historyError } = await svc
      .from('assignments')
      .select('id, title, location_text, postal_code, region, start_ts, end_ts, status, notes')
      .gte('start_ts', contextStartDate.toISOString())
      .lte('start_ts', contextEndDate.toISOString())
      .order('start_ts', { ascending: true })

    if (historyError) {
      console.log('⚠️ Assignment history fetch error:', historyError.message)
    }
    console.log(`✅ Found ${assignmentHistory?.length || 0} historical assignments`)

    // Helper functions
    function getCalendarWeek(date: Date): number {
      const target = new Date(date.valueOf())
      const dayNr = (date.getDay() + 6) % 7
      target.setDate(target.getDate() - dayNr + 3)
      const firstThursday = target.valueOf()
      target.setMonth(0, 1)
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7)
      }
      return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000)
    }

    function getWeekStart(date: Date): Date {
      const start = new Date(date)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      return start
    }

    function getWeekEnd(date: Date): Date {
      const end = new Date(date)
      const day = end.getDay()
      const diff = end.getDate() - day + (day === 0 ? 0 : 7)
      end.setDate(diff)
      end.setHours(23, 59, 59, 999)
      return end
    }

    function calculateWorkedHours(assignments: any[]): number {
      return assignments.reduce((total, assignment) => {
        if (assignment.status === 'cancelled') return total
        
        const start = new Date(assignment.start_ts)
        const end = new Date(assignment.end_ts)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        
        // Subtract 1 hour break for assignments longer than 6 hours
        const workingHours = hours > 6 ? hours - 1 : hours
        return total + workingHours
      }, 0)
    }


    // Prepare comprehensive data for AI analysis
    const assignmentData = {
      id: assignment.id,
      title: assignment.title,
      location_text: assignment.location_text,
      postal_code: assignment.postal_code,
      city: assignment.city || '',
      address: assignment.address || assignment.location_text, // Full address for distance calculation
      region: assignment.region,
      start_ts: assignment.start_ts,
      end_ts: assignment.end_ts,
      date: assignmentDate.toLocaleDateString('de-DE'),
      time: `${assignmentDate.toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})} - ${new Date(assignment.end_ts).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}`,
      duration_hours: (new Date(assignment.end_ts).getTime() - assignmentDate.getTime()) / (1000 * 60 * 60),
      calendar_week: currentKW,
      notes: assignment.notes,
      status: assignment.status
    }

    const promotorData = (promotors || []).map((p: any) => ({
      id: p.user_id,
      name: p.display_name,
      phone: p.phone,
      region: p.region,
      postal_code: p.postal_code,
      city: p.city,
      address: p.address,
      working_days: p.working_days,
      contract_hours_per_week: p.contract_hours_per_week,
      worked_hours_this_week: p.worked_hours_this_week,
      remaining_hours_this_week: p.remaining_hours_this_week,
      current_week_assignments: p.current_week_assignments,
      stammmarkt: p.stammmarkt,
      has_driving_license: p.has_driving_license,
      has_car: p.has_car
    }))

    // Check for assignment restrictions in notes
    console.log('🚫 Checking assignment restrictions...')
    const assignmentRestrictions = extractRestrictions(assignment.notes || '')
    console.log('🚫 Assignment restrictions:', assignmentRestrictions.length > 0 ? assignmentRestrictions : 'None found')
    
    // Prepare assignment history context (4 weeks before/after)
    console.log('📚 Preparing assignment context...')
    const assignmentContext = (assignmentHistory || []).map((hist: any) => ({
      id: hist.id,
      location_text: hist.location_text,
      postal_code: hist.postal_code,
      region: hist.region,
      date: new Date(hist.start_ts).toLocaleDateString('de-DE'),
      status: hist.status,
      calendar_week: getCalendarWeek(new Date(hist.start_ts)),
      notes: hist.notes
    }))
    console.log(`📚 Assignment context: ${assignmentContext.length} assignments over 8 weeks`)

    function extractRestrictions(notes: string): string[] {
      if (!notes) return []
      const restrictions: string[] = []
      
      // Look for "nicht [name]" patterns in notes
      const matches = notes.match(/nicht\s+([A-Za-zÄÖÜäöüß\s]+)/gi)
      if (matches) {
        matches.forEach(match => {
          const name = match.replace(/nicht\s+/i, '').trim()
          if (name) restrictions.push(name)
        })
      }
      
      return restrictions
    }

    // Call GPT-5 chat-latest for recommendations
    console.log('🤖 Calling GPT-5 chat-latest for AI analysis...')
    console.log('📤 AI request parameters:', {
      model: 'gpt-5-chat-latest',
      temperature: 0.6,
      promotorCount: promotorData.length,
      assignmentKW: currentKW,
      hasStammpromotor: !!stammpromotorData,
      hasRestrictions: assignmentRestrictions.length > 0,
      contextAssignments: assignmentContext.length
    })
    
    try {
      // GPT-5 chat-latest uses Chat Completions API (like Eddie)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-5-chat-latest',
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            {
              role: 'system',
              content: `Du bist GPT-5 und wirkst in diesem System als deterministischer Einsatz-Matcher für Nespresso-Promotions. Pro Aufruf erhältst du strukturierte Informationen zu genau einem Einsatz sowie eine Liste von Promotor:innen mit aktuellen Daten der Kalenderwoche. 

WICHTIG: Die Liste der Promotor:innen wurde bereits hart gefiltert und enthält NUR Personen, die:
1. Im EXAKT GLEICHEN Cluster/Bundesland wie der Einsatz sind (harte Vorfilterung)
2. Am Tag des Einsatzes VERFÜGBAR sind (keine anderen Einsätze, keine Krankenstände, keine Urlaube)
3. Genug verbleibende Wochenstunden haben (oder es gibt KEINE anderen verfügbaren Promotor:innen)

STAMMPROMOTOR PRIORITÄT (HÖCHSTE PRIORITÄT):
- Wenn ein Promotor das Feld "is_stammpromotor: true" hat, bedeutet dies, dass dieser Markt sein STAMMMARKT ist
- Ein Stammpromotor MUSS IMMER auf Rank 1 gesetzt werden, sofern verfügbar
- Dies hat ABSOLUTEN VORRANG vor allen anderen Kriterien

grobe regeln
- Nutze ausschließlich die übergebenen Angaben
- Erfinde NICHTS, nutze keine externen Quellen
- Führe keine Nebenaufgaben aus
- Die Cluster-Filterung wurde bereits durchgeführt - alle Promotor:innen in der Liste sind im richtigen Cluster
- Die Verfügbarkeitsprüfung wurde bereits durchgeführt - alle Promotor:innen in der Liste sind am Tag verfügbar
- EINDEUTIGKEIT: Jede/r Promotor:in darf nur EINMAL in den Empfehlungen erscheinen - keine Duplikate!
- Prüfe Eignung: verbleibende Wochenstunden, Skills/Notizen, Zuverlässigkeit/Erfahrung, faire Stundenverteilung
- Bewerte nach: Stammpromotor-Match (höchste Priorität!), Nähe/Anreise, Skills, Zuverlässigkeit
- Löse Gleichstände strikt deterministisch (alphabetische Reihenfolge bei gleicher Bewertung)

STRIKTE REGELN WICHTIG!!!!
⦁ **STAMMPROMOTOR HAT OBERSTE PRIORITÄT**: Wenn ein Promotor "is_stammpromotor: true" hat, MUSS dieser auf Rank 1 gesetzt werden. Dies überschreibt alle anderen Kriterien.

⦁ Die Stunden pro Woche jedes Promotors stehen im Dienstvertrag; diese Info wird zur Verfügung gestellt. Die offenen Stunden sind bereits berechnet (remaining_hours_this_week). Einsätze 9:30–18:30 zählen als 8 Stunden (1 Stunde Pause), Einsätze 9:30–15:30 zählen als 6 Stunden (keine Pause).

⦁ STANDARDISIERTE REASONING-STRUKTUR: Jede Empfehlung MUSS diese exakte Reihenfolge einhalten:
  1. STAMMPROMOTOR-CHECK: Falls is_stammpromotor=true: "✓ STAMMPROMOTOR - Dieser Markt ist der Stammmarkt von [Name]"
  2. CLUSTER-MATCH: "Cluster: [Promotor-Cluster] (bereits vorgeprüft ✓)"
  3. VERFÜGBARKEIT: "Verfügbar am [Datum] (bereits vorgeprüft ✓)"
  4. WOCHENSTUNDEN: "Stunden: [gearbeitet]h/[geplant]h (noch [verfügbar]h frei)"
  5. WEITERE EIGNUNG: Kurze zusätzliche Begründung (Nähe, Erfahrung, etc.)

⦁ Für Strecken, die zu lang für öffentliche Verkehrsmittel sind, PRÜFE zwingend, ob die Promotoren Führerschein und Auto haben, und schlage BEVORZUGT diese vor.

AUSGABEFORMAT:
Antworte ausschließlich mit einem JSON-Array mit maximal ${maxRecommendations} Einträgen. Falls weniger als ${maxRecommendations} geeignete Promotor:innen gefunden werden, ist es völlig in Ordnung, weniger Empfehlungen zurückzugeben:
[
  {
    "keyword": "promotor_[erste8ZeichenDerID]",
    "promotorName": "Vollständiger Name",
    "promotorId": "string",
    "phone": "string", 
    "confidence": number zwischen 0.0 und 1.0,
    "rank": number von 1 bis zur Anzahl der tatsächlichen Empfehlungen,
    "reasoning": "Standardisierte Begründung: 1) Stammpromotor-Check (falls zutreffend), 2) Cluster-Match (vorgeprüft), 3) Verfügbarkeit (vorgeprüft), 4) Wochenstunden, 5) weitere Eignung."
  }
]

EINSATZ (KW ${currentKW}):
${JSON.stringify(assignmentData, null, 2)}

${matchedMarket ? `
MATCHED MARKET INFO:
Market Name: ${matchedMarket.name}
Market PLZ: ${matchedMarket.plz}
Market Cluster: ${matchedMarket.cluster}
${stammPromotorId ? `Stammpromotor ID: ${stammPromotorId} (MUSS auf Rank 1 wenn in Liste!)` : 'Kein Stammpromotor definiert'}
${matchedMarket.internal_notes ? `Market Interne Notizen: ${matchedMarket.internal_notes}` : ''}
` : 'Kein Market Match für diesen Einsatz'}

INTERNE NOTIZEN (SEKUNDÄRE BERÜCKSICHTIGUNG):
Diese Notizen sind KEINE harten Filter, sondern zusätzliche Kontextinformationen. Berücksichtige sie NUR wenn sie relevante Hinweise zu Promotor-Eignung enthalten (z.B. "nicht Person X", "war unzufrieden mit Y", "Person Z sehr gut hier").
- Einsatz SC-Interne Notizen: ${assignment.notes || 'Keine'}
- Market Interne Notizen: ${matchedMarket?.internal_notes || 'Keine'}

VERFÜGBARE PROMOTOR:INNEN (bereits hart gefiltert nach Cluster, Verfügbarkeit, Wochenstunden):
${JSON.stringify(promotorData, null, 2)}

ASSIGNMENT RESTRICTIONS:
${assignmentRestrictions.length > 0 ? JSON.stringify(assignmentRestrictions, null, 2) : 'Keine Einschränkungen'}

ASSIGNMENT CONTEXT (4 Wochen vorher/nachher):
${JSON.stringify(assignmentContext, null, 2)}

WICHTIGE PRÜFKRITERIEN:
1. STAMMPROMOTOR:
   - Falls ein Promotor is_stammpromotor=true hat → ZWINGEND auf Rank 1 setzen
   - Dies hat ABSOLUTEN VORRANG vor allen anderen Kriterien
   
2. HARTE EIGNUNG (bereits vorgeprüft):
   - ✓ Cluster/Bundesland-Match (alle in der Liste sind im richtigen Cluster)
   - ✓ Verfügbarkeit am Tag (alle in der Liste sind am Tag frei)
   - ✓ Wochenstunden (alle in der Liste haben ausreichend Stunden, außer es gibt keine Alternative)
   
3. BEWERTUNGSKRITERIEN:
   - Nähe/Anreise (postal_code, address Vergleich)
   - Faire Stundenverteilung (weniger Assignments diese Woche bevorzugen)
   - Erfahrung in ähnlichen Märkten (assignment context berücksichtigen)
   
4. INTERNE NOTIZEN (sekundär, nur wenn relevant):
   - Prüfe die SC-Internen Notizen und Market-Notizen auf Hinweise wie "nicht [Name]", "unzufrieden mit [Name]", "[Name] sehr gut"
   - Falls eine Notiz einen Promotor negativ erwähnt → ranke diese Person NIEDRIGER oder schließe sie aus
   - Falls eine Notiz einen Promotor positiv erwähnt → ranke diese Person HÖHER
   - Ignoriere Notizen die keine Relevanz für die Promotor-Auswahl haben
   
5. DETERMINISTISCHE RANGFOLGE:
   - Bei Gleichstand: alphabetische Reihenfolge nach Name
   
Analysiere und empfehle die besten Promotor:innen für KW ${currentKW}. Maximum: ${maxRecommendations} Empfehlungen. Falls weniger geeignete Kandidaten verfügbar sind, gib entsprechend weniger zurück.`
            },
            {
              role: 'user',
              content: `Bitte analysiere die Promotor:innen für diesen Einsatz und gib JSON-Empfehlungen zurück.`
            }
          ]
        })
      })

      console.log('🌐 GPT-5 Response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ GPT-5 API error:', errorText)
        throw new Error(`GPT-5 API error: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      console.log('📥 GPT-5 Response structure:', {
        hasChoices: Array.isArray(result?.choices),
        choiceCount: result?.choices?.length || 0,
        responseId: result?.id
      })

      // Extract AI response from Chat Completions format
      const aiResponseText: string = result?.choices?.[0]?.message?.content || ''

      console.log('📥 Raw AI response received:', {
        hasResponse: !!aiResponseText,
        responseLength: aiResponseText.length
      })
      
      if (!aiResponseText) {
        console.log('❌ No response content from GPT-5')
        throw new Error('No response from GPT-5')
      }

      const preview = aiResponseText.slice(0, 200)
      console.log('🔍 AI Response Preview:', preview + '...')

      // Parse AI response
      let recommendations: any[]
      try {
        console.log('🔄 Parsing AI JSON response...')
        const parsed = JSON.parse(aiResponseText)
        recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations || []
        console.log(`✅ Successfully parsed ${recommendations.length} recommendations`)
      } catch (parseError) {
        console.error('❌ Failed to parse AI response:', parseError)
        console.error('📄 Raw response that failed to parse:', aiResponseText)
        throw new Error('Invalid AI response format')
      }

      // Validate and sanitize recommendations
      console.log('🔍 Validating and sanitizing recommendations...')
      let validRecommendations = recommendations
        .slice(0, maxRecommendations)
        .map((rec: any, index: number) => {
          const validated = {
            keyword: rec.keyword || `promotor_${rec.promotorId?.slice(0, 8) || index}`,
            promotorName: rec.promotorName || 'Unknown',
            promotorId: rec.promotorId || '',
            phone: rec.phone || '',
            confidence: Math.max(0.0, Math.min(1.0, Number(rec.confidence) || 0.5)),
            rank: rec.rank || (index + 1),
            reasoning: rec.reasoning || 'AI recommendation'
          }
          
          if (index < 3) {
            console.log(`🏆 Recommendation ${index + 1}:`, {
              rank: validated.rank,
              name: validated.promotorName,
              confidence: validated.confidence,
              reasoning: validated.reasoning.substring(0, 50) + '...'
            })
          }
          
          return validated
        })

      // ENFORCE STAMMPROMOTOR PRIORITY: If stammpromotor is in recommendations but not rank 1, move to rank 1
      if (stammpromotorData) {
        const stammIndex = validRecommendations.findIndex((r: any) => r.promotorId === stammPromotorId)
        if (stammIndex > 0) {
          console.log(`⚠️ Stammpromotor found at rank ${stammIndex + 1}, moving to rank 1`)
          const stammRec = validRecommendations[stammIndex]
          validRecommendations.splice(stammIndex, 1)
          validRecommendations.unshift(stammRec)
          // Re-rank all recommendations
          validRecommendations = validRecommendations.map((r: any, idx: number) => ({
            ...r,
            rank: idx + 1
          }))
          console.log(`✅ Stammpromotor now at rank 1: ${stammRec.promotorName}`)
        } else if (stammIndex === 0) {
          console.log(`✅ Stammpromotor already at rank 1: ${stammpromotorData.display_name}`)
        } else {
          console.log(`ℹ️ Stammpromotor not in AI recommendations (might not be best match based on other criteria)`)
        }
      }

      console.log(`✅ Final recommendations count: ${validRecommendations.length}`)
      console.log('🎯 AI recommendation process completed successfully')

      return NextResponse.json({ 
        success: true,
        assignmentId,
        recommendations: validRecommendations,
        timestamp: new Date().toISOString(),
        source: 'gpt-5-chat-latest',
        debug: {
          totalPromotors: promotors.length,
          calendarWeek: currentKW,
          restrictionsFound: assignmentRestrictions.length,
          contextAssignments: assignmentContext.length,
          hasStammpromotor: !!stammpromotorData,
          stammpromotorInResults: !!stammpromotorData && validRecommendations.some((r: any) => r.promotorId === stammPromotorId)
        }
      })

    } catch (aiError: any) {
      console.error('❌ AI API Error:', aiError)
      console.log('🔄 Falling back to mock recommendations...')
      
      // Fallback to mock data if AI fails
      const fallbackRecommendations = (promotors || [])
        .slice(0, maxRecommendations)
        .map((promotor: any, index: number) => ({
          keyword: `promotor_${promotor.user_id.slice(0, 8)}`,
          promotorName: promotor.display_name,
          promotorId: promotor.user_id,
          phone: promotor.phone,
          confidence: Math.max(0.6, 1 - (index * 0.1)),
          rank: index + 1,
          reasoning: `Fallback recommendation (AI unavailable: ${aiError.message})`
        }))

      console.log(`🆘 Fallback completed with ${fallbackRecommendations.length} recommendations`)

      return NextResponse.json({ 
        success: true,
        assignmentId,
        recommendations: fallbackRecommendations,
        timestamp: new Date().toISOString(),
        source: 'fallback',
        error: `AI error: ${aiError.message}`,
        debug: {
          totalPromotors: promotors.length,
          calendarWeek: currentKW,
          restrictionsFound: assignmentRestrictions.length,
          contextAssignments: assignmentContext.length,
          aiErrorType: aiError.constructor.name
        }
      })
    }

  } catch (e: any) {
    console.error('❌ Critical AI recommendation error:', e)
    console.error('📊 Error stack:', e.stack)
    return NextResponse.json({ 
      error: e?.message || 'Server error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function to map PLZ to cluster (same logic as in einsatzplan page)
function getClusterFromPLZ(plz: string): string {
  const plzNum = parseInt(plz);
  if (isNaN(plzNum)) return 'wien-noe-bgl';
  
  // W/NÖ/BGL cluster (W, N, B initials)
  if (plzNum >= 1000 && plzNum <= 1610) return 'wien-noe-bgl'; // Vienna
  if (plzNum >= 2000 && plzNum <= 3999) {
    // Special Burgenland ranges within this area
    if ((plzNum >= 2421 && plzNum <= 2425) || (plzNum >= 2473 && plzNum <= 2475) || plzNum === 2491) return 'wien-noe-bgl';
    // Special OÖ ranges
    if (plzNum >= 3334 && plzNum <= 3335) return 'oberoesterreich';
    return 'wien-noe-bgl'; // Most is Niederösterreich
  }
  
  // OÖ (O initial)
  if (plzNum >= 4000 && plzNum <= 4999) {
    // Special Niederösterreich codes in this range
    if (plzNum === 4300 || plzNum === 4303 || (plzNum >= 4431 && plzNum <= 4432) || 
        plzNum === 4441 || plzNum === 4482 || plzNum === 4392) return 'wien-noe-bgl';
    return 'oberoesterreich';
  }
  
  // Mixed Salzburg (Sa) and OÖ (O)
  if (plzNum >= 5000 && plzNum <= 5999) {
    // OÖ ranges in 5xxx area
    if ((plzNum >= 5120 && plzNum <= 5145) || plzNum === 5166 || 
        (plzNum >= 5211 && plzNum <= 5283) || plzNum === 5310 || 
        plzNum === 5311 || plzNum === 5360) return 'oberoesterreich';
    return 'salzburg'; // Salzburg
  }
  
  // Tirol (T) and Vorarlberg (V)
  if (plzNum >= 6000 && plzNum <= 6999) {
    if (plzNum >= 6700) return 'vorarlberg'; // Vorarlberg
    return 'tirol'; // Tirol
  }
  
  // Burgenland (B) range
  if (plzNum >= 7000 && plzNum <= 7999) {
    if (plzNum === 7421) return 'steiermark'; // Special Steiermark code
    return 'wien-noe-bgl'; // Burgenland
  }
  
  // Steiermark (St)
  if (plzNum >= 8000 && plzNum <= 8999) {
    // Special Burgenland ranges in this area
    if (plzNum >= 8380 && plzNum <= 8385) return 'wien-noe-bgl';
    return 'steiermark'; // Steiermark
  }
  
  // Kärnten (K) and some Tirol (T)
  if (plzNum >= 9000 && plzNum <= 9999) {
    if (plzNum === 9323) return 'steiermark'; // Special Steiermark
    if (plzNum === 9782 || plzNum >= 9900) return 'tirol'; // Tirol codes
    return 'kaernten'; // Kärnten
  }
  
  return 'wien-noe-bgl';
}
