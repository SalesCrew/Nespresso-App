"use client"

// non-reactive: housekeeping marker to trigger deploy (no functional changes)
import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, ArrowLeft, ChevronDown, ChevronUp, X, BarChart2, History, Info, Eye, Trophy, User } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import MonthlyMetricsPromotor from "@/components/statistiken/MonthlyMetricsPromotor"

export default function StatistikenPage() {
  // Add navigation state for CA KPIs vs Mystery Shop
  const [activeSection, setActiveSection] = useState<"ca-kpis" | "mystery-shop">("ca-kpis")
  
  const [timeFrame, setTimeFrame] = useState<"30days" | "6months" | "alltime">("30days")
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [historyPage, setHistoryPage] = useState(0)
  const entriesPerPage = 15
  const [showInfoContent, setShowInfoContent] = useState(false)
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<number | null>(null)
  const [showNewFeedback, setShowNewFeedback] = useState(false)
  const [feedbackRead, setFeedbackRead] = useState(false)
  const [feedbackData, setFeedbackData] = useState<any>(null)

  // Mystery Shop specific state
  const [mysteryTimeFrame, setMysteryTimeFrame] = useState<"30days" | "6months" | "alltime">("30days")
  const [mysteryFeedbackOpen, setMysteryFeedbackOpen] = useState(false)
  const mysteryFeedbackRef = useRef<HTMLDivElement>(null)
  const [mysteryHistoryExpanded, setMysteryHistoryExpanded] = useState(false)
  const [mysteryHistoryPage, setMysteryHistoryPage] = useState(0)
  const [mysteryShowInfoContent, setMysteryShowInfoContent] = useState(false)
  const [mysterySelectedHistoryEntry, setMysterySelectedHistoryEntry] = useState<number | null>(null)
  const [mysteryShowNewFeedback, setMysteryShowNewFeedback] = useState(true)
  const [mysteryFeedbackRead, setMysteryFeedbackRead] = useState(false)
  
  // Premium popup state
  const [showPremiumPopup, setShowPremiumPopup] = useState(false)
  
  // Sales challenge state
  const [challengeCompleted, setChallengeCompleted] = useState(false)
  const [challengeCongratulationsRead, setChallengeCongratulationsRead] = useState(false)
  const [challengeCardDismissed, setChallengeCardDismissed] = useState(false)
  const [showChallengePrizes, setShowChallengePrizes] = useState(false)
  
  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [leaderboardCategory, setLeaderboardCategory] = useState<"mcet" | "tma" | "vlshare">("mcet")
  
  // Fetch leaderboard when timeframe changes
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`/api/me/leaderboard?timeframe=${timeFrame}`)
        if (res.ok) {
          const data = await res.json()
          setRealLeaderboardData(data.leaderboard || [])
          setCurrentUserData(data.currentUserData || null)
        }
      } catch (e) {
        console.error('Failed to fetch leaderboard:', e)
      }
    }
    fetchLeaderboard()
  }, [timeFrame])

  // Reset scroll to top when changing leaderboard category
  useEffect(() => {
    const leaderboardContainer = document.querySelector('.leaderboard-scroll-container')
    if (leaderboardContainer) {
      leaderboardContainer.scrollTop = 0
    }
  }, [leaderboardCategory])

  // State for real KPI history data from database
  const [realHistoryData, setRealHistoryData] = useState<any[]>([])
  const [historyDataLoading, setHistoryDataLoading] = useState(true)
  const [realLeaderboardData, setRealLeaderboardData] = useState<any[]>([])
  const [currentUserData, setCurrentUserData] = useState<any>(null)


  // Fetch unread KPI feedback and all history on mount
  useEffect(() => {
    const fetchKPIData = async () => {
      try {
        // Fetch unread feedback
        const unreadRes = await fetch('/api/me/kpi-feedback')
        if (unreadRes.ok) {
          const unreadData = await unreadRes.json()
          if (unreadData.feedback) {
            setFeedbackData(unreadData.feedback)
            setShowNewFeedback(true)
          }
        }

        // Fetch all KPI feedback history for this promotor
        const historyRes = await fetch('/api/me/kpi-feedback-history')
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          if (historyData.feedback && historyData.feedback.length > 0) {
            // Sort by created_at descending (newest first)
            const sortedFeedback = historyData.feedback.sort((a: any, b: any) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )
            
            // Map to expected format
            const mappedHistory = sortedFeedback.map((item: any) => ({
              date: new Date(item.created_at),
              mcet: item.mc_et,
              tma: item.tma,
              vl: item.vl_value,
              feedback_text: item.feedback_text
            }))
            
            setRealHistoryData(mappedHistory)
          }
        }
      } catch (e) {
        console.error('Failed to fetch KPI data:', e)
      } finally {
        setHistoryDataLoading(false)
      }
    }
    fetchKPIData()
  }, [])
  
  // Feedback texts for history entries
  const feedbackTexts = [
    // For newest month - use existing feedback
    `Liebe Eveline,

ich darf dir heute deine Mai KPIs zukommen lassen.

Trotz der Herausforderungen, die der Frühling mit sich bringt, machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Mai-Zahlen:

MC/ET: 1.8 (Platz 51)
TMA Anteil: 91%
VL Share: 20% (Platz 7)

Du bist im Bereich "VL Share" auf einem beeindruckenden Platz 7. Das zeigt, dass du einen hervorragenden Beitrag leistest, unsere Vertuo-Reihe zu fördern. Beim "TMA Anteil" gehörst du zu den Besten, was eine tolle Leistung ist. Im Bereich "MC/ET" bist du aktuell auf Platz 51. Hier gibt es sicherlich noch Potenzial nach oben, um deine Verkäufe an Kaffeemaschinen pro Einsatztag zu steigern.

Bleib dran und lass uns gemeinsam weiter daran arbeiten, die Verkaufszahlen zu verbessern.

Liebe Grüße, dein Nespresso Team.`,
    // Template 1
    `Liebe Gertrud,

ich darf dir heute deine Mai KPIs zukommen lassen.

Trotz der aktuellen Herausforderungen machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Mai-Zahlen:

MC/ET: 4.0 (Platz 4)  
TMA Anteil: 70%  
VL Share: 19% (Platz 3)

Du bist diesen Monat in den Bereichen MC/ET und VL Share unter den Top 3. Das ist eine großartige Leistung und zeigt, wie engagiert du bist. Beim TMA-Anteil bist du im Mittelfeld, da gibt es sicherlich noch Potenzial nach oben. Deine konstanten Ergebnisse sind beeindruckend, bleib dran!

Solltest du noch Tipps und Tricks brauchen, kannst du dich jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team`,
    // Template 2
    `Lieber Johann,

ich darf dir heute deine Mai KPIs zukommen lassen.

Trotz der Herausforderungen, die der Einzelhandel manchmal mit sich bringt, machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Mai-Zahlen:

MC/ET: 4.7 (Platz 3)  
TMA-Anteil: 97%  
VL Share: 12% (Platz 4)  

Du hast im Mai wirklich beeindruckende Arbeit geleistet. Mit einem MC/ET-Wert von 4.7 bist du auf einem hervorragenden 3. Platz. Das zeigt, wie effektiv du im Verkauf von Kaffeemaschinen bist. Dein TMA-Anteil von 97% ist absolute Spitzenklasse, eine Leistung, die nur wenige erreichen. Auch beim VL Share liegst du mit 12% auf einem starken 4. Platz. Das ist eine solide Leistung, die deine Fähigkeit unterstreicht, auch unsere Vertuo-Reihe erfolgreich zu verkaufen.

Mach weiter so, Johann! Deine konsequente Arbeit trägt einen großen Teil zu unserem gemeinsamen Erfolg bei und wir sind gespannt auf die Ergebnisse des nächsten Monats.

Liebe Grüße, dein Nespresso Team.`,
    // Template 3
    `Liebe Ulrike,

ich darf dir heute deine Mai KPIs zukommen lassen.

Trotz der stabilen Marktlage machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Mai-Zahlen:

MC/ET: 7.3 (Platz 1)
TMA Anteil: 94%
VL Share: 23% (Platz 2)

Du hast im Mai mit deinem MC/ET den ersten Platz erreicht – eine wirklich beeindruckende Leistung! Deine hohe Verkaufszahl spiegelt dein Engagement wider und zeigt, dass du genau weißt, wie man Kunden begeistert. Auch dein VL Share ist mit Platz 2 bemerkenswert und zeigt, dass du einen hervorragenden Job machst. Beim TMA-Anteil gehörst du zu den Besten, was zeigt, wie effektiv du die Kundenbindung vor Ort gestaltest.

Mach weiter so, deine Arbeit ist inspirierend!

Liebe Grüße, dein Nespresso Team.`
  ]

  // Auto-scroll when mystery feedback is opened
  useEffect(() => {
    if (mysteryFeedbackOpen && mysteryFeedbackRef.current) {
      setTimeout(() => {
        mysteryFeedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
    }
  }, [mysteryFeedbackOpen])

  // Auto-hide info content after 7 seconds
  useEffect(() => {
    if (showInfoContent) {
      const timer = setTimeout(() => {
        setShowInfoContent(false)
      }, 7000)
      
      return () => clearTimeout(timer)
    }
  }, [showInfoContent])

  // Auto-hide mystery info content after 7 seconds
  useEffect(() => {
    if (mysteryShowInfoContent) {
      const timer = setTimeout(() => {
        setMysteryShowInfoContent(false)
      }, 7000)
      
      return () => clearTimeout(timer)
    }
  }, [mysteryShowInfoContent])

  // Hide feedback card 5 seconds after being read
  useEffect(() => {
    if (feedbackRead) {
      const timer = setTimeout(() => {
        setShowNewFeedback(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [feedbackRead])

  // Hide mystery feedback card 5 seconds after being read
  useEffect(() => {
    if (mysteryFeedbackRead) {
      const timer = setTimeout(() => {
        setMysteryShowNewFeedback(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [mysteryFeedbackRead])

  // Auto-hide challenge prizes popup when clicking outside
  useEffect(() => {
    const handleClickOutsideChallengePrizes = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.challenge-prizes-popup') && !target.closest('.challenge-info-button')) {
        setShowChallengePrizes(false)
      }
    }

    if (showChallengePrizes) {
      document.addEventListener('mousedown', handleClickOutsideChallengePrizes)
      return () => document.removeEventListener('mousedown', handleClickOutsideChallengePrizes)
    }
  }, [showChallengePrizes])

  // Handle challenge card dismissal after 5 seconds
  useEffect(() => {
    if (challengeCongratulationsRead) {
      const timer = setTimeout(() => {
        setChallengeCardDismissed(true)
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [challengeCongratulationsRead])
  
  const handleFeedbackRead = async () => {
    if (!feedbackData?.id) return
    
    try {
      const res = await fetch('/api/me/kpi-feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback_id: feedbackData.id })
      })
      
      if (res.ok) {
        setFeedbackRead(true)
      }
    } catch (e) {
      console.error('Failed to mark feedback as read:', e)
    }
  }

  const handleMysteryFeedbackRead = () => {
    setMysteryFeedbackRead(true)
  }

  // Mock data state (initialized empty to avoid SSR hydration mismatch)
  const [historyData, setHistoryData] = useState<any[]>([])
  const [mysteryHistoryData, setMysteryHistoryData] = useState<any[]>([])
  const [leaderboardData, setLeaderboardData] = useState<any[]>([])

  // Generate mock data on client-side only (after mount) to prevent hydration mismatch
  useEffect(() => {
    // Generate CA KPI history data
    const caData = []
    const today = new Date()
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setMonth(today.getMonth() - i)
      
      const mcet = (3.6 + Math.random() * 1.5).toFixed(1)
      const tma = (60 + Math.random() * 25).toFixed(0)
      const vl = (5 + Math.random() * 20).toFixed(0)
      
      caData.push({
        date,
        mcet: parseFloat(mcet),
        tma: parseInt(tma),
        vl: parseInt(vl)
      })
    }
    setHistoryData(caData)

    // Generate mystery shop history data
    const mysteryData = []
    for (let i = 0; i < 20; i++) {
      const date = new Date(today)
      date.setMonth(today.getMonth() - i)
      
      const percentage = (85 + Math.random() * 15).toFixed(0)
      
      mysteryData.push({
        date,
        percentage: parseInt(percentage)
      })
    }
    setMysteryHistoryData(mysteryData)

    // Generate leaderboard data
    const leaderData = []
    for (let i = 0; i < 60; i++) {
      const userId = i + 1
      
      const mcet = parseFloat((Math.random() * 8.5 + 0.5).toFixed(1))
      const tma = Math.floor(Math.random() * 60 + 40)
      const vlShare = Math.floor(Math.random() * 35)
      
      leaderData.push({
        id: userId,
        mcet: mcet,
        tma: tma,
        vlshare: vlShare
      })
    }
    setLeaderboardData(leaderData)
  }, [])

  // Get sorted leaderboard for the selected category (using real data)
  const getSortedLeaderboard = () => {
    let sortedData = [...realLeaderboardData]
    
    // Sort by selected category (highest to lowest)
    if (leaderboardCategory === "mcet") {
      sortedData.sort((a, b) => b.mcet - a.mcet)
    } else if (leaderboardCategory === "tma") {
      sortedData.sort((a, b) => b.tma - a.tma)
    } else if (leaderboardCategory === "vlshare") {
      sortedData.sort((a, b) => b.vlshare - a.vlshare)
    }
    
    // Add rank and name for display
    return sortedData.map((user, index) => ({
      ...user,
      rank: index + 1,
      name: user.isCurrentUser ? "Ich" : null
    }))
  }

  // Get current user's rank for the selected category
  const getCurrentUserRank = () => {
    if (!currentUserData) return 0
    
    const userValue = leaderboardCategory === "mcet" 
      ? currentUserData.mcet 
      : leaderboardCategory === "tma" 
        ? currentUserData.tma 
        : currentUserData.vlshare
    
    let rank = 1
    realLeaderboardData.forEach(user => {
      const compareValue = leaderboardCategory === "mcet" 
        ? user.mcet 
        : leaderboardCategory === "tma" 
          ? user.tma 
          : user.vlshare
      
      if (compareValue > userValue) rank++
    })
    
    return rank
  }

  // Helper functions to get colors based on score values (same as CA KPIs)
  const getScoreColorClass = (category: "mcet" | "tma" | "vlshare", value: number) => {
    if (category === "mcet") {
      if (value >= 4.5) return "text-green-600 dark:text-green-400"
      if (value >= 4.0) return "text-[#FD7E14] dark:text-[#FD7E14]"
      return "text-red-600 dark:text-red-400"
    } else if (category === "tma") {
      if (value >= 75) return "text-green-600 dark:text-green-400"
      if (value >= 65) return "text-[#FD7E14] dark:text-[#FD7E14]"
      return "text-red-600 dark:text-red-400"
    } else if (category === "vlshare") {
      if (value >= 10) return "text-green-600 dark:text-green-400"
      if (value >= 6) return "text-[#FD7E14] dark:text-[#FD7E14]"
      return "text-red-600 dark:text-red-400"
    }
    return "text-gray-600 dark:text-gray-400"
  }

  const getScoreBackgroundClass = (category: "mcet" | "tma" | "vlshare", value: number) => {
    if (category === "mcet") {
      if (value >= 4.5) return "bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-green-900/5 dark:to-emerald-900/5 hover:from-green-50/50 hover:to-emerald-50/50"
      if (value >= 4.0) return "bg-gradient-to-r from-[#FD7E14]/[0.03] to-[#FD7E14]/[0.03] dark:from-[#FD7E14]/5 dark:to-[#FD7E14]/5 hover:from-[#FD7E14]/[0.06] hover:to-[#FD7E14]/[0.06]"
      return "bg-gradient-to-r from-red-50/50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/10 hover:from-red-50/70 hover:to-red-100/70"
    } else if (category === "tma") {
      if (value >= 75) return "bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-green-900/5 dark:to-emerald-900/5 hover:from-green-50/50 hover:to-emerald-50/50"
      if (value >= 65) return "bg-gradient-to-r from-[#FD7E14]/[0.03] to-[#FD7E14]/[0.03] dark:from-[#FD7E14]/5 dark:to-[#FD7E14]/5 hover:from-[#FD7E14]/[0.06] hover:to-[#FD7E14]/[0.06]"
      return "bg-gradient-to-r from-red-50/50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/10 hover:from-red-50/70 hover:to-red-100/70"
    } else if (category === "vlshare") {
      if (value >= 10) return "bg-gradient-to-r from-green-50/30 to-emerald-50/30 dark:from-green-900/5 dark:to-emerald-900/5 hover:from-green-50/50 hover:to-emerald-50/50"
      if (value >= 6) return "bg-gradient-to-r from-[#FD7E14]/[0.03] to-[#FD7E14]/[0.03] dark:from-[#FD7E14]/5 dark:to-[#FD7E14]/5 hover:from-[#FD7E14]/[0.06] hover:to-[#FD7E14]/[0.06]"
      return "bg-gradient-to-r from-red-50/50 to-red-100/50 dark:from-red-900/10 dark:to-red-800/10 hover:from-red-50/70 hover:to-red-100/70"
    }
    return "hover:bg-gray-50 dark:hover:bg-gray-800/50"
  }

  // Mystery Shop feedback text
  const mysteryFeedbackText = `Liebe Nicole,

wir haben vor kurzem ein Mystery Shopping Ergebnis von dir erhalten. Es freut mich sehr dir mitteilen zu dürfen, dass du ein Ergebnis von 96% erzielen konntest und wir dir somit die volle Prämie in Höhe von 100€ ausbezahlen dürfen. (Nach Abschluss der MS Welle)

Ich habe dem Ergebnis nichts weiter hinzuzufügen. Wirklich super Arbeit!

Besonders hervorheben möchte ich den Kommentar des Mystery Shoppers bei Frage 55 im Fragebogen was ihm denn besonders gut gefallen hat – nämlich dein Fokus auf die VL Maschinen. 😊

Anbei der Bogen.

Liebe Grüße,
Mario`
  
  // Use only real data for Verlauf
  const verlaufData = realHistoryData
  const currentPageData = verlaufData.slice(historyPage * entriesPerPage, (historyPage + 1) * entriesPerPage)
  
  const totalPages = Math.ceil(verlaufData.length / entriesPerPage)

  // Mystery Shop pagination data
  const mysteryCurrentPageData = mysteryHistoryData.slice(mysteryHistoryPage * entriesPerPage, (mysteryHistoryPage + 1) * entriesPerPage)
  const mysteryTotalPages = Math.ceil(mysteryHistoryData.length / entriesPerPage)
  
  const navigateHistoryNext = () => {
    if (historyPage < totalPages - 1) {
      setHistoryPage(historyPage + 1)
    }
  }
  
  const navigateHistoryPrev = () => {
    if (historyPage > 0) {
      setHistoryPage(historyPage - 1)
    }
  }

  // Mystery Shop navigation functions
  const navigateMysteryHistoryNext = () => {
    if (mysteryHistoryPage < mysteryTotalPages - 1) {
      setMysteryHistoryPage(mysteryHistoryPage + 1)
    }
  }
  
  const navigateMysteryHistoryPrev = () => {
    if (mysteryHistoryPage > 0) {
      setMysteryHistoryPage(mysteryHistoryPage - 1)
    }
  }

  // Calculate Mystery Shop statistics
  const calculateMysteryStatsData = () => {
    // Return empty state if no data
    if (mysteryHistoryData.length === 0) {
      return {
        "30days": { percentage: { value: 0, changePercent: '+0.0%' } },
        "6months": { percentage: { value: 0, changePercent: '+0.0%' } },
        "alltime": { percentage: { value: 0, changePercent: '+0.0%' } }
      }
    }

    // Calculate averages for all time
    const allTimeAvg = mysteryHistoryData.reduce((sum, entry) => sum + entry.percentage, 0) / mysteryHistoryData.length

    // Get current month (most recent entry) and comparison months
    const currentMonth = mysteryHistoryData[0] // Most recent
    const lastMonth = mysteryHistoryData[1] // Previous month  
    const sixMonthsAgo = mysteryHistoryData[6] // 6 months ago

    // Calculate averages for last 6 months
    const last6MonthsData = mysteryHistoryData.slice(0, 6)
    const sixMonthsAvg = last6MonthsData.reduce((sum, entry) => sum + entry.percentage, 0) / last6MonthsData.length

    // Helper to calculate percentage change
    const calcPercentChange = (current: number, previous: number) => {
      const change = ((current - previous) / previous) * 100
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
    }

    // Helper to calculate optimal difference (90% is considered optimal)
    const calcOptimalDiff = (value: number, optimal: number = 90) => {
      const diff = value - optimal
      return diff >= 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`
    }

    return {
      "30days": {
        percentage: { 
          value: currentMonth.percentage, 
          changePercent: calcPercentChange(currentMonth.percentage, lastMonth.percentage)
        }
      },
      "6months": {
        percentage: { 
          value: sixMonthsAvg, 
          changePercent: calcPercentChange(currentMonth.percentage, sixMonthsAgo.percentage)
        }
      },
      "alltime": {
        percentage: { 
          value: allTimeAvg, 
          changePercent: calcOptimalDiff(allTimeAvg)
        }
      }
    }
  }

  // Calculate statistics from history data (wave-based)
  // Each feedback entry is treated as one "wave" (we send monthly, but logic is wave‑based)
  const calculateStatsData = () => {
    // Use only real data - no mock fallback
    const dataToUse = realHistoryData
    
    if (dataToUse.length === 0) {
      // Return null stats if no data (for empty state)
      return {
        "30days": { mcet: { value: null, changePercent: null }, tma: { value: null, changePercent: null }, vlShare: { value: null, changePercent: null } },
        "6months": { mcet: { value: null, changePercent: null }, tma: { value: null, changePercent: null }, vlShare: { value: null, changePercent: null } },
        "alltime": { mcet: { value: null, changePercent: null }, tma: { value: null, changePercent: null }, vlShare: { value: null, changePercent: null } }
      }
    }

    // Calculate averages for all time (across all waves)
    const allTimeAvg = {
      mcet: dataToUse.reduce((sum, entry) => sum + entry.mcet, 0) / dataToUse.length,
      tma: dataToUse.reduce((sum, entry) => sum + entry.tma, 0) / dataToUse.length,
      vl: dataToUse.reduce((sum, entry) => sum + entry.vl, 0) / dataToUse.length
    }

    // Latest and comparison waves (each history entry represents a wave)
    const currentWave = dataToUse[0] // latest wave
    const previousWave = dataToUse[1] // previous wave (may not exist)
    const sixWavesAgo = dataToUse[6] // six waves ago (may not exist)

    // Calculate averages for last 6 waves (or fewer if less than 6 exist)
    const last6Waves = dataToUse.slice(0, Math.min(6, dataToUse.length))
    const sixMonthsAvg = {
      mcet: last6Waves.reduce((sum, entry) => sum + entry.mcet, 0) / last6Waves.length,
      tma: last6Waves.reduce((sum, entry) => sum + entry.tma, 0) / last6Waves.length,
      vl: last6Waves.reduce((sum, entry) => sum + entry.vl, 0) / last6Waves.length
    }

    // Helper to calculate percentage change
    const calcPercentChange = (current: number, previous: number) => {
      const change = ((current - previous) / previous) * 100
      return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
    }

    // Helper to calculate optimal difference
    const calcOptimalDiff = (value: number, optimal: number) => {
      const diff = value - optimal
      return diff >= 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`
    }

    return {
      "30days": { // actually latest wave vs previous wave
        mcet: { 
          value: currentWave.mcet, 
          changePercent: previousWave ? calcPercentChange(currentWave.mcet, previousWave.mcet) : null
        },
        tma: { 
          value: currentWave.tma, 
          changePercent: previousWave ? calcPercentChange(currentWave.tma, previousWave.tma) : null
        },
        vlShare: { 
          value: currentWave.vl, 
          changePercent: previousWave ? calcPercentChange(currentWave.vl, previousWave.vl) : null
        }
      },
      "6months": {
        mcet: { 
          value: sixMonthsAvg.mcet, 
          changePercent: sixWavesAgo ? calcPercentChange(currentWave.mcet, sixWavesAgo.mcet) : null
        },
        tma: { 
          value: sixMonthsAvg.tma, 
          changePercent: sixWavesAgo ? calcPercentChange(currentWave.tma, sixWavesAgo.tma) : null
        },
        vlShare: { 
          value: sixMonthsAvg.vl, 
          changePercent: sixWavesAgo ? calcPercentChange(currentWave.vl, sixWavesAgo.vl) : null
        }
      },
      "alltime": {
        mcet: { 
          value: allTimeAvg.mcet, 
          changePercent: calcOptimalDiff(allTimeAvg.mcet, 4.5)
        },
        tma: { 
          value: allTimeAvg.tma, 
          changePercent: calcOptimalDiff(allTimeAvg.tma, 75)
        },
        vlShare: { 
          value: allTimeAvg.vl, 
          changePercent: calcOptimalDiff(allTimeAvg.vl, 10)
        }
      }
    }
  }

  const statsData = calculateStatsData()
  const mysteryStatsData = calculateMysteryStatsData()

  // Calculate total earned premiums from Mystery Shop history
  const calculateTotalPremiums = () => {
    return mysteryHistoryData.reduce((total, entry) => {
      if (entry.percentage >= 95) return total + 100 // 100€ for 95-100%
      if (entry.percentage >= 90) return total + 50  // 50€ for 90-94%
      return total // 0€ for below 90%
    }, 0)
  }

  const totalPremiums = calculateTotalPremiums()

  // Get premium breakdown for popup
  const getPremiumBreakdown = () => {
    return mysteryHistoryData
      .map((entry, index) => ({
        date: entry.date,
        percentage: entry.percentage,
        premium: entry.percentage >= 95 ? 100 : entry.percentage >= 90 ? 50 : 0,
        tier: entry.percentage >= 95 ? "Exzellent" : entry.percentage >= 90 ? "Sehr gut" : null
      }))
      .filter(entry => entry.premium > 0)
      .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort by date descending
  }

  const premiumBreakdown = getPremiumBreakdown()

  // Helper function to determine color based on value
  const getColorForMcEt = (value: number) => {
    if (value >= 4.5) return "text-green-600 dark:text-green-400"
    if (value >= 4.0) return "custom-orange"
    return "text-red-600 dark:text-red-400"
  }

  const getColorForTma = (value: number) => {
    if (value >= 75) return "text-green-600 dark:text-green-400"
    if (value >= 65) return "custom-orange"
    return "text-red-600 dark:text-red-400"
  }

  const getColorForVlShare = (value: number) => {
    if (value >= 10) return "text-green-600 dark:text-green-400"
    if (value >= 6) return "custom-orange"
    return "text-red-600 dark:text-red-400"
  }

  // Helper function to get style for custom orange
  const getStyleForColor = (colorClass: string) => {
    if (colorClass === "custom-orange") {
      return { color: "#FD7E14" }
    }
    return {}
  }

  // Helper function to determine color based on Mystery Shop percentage
  const getColorForMysteryShop = (value: number) => {
    if (value >= 95) return "custom-gold" // 95-100%: Gold/shiny (100€ premium)
    if (value >= 90) return "text-green-600 dark:text-green-400" // 90-94%: Green (50€ premium)
    if (value >= 80) return "custom-orange" // 80-89%: Orange (no premium)
    return "text-red-600 dark:text-red-400" // <80%: Red (bad result)
  }

  // Helper function to get style for Mystery Shop colors including gold
  const getStyleForMysteryShopColor = (colorClass: string) => {
    if (colorClass === "custom-orange") {
      return { color: "#FD7E14" }
    }
    if (colorClass === "custom-gold") {
      return {}
    }
    return {}
  }

  // Helper function to get pill color based on change type
  const getPillColor = (changePercent: string, timeFrame: string) => {
    if (timeFrame === "alltime") {
      // For all-time, green = positive (above optimal), red = negative (below optimal)
      return changePercent.startsWith('+') ? 'bg-green-600/30 dark:bg-green-500/30 text-green-800 dark:text-green-200' : 'bg-red-600/30 dark:bg-red-500/30 text-red-800 dark:text-red-200'
    } else {
      // For 30days and 6months, green = positive change, red = negative change
      return changePercent.startsWith('+') ? 'bg-green-600/30 dark:bg-green-500/30 text-green-800 dark:text-green-200' : 'bg-red-600/30 dark:bg-red-500/30 text-red-800 dark:text-red-200'
    }
  }

  const timeFrameLabels = {
    "30days": "Letzte 30 Tage",
    "6months": "Letzte 6 Monate",
    "alltime": "Gesamt"
  }

  const infoExplanations = {
    "30days": {
      title: "Letzter Monat",
      description: "Zeigt deine aktuellen Werte vom letzten Monat. Die bunten Pillen zeigen, wie viel Prozent sich im Vergleich zum Vormonat geändert hat.",
      examples: "Grün = Verbesserung, Rot = Verschlechterung"
    },
    "6months": {
      title: "Letzten 6 Monate", 
      description: "Zeigt den Durchschnitt der letzten 6 Monate. Die bunten Pillen zeigen die Veränderung von vor 6 Monaten zu heute.",
      examples: "Grün = Verbesserung, Rot = Verschlechterung"
    },
    "alltime": {
      title: "Gesamter Zeitraum",
      description: "Zeigt deinen Durchschnitt über alle verfügbaren Monate. Die bunten Pillen zeigen, wie weit du von den optimalen Werten entfernt bist.",
      examples: "Grün = Über Optimal (MC/ET: 4,5+, TMA: 75%+, VL: 10%+), Rot = Unter Optimal"
    }
  }

  const handlePrevTimeFrame = () => {
    if (timeFrame === "30days") setTimeFrame("alltime")
    else if (timeFrame === "6months") setTimeFrame("30days")
    else setTimeFrame("6months")
  }

  const handleNextTimeFrame = () => {
    if (timeFrame === "30days") setTimeFrame("6months")
    else if (timeFrame === "6months") setTimeFrame("alltime")
    else setTimeFrame("30days")
  }

  // Helper function to get feedback text for entry
  const getFeedbackText = (entryIndex: number) => {
    if (entryIndex === 0) return feedbackTexts[0] // Use existing feedback for newest month
    return feedbackTexts[((entryIndex - 1) % 3) + 1] // Cycle through templates 1-3 for older entries
  }

  return (
    <>
      {/* Header Section - New Design */}
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 mb-1">Deine CA KPIs</h1>
        <div className="text-gray-600 dark:text-gray-400">
          <div className="inline-block typing-animation typing-container" style={{animationDuration: '2.5s', width: 'fit-content'}}>
            Erforsche deine persönlichen KPIs!
          </div>
        </div>
      </section>

      {/* Navigation Menu */}
      <div className="mb-6">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 max-w-sm mx-auto relative">
          {/* Sliding indicator */}
          <div 
            className={`absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
              activeSection === "ca-kpis" 
                ? "left-1 right-1/2 mr-0.5" 
                : "left-1/2 right-1 ml-0.5"
            }`}
          />
          
          <button
            onClick={() => setActiveSection("ca-kpis")}
            className="relative flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 z-10"
          >
            <span className={`transition-all duration-200 ${
              activeSection === "ca-kpis" 
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent" 
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            }`}>CA KPIs</span>
          </button>
          <div className="relative flex-1">
            <button
              disabled
              className="relative w-full py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 z-10 cursor-not-allowed"
            >
              <span className="text-gray-400 dark:text-gray-500">Mystery Shop</span>
            </button>
            {/* Coming Soon Badge */}
            <div className="absolute -top-1 -right-1 z-20">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                BALD
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CA KPIs Section */}
      {activeSection === "ca-kpis" && (
        <>
      <div className="flex flex-col items-center mb-12">
        <div className="relative w-full max-w-md">
          <Card className="w-full shadow-md dark:shadow-slate-900/30 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden relative z-10">
            {/* Header with purple gradient */}
            <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500 to-pink-500 text-white relative">
              <h3 className="text-center font-medium text-white flex items-center justify-center">
                <BarChart2 className="h-4 w-4 mr-2" />
                {timeFrameLabels[timeFrame]}
              </h3>
              {/* Leaderboard icon */}
              <button 
                onClick={() => setShowLeaderboard(true)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Trophy className="h-4 w-4 text-white/80 hover:text-white" />
              </button>
            </div>
            
            <CardContent className="p-0">
              {/* Statistics section with navigation arrows on sides */}
              <div className="relative p-3 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-800/20">
                {!showInfoContent ? (
                  <>
                    {/* Info button - positioned in top-left corner */}
                    <button 
                      onClick={() => setShowInfoContent(true)}
                      className="absolute left-2 top-2 p-1 opacity-40 hover:opacity-80 transition-opacity z-10"
                    >
                      <Info className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                    </button>

                    {/* Left arrow */}
                    <button 
                      onClick={handlePrevTimeFrame}
                      className="absolute left-1 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="space-y-1 mx-8">
                      {/* MC/ET */}
                      <div className="text-center py-0.5">
                        <div className="flex items-center justify-center">
                          <div className="text-right text-gray-500 dark:text-gray-400">Avg MC/</div>
                          <div className="text-right text-gray-500 dark:text-gray-400">ET:</div>
                          <div 
                            className={`font-semibold ${statsData[timeFrame].mcet.value !== null ? (getColorForMcEt(statsData[timeFrame].mcet.value) !== "custom-orange" ? getColorForMcEt(statsData[timeFrame].mcet.value) : "") : "text-gray-300"}`}
                            style={{marginLeft: '4px', ...(statsData[timeFrame].mcet.value !== null ? getStyleForColor(getColorForMcEt(statsData[timeFrame].mcet.value)) : {})}}
                          >
                            {statsData[timeFrame].mcet.value !== null ? (
                              statsData[timeFrame].mcet.value.toFixed(1)
                            ) : (
                              <span className="inline-block h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse align-middle"></span>
                            )}
                          </div>
                          {statsData[timeFrame].mcet.changePercent !== null && (
                            <div className={`text-xs ${getPillColor(statsData[timeFrame].mcet.changePercent, timeFrame)} rounded-full px-1 py-0`} style={{marginLeft: '4px'}}>
                              {statsData[timeFrame].mcet.changePercent}
                            </div>
                          )}
                        </div>
                      </div>

                      
                      
                      {/* TMA */}
                      <div className="text-center py-0.5">
                        <div className="flex items-center justify-center">
                          <div className="text-right text-gray-500 dark:text-gray-400">Avg TMA:</div>
                          <div 
                            className={`font-semibold ${statsData[timeFrame].tma.value !== null ? (getColorForTma(statsData[timeFrame].tma.value) !== "custom-orange" ? getColorForTma(statsData[timeFrame].tma.value) : "") : "text-gray-300"}`}
                            style={{marginLeft: '4px', ...(statsData[timeFrame].tma.value !== null ? getStyleForColor(getColorForTma(statsData[timeFrame].tma.value)) : {})}}
                          >
                            {statsData[timeFrame].tma.value !== null ? (
                              `${statsData[timeFrame].tma.value.toFixed(1)}%`
                            ) : (
                              <span className="inline-block h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse align-middle"></span>
                            )}
                          </div>
                          {statsData[timeFrame].tma.changePercent !== null && (
                            <div className={`text-xs ${getPillColor(statsData[timeFrame].tma.changePercent, timeFrame)} rounded-full px-1 py-0`} style={{marginLeft: '4px'}}>
                              {statsData[timeFrame].tma.changePercent}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* VL Share */}
                      <div className="text-center py-0.5">
                        <div className="flex items-center justify-center">
                          <div className="text-right text-gray-500 dark:text-gray-400">Avg VL</div>
                          <div className="text-right text-gray-500 dark:text-gray-400">Share:</div>
                          <div 
                            className={`font-semibold ${statsData[timeFrame].vlShare.value !== null ? (getColorForVlShare(statsData[timeFrame].vlShare.value) !== "custom-orange" ? getColorForVlShare(statsData[timeFrame].vlShare.value) : "") : "text-gray-300"}`}
                            style={{marginLeft: '4px', ...(statsData[timeFrame].vlShare.value !== null ? getStyleForColor(getColorForVlShare(statsData[timeFrame].vlShare.value)) : {})}}
                          >
                            {statsData[timeFrame].vlShare.value !== null ? (
                              `${statsData[timeFrame].vlShare.value.toFixed(1)}%`
                            ) : (
                              <span className="inline-block h-3 w-14 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse align-middle"></span>
                            )}
                          </div>
                          {statsData[timeFrame].vlShare.changePercent !== null && (
                            <div className={`text-xs ${getPillColor(statsData[timeFrame].vlShare.changePercent, timeFrame)} rounded-full px-1 py-0`} style={{marginLeft: '4px'}}>
                              {statsData[timeFrame].vlShare.changePercent}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right arrow */}
                    <button 
                      onClick={handleNextTimeFrame}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  /* Info content displayed centered in the card */
                  <div className="flex items-center justify-center h-[100px] px-3">
                    <div className="text-center max-w-full">
                      <h4 className="font-semibold text-sm mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        {infoExplanations[timeFrame].title}
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 leading-tight">
                        {infoExplanations[timeFrame].description}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                        <span className="text-green-600 dark:text-green-400 font-medium">Grün</span> = Gut, <span className="text-red-600 dark:text-red-400 font-medium">Rot</span> = Schlecht
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
      <MonthlyMetricsPromotor />

      {/* New Feedback Notification Card */}
      {showNewFeedback && (
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg blur-sm opacity-75 animate-pulse"></div>
            
            {/* Main card */}
            <Card className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
              
              {/* Header with icon */}
              {!feedbackRead && (
                <div className="relative py-4 px-6 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 animate-bounce">
                      <BarChart2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-lg drop-shadow-lg">
                    Neues Feedback verfügbar!
                  </h3>
                  <p className="text-white/90 text-sm mt-1 drop-shadow">
                    Du hast ein neues CA KPI Feedback erhalten
                  </p>
                </div>
              )}
              
              {/* Content */}
              <CardContent className="relative p-6 pt-2">
                <div className="text-center">
                  {!feedbackRead ? (
                    <>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20 relative">
                        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                        <div className="text-white text-xs leading-relaxed text-left whitespace-pre-line relative">
                          {feedbackData?.feedback_text || 'Feedback text wird geladen...'}
                        </div>
                      </div>
                      
                      {/* Read button - more distinct but smaller */}
                      <button 
                        onClick={handleFeedbackRead}
                        className="relative z-10 bg-white text-orange-600 font-medium py-2.5 px-5 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/50"
                      >
                        ✓ Gelesen
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[140px] w-full px-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
                        <div className="text-white">
                          <div className="text-lg font-semibold mb-2">✓ Danke fürs Lesen!</div>
                          <div className="text-sm">Die Aufgabe ist in der To-Do Liste als erledigt markiert.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Sales Challenge Card */}
      <div className="w-full max-w-md mx-auto mb-6 relative">
        {!challengeCompleted && !challengeCardDismissed ? (
          <Card className="w-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
            {/* Challenge gradient header */}
            <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 text-white rounded-t-lg relative">
              {/* Info icon */}
              <button 
                onClick={() => setShowChallengePrizes(!showChallengePrizes)}
                className="challenge-info-button absolute left-4 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Info className="h-4 w-4 text-white/80 hover:text-white" />
              </button>
              
              <h3 className="text-center font-medium text-white flex items-center justify-center">
                <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
                </svg>
                Sales Challenge
              </h3>
              <div className="text-center text-xs text-white/90 mt-1">
                <span className="bg-white/20 px-2 py-0.5 rounded-full">
                  Endet in 12 Tagen
                </span>
              </div>
              
              {/* Prizes popup */}
              {showChallengePrizes && (
                <div className="challenge-prizes-popup absolute top-full left-4 mt-2 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 w-64 z-[60]">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm text-center">
                    🏆 Preise & Belohnungen
                  </h4>
                  <div className="space-y-2.5">
                    {/* 1st Place */}
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{background: 'linear-gradient(to right, rgba(238, 179, 75, 0.1), rgba(255, 237, 153, 0.1))'}}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)'}}>
                          <span className="text-white font-bold text-xs">1</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">1. Platz</span>
                      </div>
                                             <span className="font-bold text-sm bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent">150€</span>
                    </div>
                    
                    {/* 2nd Place */}
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{background: 'linear-gradient(to right, rgba(222, 223, 225, 0.15), rgba(236, 238, 237, 0.15))'}}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{background: 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)'}}>
                          <span className="text-white font-bold text-xs">2</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">2. Platz</span>
                      </div>
                      <span className="font-bold text-sm" style={{color: '#BCBDC1'}}>100€</span>
                    </div>
                    
                    {/* 3rd Place */}
                    <div className="flex items-center justify-between p-2 rounded-lg" style={{background: 'linear-gradient(to right, rgba(189, 150, 93, 0.1), rgba(222, 191, 147, 0.1))'}}>
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded flex items-center justify-center" style={{background: 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)'}}>
                          <span className="text-white font-bold text-xs">3</span>
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">3. Platz</span>
                      </div>
                      <span className="font-bold text-sm" style={{color: '#BD965D'}}>50€</span>
                    </div>
                    
                                         {/* 4th-10th Place */}
                     <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                       <div className="flex items-center space-x-2">
                         <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center">
                           <span className="text-white font-bold text-xs">4+</span>
                         </div>
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300">4.-10. Platz</span>
                       </div>
                       <span className="font-bold text-sm text-blue-600 dark:text-blue-400">20€</span>
                     </div>
                    
                    {/* Below 10th */}
                    <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg opacity-60">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-xs">11+</span>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Ab 11. Platz</span>
                      </div>
                      <span className="font-medium text-sm text-gray-500 dark:text-gray-400">0€</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      Preise werden nach Challenge-Ende ausgezahlt
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <CardContent className="p-4">
              {/* Top 3 Podium */}
              <div className="mb-4">
                <div className="flex items-end justify-center space-x-2 mb-3">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-1 shadow-md" style={{background: 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)'}}>
                      <span className="text-white font-bold text-sm">2</span>
                    </div>
                    <div className="w-12 h-8 rounded-t-md flex items-center justify-center" style={{background: 'linear-gradient(to top, #BCBDC1, #ECEEED)'}}>
                      <span className="text-xs font-bold text-gray-600">47</span>
                    </div>
                  </div>
                  
                  {/* 1st Place */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center mb-1 shadow-lg transform scale-110 -translate-y-1" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)'}}>
                      <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 12L5.5 10L8 12L10 8L12 12L14 8L16 12L18.5 10L21 12L19 16H5ZM7 18H17C17.55 18 18 18.45 18 19C18 19.55 17.55 20 17 20H7C6.45 20 6 19.55 6 19C6 18.45 6.45 18 7 18Z"/>
                      </svg>
                    </div>
                    <div className="w-14 h-12 rounded-t-md flex items-center justify-center" style={{background: 'linear-gradient(to top, #FCD33D, #FFED99)'}}>
                      <span className="text-sm font-bold" style={{color: '#8B6914'}}>63</span>
                    </div>
                  </div>
                  
                  {/* 3rd Place */}
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-1 shadow-md" style={{background: 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)'}}>
                      <span className="text-white font-bold text-sm">3</span>
                    </div>
                    <div className="w-12 h-6 rounded-t-md flex items-center justify-center" style={{background: 'linear-gradient(to top, #99774A, #DEBF93)'}}>
                      <span className="text-xs font-bold text-amber-100">41</span>
                    </div>
                  </div>
                </div>
                
                {/* Rank labels */}
                <div className="flex justify-center space-x-8 text-xs text-gray-500 dark:text-gray-400">
                  <span>2nd</span>
                  <span className="text-yellow-600 dark:text-yellow-500 font-semibold">1st</span>
                  <span>3rd</span>
                </div>
              </div>
              
              {/* Current User Rank */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const currentRank: number = 7;
                      return (
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: currentRank === 1 
                              ? 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)'
                              : currentRank === 2 
                                ? 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)'
                                : currentRank === 3 
                                  ? 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)'
                                  : 'linear-gradient(135deg, rgb(59 130 246), rgb(99 102 241))'
                          }}
                        >
                          <span className="text-white font-bold text-sm">{currentRank}</span>
                        </div>
                      );
                    })()}
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Dein Rang
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +2 seit letzter Woche
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      28
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      VL Verkäufe
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Challenge Progress */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                  <span>Bis Platz 3:</span>
                  <span className="font-semibold">13 VL Verkäufe</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500" 
                    style={{ width: '68%' }}
                  ></div>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Nächste Belohnung:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">100€ Gutschein</span>
                </div>
              </div>
            </CardContent>
          </Card>
                ) : challengeCompleted && !challengeCardDismissed ? (
          !challengeCongratulationsRead ? (
            /* Congratulations Card */
            <Card className="w-full border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
              {/* Congratulations gradient header */}
              <div className="py-4 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 text-white rounded-t-lg">
                <h3 className="text-center font-bold text-white flex items-center justify-center text-lg">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M5 16L3 12L5.5 10L8 12L10 8L12 12L14 8L16 12L18.5 10L21 12L19 16H5ZM7 18H17C17.55 18 18 18.45 18 19C18 19.55 17.55 20 17 20H7C6.45 20 6 19.55 6 19C6 18.45 6.45 18 7 18Z"/>
                  </svg>
                  Herzlichen Glückwunsch!
                </h3>
                <div className="text-center text-sm text-white/90 mt-1">
                  Sales Challenge beendet
                </div>
              </div>
              
              <CardContent className="p-6">
                {/* Final Placement */}
                <div className="text-center mb-6">
                  <div className="mx-auto mb-3 w-30 h-36">
                    <svg className="w-full h-full" viewBox="0 0 100 120" fill="none">
                      <defs>
                        <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#BD965D"/>
                          <stop offset="25%" stopColor="#99774A"/>
                          <stop offset="75%" stopColor="#DEBF93"/>
                          <stop offset="100%" stopColor="#AC9071"/>
                        </linearGradient>
                      </defs>
                      
                      {/* Medal Ribbons */}
                      <path d="M30 5 L35 45 L50 40 L65 45 L70 5 Z" fill="url(#bronzeGradient)" stroke="#AC9071" strokeWidth="1"/>
                      
                      {/* Medal Circle */}
                      <circle cx="50" cy="70" r="25" fill="url(#bronzeGradient)" stroke="#99774A" strokeWidth="2"/>
                      
                      {/* Inner Circle */}
                      <circle cx="50" cy="70" r="18" fill="rgba(222, 191, 147, 0.3)" stroke="#DEBF93" strokeWidth="1"/>
                      
                      {/* Number */}
                      <text x="50" y="77" textAnchor="middle" fontSize="16" fill="white" fontWeight="bold">3</text>
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    3. Platz erreicht!
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Du hast mit 45 VL Verkäufen einen fantastischen 3. Platz erreicht!
                  </p>
                </div>
                
                {/* Reward Section */}
                <div className="rounded-lg p-4 border mb-4" style={{
                  background: 'linear-gradient(to right, rgba(189, 150, 93, 0.1), rgba(222, 191, 147, 0.1))',
                  borderColor: 'rgba(189, 150, 93, 0.3)'
                }}>
                  <div className="text-center">
                    <div className="text-2xl font-bold mb-1" style={{color: '#BD965D'}}>
                      100€ Gutschein
                    </div>
                    <p className="text-sm" style={{color: 'rgba(189, 150, 93, 0.8)'}}>
                      Deine wohlverdiente Belohnung wird in den nächsten Tagen verarbeitet
                    </p>
                  </div>
                </div>
                
                {/* Confirmation Button */}
                <button 
                  onClick={() => setChallengeCongratulationsRead(true)}
                  className="w-full bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-indigo-700 hover:via-purple-600 hover:to-pink-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  ✓ Verstanden
                </button>
              </CardContent>
            </Card>
          ) : (
            /* Collapsed Confirmation Card */
            <Card className="relative bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 border-0 shadow-xl overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-center h-[140px] w-full px-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
                    <div className="text-white">
                      <div className="text-lg font-semibold mb-2">✓ Danke fürs Lesen!</div>
                      <div className="text-sm">Die Aufgabe ist in der To-Do Liste als erledigt markiert.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ) : null}
        
        {/* Dark Overlay with "kommt bald!" */}
        {!challengeCompleted && !challengeCardDismissed && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-gray-900/50 to-black/40 dark:from-black/50 dark:via-gray-950/60 dark:to-black/50 rounded-lg flex items-center justify-center pointer-events-none z-10 backdrop-blur-[2px]">
            <div className="relative">
              {/* Glow effect behind the box */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-xl rounded-lg scale-110"></div>
              
              {/* Main "kommt bald!" box - clear and sharp, no blur */}
              <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 px-5 py-2.5 rounded-lg shadow-2xl">
                <span className="text-white text-sm font-semibold tracking-wide">kommt bald!</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="w-full max-w-md mx-auto mb-8">
        <Card className="w-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          {/* Blue gradient header with rounded corners */}
          <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <h3 className="text-center font-medium text-white flex items-center justify-center">
              <History className="h-4 w-4 mr-2" />
              Verlauf ({verlaufData.length})
            </h3>
          </div>
          
          <CardContent className="p-0">
            {historyDataLoading ? (
              <div className="px-6 py-4 space-y-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={`history-skeleton-${idx}`} className="flex items-center gap-6">
                    <div className="h-4 w-24 rounded-full bg-gray-200/70 animate-pulse dark:bg-gray-700/70"></div>
                    <div className="flex-1 flex items-center justify-between gap-4">
                      <div className="h-4 w-24 rounded-full bg-gray-200/70 animate-pulse dark:bg-gray-700/70"></div>
                      <div className="h-4 w-24 rounded-full bg-gray-200/70 animate-pulse dark:bg-gray-700/70"></div>
                      <div className="h-4 w-24 rounded-full bg-gray-200/70 animate-pulse dark:bg-gray-700/70"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : verlaufData.length === 0 ? (
              <div className="py-12 px-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full mb-4">
                  <History className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                </div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Noch keine KPI-Daten vorhanden
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Sobald du dein erstes CA KPI Feedback erhältst, erscheint es hier in deinem Verlauf.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {currentPageData.map((entry, index) => (
                <div 
                  key={index} 
                  className={`flex items-center p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                    !historyExpanded && index > 4 ? 
                      (index === 4 ? 'opacity-50' : 'hidden') : ''
                  }`}
                  onClick={() => setSelectedHistoryEntry(historyPage * entriesPerPage + index)}
                >
                  <div className="flex-shrink-0 w-24">
                    <div className="flex items-center">
                      <span className="text-gray-500 dark:text-gray-400">
                        {entry.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 flex justify-between ml-4">
                    <div 
                      className={`text-sm font-medium ${getColorForMcEt(entry.mcet) !== "custom-orange" ? getColorForMcEt(entry.mcet) : ""}`}
                      style={getStyleForColor(getColorForMcEt(entry.mcet))}
                    >
                      MC/ET: {entry.mcet}
                    </div>
                    
                    <div 
                      className={`text-sm font-medium ${getColorForTma(entry.tma) !== "custom-orange" ? getColorForTma(entry.tma) : ""}`}
                      style={getStyleForColor(getColorForTma(entry.tma))}
                    >
                      TMA: {entry.tma}%
                    </div>
                    
                    <div 
                      className={`text-sm font-medium ${getColorForVlShare(entry.vl) !== "custom-orange" ? getColorForVlShare(entry.vl) : ""}`}
                      style={getStyleForColor(getColorForVlShare(entry.vl))}
                    >
                      VL: {entry.vl}%
                    </div>
                  </div>
                </div>
                ))}
                
                {/* Blurred overlay for collapsed state */}
                {!historyExpanded && currentPageData.length > 5 && (
                  <div className="relative">
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
                  </div>
                )}
              </div>
            )}
            
            {/* Footer with Show more/less button and navigation - only show when data exists */}
            {verlaufData.length > 0 && (
              <div className="p-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                {/* Left navigation arrow - only show if not on first page */}
                <div className="w-20">
                  {historyPage > 0 && (
                    <button 
                      onClick={() => navigateHistoryPrev()}
                      className="flex items-center text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 mr-1 text-blue-500" />
                      <span>Neuer</span>
                    </button>
                  )}
                </div>
                
                {/* Show more/less button */}
                <button 
                  onClick={() => setHistoryExpanded(!historyExpanded)}
                  className="flex items-center justify-center text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                >
                  {historyExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1 text-blue-500" />
                      Schließen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1 text-blue-500" />
                      Show More
                    </>
                  )}
                </button>
                
                {/* Right navigation arrow - only show if not on last page */}
                <div className="w-20 text-right">
                  {historyPage < totalPages - 1 && (
                    <button 
                      onClick={() => navigateHistoryNext()}
                      className="flex items-center justify-end text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                    >
                      <span>Älter</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 text-blue-500" />
                    </button>
                  )}
                </div>
              </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History Feedback Popup */}
      {selectedHistoryEntry !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedHistoryEntry(null)}>
          <div className="w-full max-w-md">
            <Card className="shadow-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="py-2 px-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h3 className="font-medium text-gray-600 dark:text-gray-300 text-sm">
                  CA KPIs <span className="text-gray-400 dark:text-gray-500">
                    {verlaufData[selectedHistoryEntry]?.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                  </span>
                </h3>
                <button 
                  onClick={() => setSelectedHistoryEntry(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              <CardContent className="p-4">
                <ScrollArea className="h-[280px] pr-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {verlaufData[selectedHistoryEntry]?.feedback_text || 'Feedback text wird geladen...'}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
          )}
        </>
      )}

      {/* Mystery Shop Section */}
      {activeSection === "mystery-shop" && (
        <>
          <div className="flex flex-col items-center mb-12">
            <div className="relative w-full max-w-md">
              <Card className="w-full shadow-md dark:shadow-slate-900/30 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden relative z-10">
                {/* Header with blue gradient */}
                <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                                  <h3 className="text-center font-medium text-white flex items-center justify-center">
                  <BarChart2 className="h-4 w-4 mr-2" />
                  {mysteryTimeFrame === "30days" ? "Letzter Mystery Shop" : 
                   mysteryTimeFrame === "6months" ? "Letzte 6 Mystery Shops" : "Gesamt"}
                </h3>
                </div>
                
                <CardContent className="p-0">
                  {/* Statistics section with navigation arrows on sides */}
                  <div className="relative p-3 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-800/20">
                    {!mysteryShowInfoContent ? (
                      <>
                        {/* Info button - positioned in top-left corner */}
                        <button 
                          onClick={() => setMysteryShowInfoContent(true)}
                          className="absolute left-2 top-2 p-1 opacity-40 hover:opacity-80 transition-opacity z-10"
                        >
                          <Info className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
                        </button>

                        {/* Left arrow */}
                        <button 
                          onClick={() => {
                            if (mysteryTimeFrame === "30days") setMysteryTimeFrame("alltime")
                            else if (mysteryTimeFrame === "6months") setMysteryTimeFrame("30days")
                            else setMysteryTimeFrame("6months")
                          }}
                          className="absolute left-1 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>

                        <div className="space-y-1 mx-8">
                          {/* Mystery Shop Percentage */}
                          <div className="text-center py-2">
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <div className="text-sm text-gray-500 dark:text-gray-400">Mystery Shop</div>
                              <div className="flex items-center justify-center">
                                <div 
                                  className={`font-semibold text-xl ${
                                    getColorForMysteryShop(mysteryStatsData[mysteryTimeFrame].percentage.value) === "custom-gold" 
                                      ? 'bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent'
                                      : getColorForMysteryShop(mysteryStatsData[mysteryTimeFrame].percentage.value) !== "custom-orange" 
                                        ? getColorForMysteryShop(mysteryStatsData[mysteryTimeFrame].percentage.value) 
                                        : ""
                                  }`}
                                  style={{marginRight: '6px', ...getStyleForMysteryShopColor(getColorForMysteryShop(mysteryStatsData[mysteryTimeFrame].percentage.value))}}
                                >
                                  {mysteryStatsData[mysteryTimeFrame].percentage.value.toFixed(1)}%
                                </div>
                                <div className={`text-xs rounded-full px-1.5 py-0.5 ${
                                  mysteryStatsData[mysteryTimeFrame].percentage.changePercent.startsWith('+') 
                                    ? 'bg-green-600/30 dark:bg-green-500/30 text-green-800 dark:text-green-200' 
                                    : 'bg-red-600/30 dark:bg-red-500/30 text-red-800 dark:text-red-200'
                                }`}>
                                  {mysteryStatsData[mysteryTimeFrame].percentage.changePercent}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right arrow */}
                        <button 
                          onClick={() => {
                            if (mysteryTimeFrame === "30days") setMysteryTimeFrame("6months")
                            else if (mysteryTimeFrame === "6months") setMysteryTimeFrame("alltime")
                            else setMysteryTimeFrame("30days")
                          }}
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      /* Info content displayed centered in the card */
                      <div className="flex items-center justify-center h-[100px] px-3">
                        <div className="text-center max-w-full">
                          <h4 className="font-semibold text-sm mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            {mysteryTimeFrame === "30days" ? "Letzter Mystery Shop" : 
                             mysteryTimeFrame === "6months" ? "Letzte 6 Mystery Shops" : "Gesamter Zeitraum"}
                          </h4>
                          <p className="text-xs text-gray-700 dark:text-gray-200 mb-2 leading-tight">
                            {mysteryTimeFrame === "30days" ? "Vergleich: Neuester vs. Zweitneuester Shop." : 
                             mysteryTimeFrame === "6months" ? "Durchschnitt der letzten 6 Shops. Vergleich: Neuester vs. 6. Shop." : 
                             "Mystery Shop Bewertungen. Pillen zeigen Veränderung zum Vergleichszeitraum."}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight mb-2">
                            <span className="text-green-600 dark:text-green-400 font-medium">Grün</span> = +, <span className="text-red-600 dark:text-red-400 font-medium">Rot</span> = -
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">
                            <span className="text-red-600 dark:text-red-400 font-medium">&lt;90%</span> = 0€, <span className="text-green-600 dark:text-green-400 font-medium">90-94%</span> = 50€, <span className="text-yellow-600 dark:text-yellow-400 font-medium">95-100%</span> = 100€
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Mystery Shop Feedback dropdown that peeks from behind the card - only visible when feedback is closed */}
              <div 
                className={`absolute left-1/2 transform -translate-x-1/2 -bottom-[1.65rem] z-0 flex justify-center w-full transition-all duration-500 ${
                  mysteryFeedbackOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div 
                  className="bg-white dark:bg-gray-900 shadow-sm rounded-b-xl px-8 py-1 border border-gray-100 dark:border-gray-800 cursor-pointer w-52 text-center filter drop-shadow-md"
                  onClick={() => setMysteryFeedbackOpen(!mysteryFeedbackOpen)}
                >
                  <button className="flex items-center justify-center w-full">
                    <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent text-xs font-medium opacity-75">Potential Analyse</span>
                    <ChevronDown className="h-3.5 w-3.5 ml-1 text-indigo-500 transform translate-y-[1px] opacity-75" />
                  </button>
                </div>
              </div>
            </div>

            {/* Mystery Shop Feedback Card */}
            <div 
              className={`w-full max-w-[calc(100%-18px)] mt-1 transition-all duration-500 origin-top ${
                mysteryFeedbackOpen ? 'scale-y-100 opacity-100' : 'scale-y-0 opacity-0 absolute pointer-events-none'
              }`}
              ref={mysteryFeedbackRef}
              style={{ 
                transformOrigin: 'top center',
                maxHeight: mysteryFeedbackOpen ? '1000px' : '0px',
                marginTop: mysteryFeedbackOpen ? '4px' : '0px'
              }}
            >
              <div className="relative">
                <Card className="shadow-md dark:shadow-slate-900/30 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden">
                  <div className="py-2 px-4 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="font-medium text-gray-600 dark:text-gray-300 text-sm text-center">
                      Potential Analyse <span className="text-gray-400 dark:text-gray-500">Mystery Shop</span>
                    </h3>
                  </div>
                  
                  <CardContent className="p-4">
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed space-y-4">
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                            <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              💎 Mystery Shop Prämien-System
                            </h4>
                            <div className="text-sm text-purple-700 dark:text-purple-200 space-y-2">
                              <p><strong>95-100%:</strong> <span className="text-green-600 dark:text-green-400 font-semibold">100€ Prämie</span></p>
                              <p><strong>90-94%:</strong> <span className="text-blue-600 dark:text-blue-400 font-semibold">50€ Prämie</span></p>
                              <p><strong>Unter 90%:</strong> <span className="text-gray-600 dark:text-gray-400">Keine Prämie</span></p>
                              <p className="mt-3 font-medium">
                                Dein aktueller Score: <strong className="text-purple-800 dark:text-purple-300">{mysteryStatsData[timeFrame].percentage.value.toFixed(1)}%</strong>
                              </p>
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-700">
                            <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-2 flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M16 6L18.29 8.29L13.41 13.17L9.41 9.17L2 16.59L3.41 18L9.41 12L13.41 16L19.71 9.71L22 12V6H16Z"/>
                              </svg>
                              📋 Verbesserungs-Bereiche
                            </h4>
                            <ul className="text-sm text-emerald-700 dark:text-emerald-200 space-y-2">
                              <li className="flex items-start">
                                <span className="text-emerald-500 mr-2">•</span>
                                <span><strong>Begrüßung:</strong> Herzlicher erster Eindruck (15 Punkte)</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-emerald-500 mr-2">•</span>
                                <span><strong>Produktwissen:</strong> Umfassende Kaffeekompetenz (20 Punkte)</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-emerald-500 mr-2">•</span>
                                <span><strong>VL-Fokus:</strong> Vertuo-Linien aktiv bewerben (15 Punkte)</span>
                              </li>
                              <li className="flex items-start">
                                <span className="text-emerald-500 mr-2">•</span>
                                <span><strong>Abschluss:</strong> Professionelle Verabschiedung (10 Punkte)</span>
                              </li>
                            </ul>
                          </div>

                          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                            <h4 className="font-semibold text-orange-800 dark:text-orange-300 mb-2 flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
                              </svg>
                              🎯 Nächste Mystery Shop Welle
                            </h4>
                            <p className="text-sm text-orange-700 dark:text-orange-200 leading-relaxed">
                              Eine Verbesserung um <strong>nur 3-5%</strong> könnte dir in der nächsten Welle 
                              eine <strong className="text-orange-800 dark:text-orange-300">höhere Prämien-Stufe</strong> sichern. 
                              Konzentriere dich auf die Grundlagen und wiederhole die Schulungsvideos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Schließen button peeking from behind the card */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-[1.65rem] z-0 flex justify-center w-full">
                  <div 
                    className="bg-white dark:bg-gray-900 shadow-sm rounded-b-xl px-8 py-1 border border-gray-100 dark:border-gray-800 cursor-pointer w-52 text-center filter drop-shadow-md"
                    onClick={() => setMysteryFeedbackOpen(!mysteryFeedbackOpen)}
                  >
                    <button className="flex items-center justify-center w-full">
                      <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent text-xs font-medium opacity-75">schließen</span>
                      <ChevronUp className="h-3.5 w-3.5 ml-1 text-indigo-500 transform translate-y-[1px] opacity-75" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mystery Shop Feedback Notification Card */}
          {mysteryShowNewFeedback && (
            <div className="w-full max-w-md mx-auto mb-6">
              <div className="relative">
                {/* Outer glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 via-blue-500 to-indigo-500 rounded-lg blur-sm opacity-75 animate-pulse"></div>
                
                {/* Main card */}
                <Card className="relative bg-gradient-to-r from-purple-400 via-blue-500 to-indigo-500 border-0 shadow-xl overflow-hidden">
                  {/* Animated background pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 via-blue-500/20 to-indigo-500/20 animate-pulse"></div>
                  
                  {/* Header with icon */}
                  {!mysteryFeedbackRead && (
                    <div className="relative py-4 px-6 text-center">
                      <div className="flex items-center justify-center mb-2">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-2 animate-bounce">
                          <Eye className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <h3 className="text-white font-bold text-lg drop-shadow-lg">
                        Neues Mystery Shop Feedback!
                      </h3>
                      <p className="text-white/90 text-sm mt-1 drop-shadow">
                        Du hast ein neues Mystery Shop Feedback erhalten
                      </p>
                    </div>
                  )}
                  
                  {/* Content */}
                  <CardContent className="relative p-6 pt-2">
                    <div className="text-center">
                      {!mysteryFeedbackRead ? (
                        <>
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/20">
                            <div className="text-white text-xs leading-relaxed text-left whitespace-pre-line">
{mysteryFeedbackText}
                            </div>
                          </div>
                          
                          {/* Read button */}
                          <button 
                            onClick={handleMysteryFeedbackRead}
                            className="bg-white text-blue-600 font-medium py-2.5 px-5 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/50"
                          >
                            ✓ Gelesen
                          </button>
                        </>
                      ) : (
                        /* Confirmation message when feedback is read */
                        <div className="py-4">
                          <div className="flex items-center justify-center mb-2">
                            <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                          <p className="text-white font-medium text-sm drop-shadow">
                            Feedback wurde dem Verlauf hinzugefügt
                          </p>
                          <p className="text-white/80 text-xs mt-1">
                            Du kannst es jederzeit in deinem Verlauf einsehen
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Premium Card - Same styling as Schulungen & Videos button */}
          <div className="w-full max-w-md mx-auto mb-6">
            <Card 
              className="border-none shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30 bg-gradient-to-r from-blue-500 from-0% via-indigo-600 via-35% via-purple-500 via-65% to-pink-500 to-100% h-20 flex flex-col items-center justify-center cursor-pointer hover:scale-105 transition-all duration-300"
              onClick={() => setShowPremiumPopup(true)}
            >
              <div className="flex items-center space-x-2 text-white">
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span className="font-bold text-lg">{totalPremiums}€</span>
              </div>
              <h3 className="text-white font-semibold text-xs">Erarbeitete Prämien</h3>
            </Card>
          </div>

          {/* Mystery Shop History Section */}
          <div className="w-full max-w-md mx-auto mb-8">
            <Card className="w-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Purple gradient header */}
              <div className="py-3 px-6 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-t-lg">
                <h3 className="text-center font-medium text-white flex items-center justify-center">
                  <History className="h-4 w-4 mr-2" />
                  Mystery Shop Verlauf ({mysteryHistoryData.length})
                </h3>
              </div>
              
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mysteryCurrentPageData.map((entry, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center p-3 transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer ${
                        !mysteryHistoryExpanded && index > 4 ? 
                          (index === 4 ? 'opacity-50' : 'hidden') : ''
                      }`}
                      onClick={() => setMysterySelectedHistoryEntry(mysterySelectedHistoryEntry === index ? null : index)}
                    >
                      <div className="flex-shrink-0 w-24">
                        <div className="flex items-center">
                          <span className="text-gray-500 dark:text-gray-400">
                            {entry.date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex-1 flex justify-end ml-4">
                        <div className={`text-sm font-medium ${
                          getColorForMysteryShop(entry.percentage) === "custom-gold" 
                            ? 'bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent'
                            : getColorForMysteryShop(entry.percentage) !== "custom-orange" 
                              ? getColorForMysteryShop(entry.percentage) 
                              : ""
                        }`}
                        style={getStyleForMysteryShopColor(getColorForMysteryShop(entry.percentage))}>
                          {entry.percentage}%
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Blurred overlay for collapsed state */}
                  {!mysteryHistoryExpanded && mysteryCurrentPageData.length > 5 && (
                    <div className="relative">
                      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none"></div>
                    </div>
                  )}
                </div>
                
                {/* Footer with Show more/less button and navigation */}
                <div className="p-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    {/* Left navigation arrow - only show if not on first page */}
                    <div className="w-20">
                      {mysteryHistoryPage > 0 && (
                        <button 
                          onClick={() => navigateMysteryHistoryPrev()}
                          className="flex items-center text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                        >
                          <ArrowLeft className="h-3.5 w-3.5 mr-1 text-purple-500" />
                          <span>Neuer</span>
                        </button>
                      )}
                    </div>
                    
                    {/* Show more/less button */}
                    <button 
                      onClick={() => setMysteryHistoryExpanded(!mysteryHistoryExpanded)}
                      className="flex items-center justify-center text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                    >
                      {mysteryHistoryExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1 text-purple-500" />
                          Schließen
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1 text-purple-500" />
                          Show More
                        </>
                      )}
                    </button>
                    
                    {/* Right navigation arrow - only show if not on last page */}
                    <div className="w-20 text-right">
                      {mysteryHistoryPage < mysteryTotalPages - 1 && (
                        <button 
                          onClick={() => navigateMysteryHistoryNext()}
                          className="flex items-center justify-end text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                        >
                          <span>Älter</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1 text-purple-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mystery Shop History Feedback Popup */}
          {mysterySelectedHistoryEntry !== null && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setMysterySelectedHistoryEntry(null)}>
              <div className="w-full max-w-md">
                <Card className="shadow-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                  <div className="py-2 px-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <h3 className="font-medium text-gray-600 dark:text-gray-300 text-sm">
                      Mystery Shop <span className="text-gray-400 dark:text-gray-500">
                        {mysteryCurrentPageData[mysterySelectedHistoryEntry]?.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                      </span>
                    </h3>
                    <button 
                      onClick={() => setMysterySelectedHistoryEntry(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                  
                  <CardContent className="p-4">
                    <ScrollArea className="h-[280px] pr-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                        {mysteryFeedbackText}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Premium Breakdown Popup */}
      {showPremiumPopup && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowPremiumPopup(false)}></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 w-[90vw] max-w-lg max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 text-white p-6 pb-12">
              {/* Close button */}
              <button 
                onClick={() => setShowPremiumPopup(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Header content */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-1">Deine Prämien</h2>
                <p className="text-white/90 text-sm">Aufschlüsselung aller verdienten Mystery Shop Prämien</p>
              </div>
              
              {/* Total amount - overlapping the divider */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2">
                <div className="bg-white dark:bg-gray-900 rounded-full px-5 py-2.5 shadow-lg border-4 border-white dark:border-gray-900">
                  <div className="text-center">
                    <div className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {totalPremiums}€
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      Gesamt verdient
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 pt-12 max-h-[55vh] overflow-y-auto">
              {premiumBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {premiumBreakdown.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center space-x-4">
                        {/* Premium tier indicator */}
                        <div className={`w-3 h-3 rounded-full ${
                          entry.premium === 100 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 shadow-lg shadow-yellow-400/30' : 'bg-gradient-to-r from-green-400 to-green-500 shadow-lg shadow-green-400/30'
                        }`}></div>
                        
                        {/* Date and details */}
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {entry.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                              entry.premium === 100 
                                ? 'bg-gradient-to-r from-[#E0AA3E]/40 via-[#F0D96A]/40 to-[#E0AA3E]/40 text-yellow-800 dark:text-yellow-300' 
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {entry.tier}
                            </span>
                            <span className={`text-xs font-bold ${
                              entry.percentage >= 95 
                                ? 'bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent'
                                : entry.percentage >= 90 
                                  ? 'text-green-600 dark:text-green-400'
                                  : entry.percentage >= 80 
                                    ? 'text-orange-500'
                                    : 'text-red-600 dark:text-red-400'
                            }`}>
                              {entry.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Premium amount */}
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          entry.premium === 100 
                            ? 'bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          +{entry.premium}€
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Noch keine Prämien verdient
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Erreiche mindestens 90% in einem Mystery Shop um deine erste Prämie zu verdienen!
                  </p>
                </div>
              )}
              
              {/* Footer info */}
              {premiumBreakdown.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full"></div>
                      <span>90-94%: 50€</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full"></div>
                      <span>95-100%: 100€</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Leaderboard Popup */}
      {showLeaderboard && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowLeaderboard(false)}></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 w-[90vw] max-w-lg max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 pb-8">
              {/* Close button */}
              <button 
                onClick={() => setShowLeaderboard(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Header content */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-3">
                  <Trophy className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold mb-1">Leaderboard</h2>
                <p className="text-white/90 text-sm">Vergleiche deine Performance mit anderen</p>
              </div>
            </div>
            
            {/* Menu Navigation */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative flex space-x-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                {/* Sliding Background Indicator */}
                <div 
                  className={`absolute top-1.5 bottom-1.5 bg-white dark:bg-gray-700 shadow-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg transition-all duration-300 ease-in-out ${
                    leaderboardCategory === "mcet" 
                      ? "left-1.5 right-[calc(66.66%+0.25rem)]" 
                      : leaderboardCategory === "tma"
                        ? "left-[calc(33.33%+0.25rem)] right-[calc(33.33%+0.25rem)]"
                        : "left-[calc(66.66%+0.25rem)] right-1.5"
                  }`}
                />
                
                <button
                  onClick={() => setLeaderboardCategory("mcet")}
                  className={`flex-1 rounded-lg transition-all duration-300 font-medium text-sm relative z-10 py-2 px-3 ${
                    leaderboardCategory === "mcet" 
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  MC/ET
                </button>
                <button
                  onClick={() => setLeaderboardCategory("tma")}
                  className={`flex-1 rounded-lg transition-all duration-300 font-medium text-sm relative z-10 py-2 px-3 ${
                    leaderboardCategory === "tma" 
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  TMA
                </button>
                <button
                  onClick={() => setLeaderboardCategory("vlshare")}
                  className={`flex-1 rounded-lg transition-all duration-300 font-medium text-sm relative z-10 py-2 px-3 ${
                    leaderboardCategory === "vlshare" 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent" 
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  VL Share
                </button>
              </div>
            </div>
            
            {/* Leaderboard Content */}
            <div className="max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-purple-500/50 hover:scrollbar-thumb-purple-500 leaderboard-scroll-container">
              <div className="space-y-1 p-4">
                                 {getSortedLeaderboard().map((user, index) => {
                   const currentValue = leaderboardCategory === "mcet" ? user.mcet : leaderboardCategory === "tma" ? user.tma : user.vlshare
                   
                   return (
                   <div 
                     key={user.rank} 
                     className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                       user.isCurrentUser 
                         ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700"
                         : user.rank === 1
                           ? "bg-gradient-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/25 dark:to-amber-900/25 hover:from-yellow-200 hover:to-amber-200"
                           : user.rank === 2
                             ? "bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-700/30 dark:to-slate-700/30 hover:from-gray-200 hover:to-slate-200"
                             : user.rank === 3
                               ? "bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 hover:from-amber-200 hover:to-orange-200"
                               : getScoreBackgroundClass(leaderboardCategory, currentValue)
                     }`}
                   >
                    {/* Rank and Name */}
                    <div className="flex items-center space-x-3">
                      {/* Rank badge */}
                      <div 
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          user.rank === 1 
                            ? 'text-white' 
                            : user.rank === 2 
                              ? 'text-white'
                              : user.rank === 3 
                                ? 'text-white'
                                : user.isCurrentUser
                                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                        style={{
                          background: user.rank === 1 
                            ? 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)'
                            : user.rank === 2 
                              ? 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)'
                              : user.rank === 3 
                                ? 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)'
                                : user.isCurrentUser
                                  ? undefined
                                  : undefined
                        }}
                      >
                        {user.rank}
                      </div>
                      
                      {/* Name */}
                      <div className={`font-medium flex items-center space-x-1 ${
                        user.isCurrentUser 
                          ? "text-blue-600 dark:text-blue-400 font-semibold" 
                          : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {user.isCurrentUser ? (
                          <>
                            <User className="h-4 w-4" />
                            <span>Ich</span>
                          </>
                        ) : (
                          <User className={`h-4 w-4 ${
                            user.rank === 1 
                              ? "text-[#E0AA3E]"
                              : user.rank === 2
                                ? "text-gray-500 dark:text-gray-400"
                                : user.rank === 3
                                  ? "text-[#BD965D]"
                                  : "text-gray-400 dark:text-gray-500"
                          }`} />
                        )}
                      </div>
                    </div>
                    
                                         {/* Score */}
                     <div className={`font-bold text-lg ${
                       user.isCurrentUser 
                         ? "text-blue-600 dark:text-blue-400" 
                         : user.rank === 1
                           ? "bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent"
                           : user.rank === 2
                             ? "bg-gradient-to-r from-gray-500 via-gray-400 to-slate-500 bg-clip-text text-transparent"
                             : user.rank === 3
                               ? "bg-gradient-to-r from-amber-600 via-orange-500 to-amber-700 bg-clip-text text-transparent"
                               : getScoreColorClass(leaderboardCategory, currentValue)
                     }`}>
                       {leaderboardCategory === "mcet" 
                         ? user.mcet.toFixed(1)
                         : leaderboardCategory === "tma"
                           ? `${user.tma}%`
                           : `${user.vlshare}%`
                       }
                     </div>
                  </div>
                                    )
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {leaderboardCategory === "mcet" 
                    ? "MC/ET = Verkäufe von Kaffeemaschinen pro Einsatztag"
                    : leaderboardCategory === "tma"
                      ? "TMA = Anteil der Verkäufe mit zusätzlicher Beratung"
                      : "VL Share = Anteil der Vertuo-Linie Verkäufe"
                  }
                </p>
                                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                   Deine Position: <span className="font-medium text-blue-600 dark:text-blue-400">#{getCurrentUserRank()}</span>
                 </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
