import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  console.log('🤖 Eddie Chat Request Started');
  
  try {
    // Get authenticated user
    const supabase = createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('❌ User not authenticated');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ User authenticated:', user.id);
    
    const body = await req.json().catch(() => ({}))
    const userMessage: string = (body?.message || '').toString()
    const conversationId: string = body?.conversationId || `conv-eddie-${user.id}`

    console.log('💬 User message received:', {
      hasMessage: !!userMessage,
      messageLength: userMessage.length,
      messagePreview: userMessage.substring(0, 100) + (userMessage.length > 100 ? '...' : '')
    });

    if (!userMessage.trim()) {
      console.log('❌ Empty message provided');
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log('❌ OpenAI API key not configured');
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    console.log('✅ OpenAI API key found, proceeding with Eddie chat');

    // Fetch promotor data from database
    const svc = createSupabaseServiceClient()
    console.log('📊 Fetching promotor data from database...');

    // Get recent chat messages (last 15 minutes) for conversation context
    // Calculate 15 minutes ago in UTC (database stores in UTC)
    const now = new Date()
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
    
    console.log('🕐 Timestamp check:', {
      nowUTC: now.toISOString(),
      fifteenMinAgoUTC: fifteenMinutesAgo.toISOString(),
      nowLocal: now.toLocaleString('de-AT', { timeZone: 'Europe/Vienna' }),
      cutoffLocal: fifteenMinutesAgo.toLocaleString('de-AT', { timeZone: 'Europe/Vienna' })
    });

    // First, check ALL existing messages for this user before deletion
    const { data: allMessagesBeforeDelete } = await svc
      .from('eddie_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    
    console.log('📊 ALL messages in database BEFORE deletion:', allMessagesBeforeDelete?.length || 0);
    if (allMessagesBeforeDelete && allMessagesBeforeDelete.length > 0) {
      allMessagesBeforeDelete.forEach((msg: any, idx: number) => {
        const age = Math.floor((now.getTime() - new Date(msg.created_at).getTime()) / 60000);
        console.log(`  Message ${idx + 1}: [${msg.role}] ${msg.content.substring(0, 50)}... | Age: ${age} minutes | Created: ${msg.created_at}`);
      });
    }

    // Delete ALL messages older than 15 minutes for this user
    const { error: deleteError, count: deletedCount } = await svc
      .from('eddie_chat_messages')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)
      .lt('created_at', fifteenMinutesAgo.toISOString())
    
    if (deleteError) {
      console.error('⚠️ Error deleting old messages:', deleteError);
    } else {
      console.log(`🗑️ Deleted ${deletedCount || 0} old messages (older than 15 minutes)`);
    }

    // Get recent chat messages (last 15 minutes)
    const { data: recentMessages } = await svc
      .from('eddie_chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', fifteenMinutesAgo.toISOString())
      .order('created_at', { ascending: true })
    
    console.log('💬 Recent chat messages AFTER deletion:', recentMessages?.length || 0);
    console.log('📝 Deletion triggered by: Promotor sending message to Eddie');
    console.log('⏰ Check frequency: Every time a message is sent (not every minute, on-demand only)');

    // Save user message to database
    await svc
      .from('eddie_chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: userMessage
      })

    // 1. Get ALL assignments (Einsätze) - past and future for this promotor
    // First get all assignment IDs where this user is a participant
    const { data: userAssignments } = await svc
      .from('assignment_participants')
      .select('assignment_id')
      .eq('user_id', user.id)
    
    const userAssignmentIds = (userAssignments || []).map(ua => ua.assignment_id)
    
    // Then get all those assignments (past and future)
    const { data: assignments } = await svc
      .from('assignments_with_buddy_info')
      .select('*')
      .in('id', userAssignmentIds.length > 0 ? userAssignmentIds : ['00000000-0000-0000-0000-000000000000']) // dummy ID if no assignments
      .order('start_ts', { ascending: false }) // Most recent first
      .limit(50) // Increased limit to include more history
    
    const relevantAssignments = assignments || []

    // 2. Get documents
    const { data: documents } = await svc
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 3. Get promotor profile (includes bank data)
    const { data: promotorProfile } = await svc
      .from('promotor_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    // Extract bank data from promotor profile
    const bankData = promotorProfile ? {
      bank_holder: promotorProfile.bank_holder,
      bank_name: promotorProfile.bank_name,
      bank_iban: promotorProfile.bank_iban,
      bank_bic: promotorProfile.bank_bic
    } : null

    // 4. Get user profile (for display_name and role only)
    const { data: userProfile } = await svc
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    // Note: applications table is NOT queried - all promotor data comes from promotor_profiles
    // promotor_profiles is the single source of truth for all personal data

    // 5. Get dienstvertrag files and configured contract hours
    const { data: contracts } = await svc
      .from('dienstvertrag_files')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: profileContractMeta } = await svc
      .from('promotor_profiles')
      .select('contract_hours_per_week')
      .eq('user_id', user.id)
      .maybeSingle()

    // 6. Get access credentials (Zugangsdaten)
    const { data: accessCredentials } = await svc
      .from('access_credentials')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    // 7. Get KPI feedback history for statistics
    const { data: kpiFeedbackHistory } = await svc
      .from('kpi_feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    console.log('✅ Data fetched:', {
      assignments: relevantAssignments?.length || 0,
      documents: documents?.length || 0,
      hasBankData: !!bankData,
      hasPromotorProfile: !!promotorProfile,
      hasUserProfile: !!userProfile,
      contracts: contracts?.length || 0,
      hasAccessCredentials: !!accessCredentials,
      kpiFeedback: kpiFeedbackHistory?.length || 0
    });

    // Format access credentials data
    let zugangsDaten = 'Keine Zugangsdaten gespeichert.'
    if (accessCredentials) {
      const credentials = []
      
      if (accessCredentials.huebner_email || accessCredentials.huebner_password) {
        credentials.push(`Hübner:
Email: ${accessCredentials.huebner_email || 'Nicht angegeben'}
Passwort: ${accessCredentials.huebner_password || 'Nicht angegeben'}`)
      }
      
      if (accessCredentials.demotool_email || accessCredentials.demotool_password) {
        credentials.push(`Demotool:
Email: ${accessCredentials.demotool_email || 'Nicht angegeben'}
Passwort: ${accessCredentials.demotool_password || 'Nicht angegeben'}`)
      }
      
      if (accessCredentials.tma_email || accessCredentials.tma_password) {
        credentials.push(`TMA:
Email: ${accessCredentials.tma_email || 'Nicht angegeben'}
Passwort: ${accessCredentials.tma_password || 'Nicht angegeben'}`)
      }
      
      if (accessCredentials.boost_app_email || accessCredentials.boost_app_password) {
        credentials.push(`Boost App:
Email: ${accessCredentials.boost_app_email || 'Nicht angegeben'}
Passwort: ${accessCredentials.boost_app_password || 'Nicht angegeben'}`)
      }
      
      if (credentials.length > 0) {
        zugangsDaten = credentials.join('\n\n')
      }
    }

    // Format KPI data (same logic as statistiken page)
    let kpiDaten = 'Keine KPI-Daten verfügbar.'
    if (kpiFeedbackHistory && kpiFeedbackHistory.length > 0) {
      // Sort by created_at descending (newest first)
      const sortedKpiFeedback = [...kpiFeedbackHistory].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      // Map to expected format
      const historyData = sortedKpiFeedback.map((item: any) => ({
        date: new Date(item.created_at),
        mcet: item.mc_et,
        tma: item.tma,
        vl: item.vl_value
      }))

      if (historyData.length > 0) {
        // Calculate statistics (same logic as statistiken page)
        // Latest wave
        const currentWave = historyData[0]
        const previousWave = historyData[1]
        const sixWavesAgo = historyData[6]

        // Calculate averages for last 6 waves
        const last6Waves = historyData.slice(0, Math.min(6, historyData.length))
        const sixMonthsAvg = {
          mcet: last6Waves.reduce((sum: number, entry: any) => sum + entry.mcet, 0) / last6Waves.length,
          tma: last6Waves.reduce((sum: number, entry: any) => sum + entry.tma, 0) / last6Waves.length,
          vl: last6Waves.reduce((sum: number, entry: any) => sum + entry.vl, 0) / last6Waves.length
        }

        // Calculate all time averages
        const allTimeAvg = {
          mcet: historyData.reduce((sum: number, entry: any) => sum + entry.mcet, 0) / historyData.length,
          tma: historyData.reduce((sum: number, entry: any) => sum + entry.tma, 0) / historyData.length,
          vl: historyData.reduce((sum: number, entry: any) => sum + entry.vl, 0) / historyData.length
        }

        // Helper to calculate percentage change
        const calcPercentChange = (current: number, previous: number) => {
          const change = ((current - previous) / previous) * 100
          return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`
        }

        kpiDaten = `KPI ERKLÄRUNG:

MC/ET (Maschinen pro Einsatztag):
Dies ist die durchschnittliche Anzahl an Kaffeemaschinen, die du pro Arbeitstag verkaufst. Werte ab 4,0 und höher sind wirklich gute Zahlen! Dieser KPI zeigt deine Verkaufseffizienz.

TMA % (Take Me Away Anteil):
Dies ist der Prozentsatz der verkauften Maschinen, bei denen der Kunde deinen Gutschein verwendet und die Maschine direkt im MediaMarkt gekauft hat. Manche Kunden nehmen den Gutschein mit und kaufen die Maschine später woanders. Werte ab 85% und höher sind sehr gut!

VL Share (Vertuo-Linien Anteil):
Dies ist der Prozentsatz aller verkauften Maschinen aus der Vertuo-Reihe. Werte ab 10% sind gut, aber beachte: Wenn dein MC/ET niedrig ist, ist es leichter, über 10% VL Share zu erreichen. Dieser KPI sollte immer im Kontext mit MC/ET betrachtet werden.

AKTUELLE KPI WERTE:

Letzte Welle (aktuellster Monat):
MC/ET: ${currentWave.mcet.toFixed(1)}${previousWave ? ` (${calcPercentChange(currentWave.mcet, previousWave.mcet)} im Vergleich zur Vorwelle)` : ''}
TMA: ${currentWave.tma.toFixed(1)}%${previousWave ? ` (${calcPercentChange(currentWave.tma, previousWave.tma)} im Vergleich zur Vorwelle)` : ''}
VL Share: ${currentWave.vl.toFixed(1)}%${previousWave ? ` (${calcPercentChange(currentWave.vl, previousWave.vl)} im Vergleich zur Vorwelle)` : ''}

6-Monats-Durchschnitt:
MC/ET: ${sixMonthsAvg.mcet.toFixed(1)}${sixWavesAgo ? ` (${calcPercentChange(currentWave.mcet, sixWavesAgo.mcet)} Veränderung von vor 6 Wellen zu jetzt)` : ''}
TMA: ${sixMonthsAvg.tma.toFixed(1)}%${sixWavesAgo ? ` (${calcPercentChange(currentWave.tma, sixWavesAgo.tma)} Veränderung von vor 6 Wellen zu jetzt)` : ''}
VL Share: ${sixMonthsAvg.vl.toFixed(1)}%${sixWavesAgo ? ` (${calcPercentChange(currentWave.vl, sixWavesAgo.vl)} Veränderung von vor 6 Wellen zu jetzt)` : ''}

All-Time Durchschnitt:
MC/ET: ${allTimeAvg.mcet.toFixed(1)} (Optimal: 4,5+, Differenz: ${(allTimeAvg.mcet - 4.5).toFixed(1)})
TMA: ${allTimeAvg.tma.toFixed(1)}% (Optimal: 75%+, Differenz: ${(allTimeAvg.tma - 75).toFixed(1)}%)
VL Share: ${allTimeAvg.vl.toFixed(1)}% (Optimal: 10%+, Differenz: ${(allTimeAvg.vl - 10).toFixed(1)}%)

Anzahl erfasster Wellen: ${historyData.length}`
      }
    }

    // Format assignment data for prompt - separate past and future
    let einsatzDaten = 'Keine Einsätze gefunden.'
    if (relevantAssignments && relevantAssignments.length > 0) {
      const now = new Date()
      const futureAssignments = relevantAssignments.filter(a => new Date(a.start_ts) >= now)
      const pastAssignments = relevantAssignments.filter(a => new Date(a.start_ts) < now)
      
      let formattedData = ''
      
      // Future assignments
      if (futureAssignments.length > 0) {
        formattedData += 'KOMMENDE EINSÄTZE:\n\n'
        formattedData += futureAssignments.map((a, index) => {
          const startDate = new Date(a.start_ts)
          const endDate = new Date(a.end_ts)
          const dateStr = startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const timeStart = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          const timeEnd = endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          
          return `Einsatz ${index + 1}:
Datum: ${dateStr}
Adresse: ${a.location_text || 'Keine Adresse angegeben'}
Uhrzeit: ${timeStart}–${timeEnd}
${a.buddy_display_name ? `Buddy: ${a.buddy_display_name}` : ''}
Status: ${a.status || 'offen'}`
        }).join('\n\n')
      }
      
      // Past assignments
      if (pastAssignments.length > 0) {
        if (formattedData) formattedData += '\n\n'
        formattedData += 'VERGANGENE EINSÄTZE:\n\n'
        formattedData += pastAssignments.slice(0, 20).map((a, index) => {
          const startDate = new Date(a.start_ts)
          const endDate = new Date(a.end_ts)
          const dateStr = startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          const timeStart = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          const timeEnd = endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
          
          return `Einsatz ${index + 1}:
Datum: ${dateStr}
Adresse: ${a.location_text || 'Keine Adresse angegeben'}
Uhrzeit: ${timeStart}–${timeEnd}
${a.buddy_display_name ? `Buddy: ${a.buddy_display_name}` : ''}
Status: ${a.status || 'offen'}`
        }).join('\n\n')
      }
      
      einsatzDaten = formattedData
    }

    // Format document data
    let dokumentDaten = 'Keine Dokumente hochgeladen.'
    if (documents && documents.length > 0) {
      dokumentDaten = documents.map(doc => {
        const status = doc.status === 'uploaded' ? 'Uploaded (noch nicht geprüft)' :
                      doc.status === 'rejected' ? 'Rejected (abgelehnt, bitte neu hochladen)' :
                      doc.status === 'accepted' ? 'Accepted (angenommen)' :
                      'Noch nicht hochgeladen'
        return `${doc.document_type}: ${status}`
      }).join('\n')
    }

    // Format bank data from promotor_profiles
    let bankDaten = 'Keine Bankdaten angegeben. Bitte in der Profil-Seite eingeben.'
    if (bankData && (bankData.bank_iban || bankData.bank_bic || bankData.bank_holder || bankData.bank_name)) {
      const fields = Object.entries(bankData)
        .filter(([key, value]) => value) // Only include fields with values
        .map(([key, value]) => {
          const label = key === 'bank_iban' ? 'IBAN' :
                       key === 'bank_bic' ? 'BIC' :
                       key === 'bank_holder' ? 'Kontoinhaber' :
                       key === 'bank_name' ? 'Bank' : key
          return `${label}: ${value}`
        })
      bankDaten = fields.length > 0 ? fields.join('\n') : 'Keine Bankdaten angegeben. Bitte in der Profil-Seite eingeben.'
    }

    // Format promotor general data - ALL fields from promotor_profiles ONLY
    let promotorDaten = 'Keine Profildaten verfügbar.'
    const dataFields: string[] = []
    
    // Display name from user_profiles
    if (userProfile?.display_name) {
      dataFields.push(`Name: ${userProfile.display_name}`)
    }
    
    // ALL Promotor Profile data (single source of truth)
    if (promotorProfile) {
      Object.entries(promotorProfile)
        .filter(([key]) => !['id', 'user_id', 'created_at', 'updated_at', 'bank_holder', 'bank_name', 'bank_iban', 'bank_bic'].includes(key))
        .forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            const label = key === 'phone' ? 'Telefon' :
                         key === 'address' ? 'Adresse' :
                         key === 'postal_code' ? 'Postleitzahl' :
                         key === 'city' ? 'Stadt' :
                         key === 'region' ? 'Region' :
                         key === 'working_days' ? 'Arbeitstage' :
                         key === 'height' ? 'Körpergröße' :
                         key === 'clothing_size' ? 'Kleidergröße' :
                         key === 'birth_date' ? 'Geburtsdatum' :
                         key === 'social_security_number' ? 'SV-Nummer' :
                         key === 'citizenship' ? 'Staatsbürgerschaft' :
                         key === 'stammmarkt' ? 'Stammmarkt' :
                         key === 'has_driving_license' ? 'Führerschein' :
                         key === 'has_car' ? 'Auto' :
                         key === 'has_work_permit' ? 'Arbeitsbewilligung' : key
            const displayValue = Array.isArray(value) ? value.join(', ') :
                                typeof value === 'boolean' ? (value ? 'Ja' : 'Nein') :
                                value
            dataFields.push(`${label}: ${displayValue}`)
          }
        })
    }
    
    if (dataFields.length > 0) {
      promotorDaten = dataFields.join('\n')
    }

    // Format contract data
    let vertragDaten = 'Kein Dienstvertrag vorhanden.'
    if (contracts && contracts.length > 0) {
      const activeContract = contracts.find((c: any) => c.is_active) || contracts[0]
      const fileName = activeContract?.file_name || activeContract?.file_path?.split('/').pop() || 'Datei'
      vertragDaten = `Status: ${activeContract?.is_active ? 'aktiv' : 'hinterlegt'}
Stunden pro Woche: ${profileContractMeta?.contract_hours_per_week || 'Nicht angegeben'}
Datei: ${fileName}
Hinterlegt am: ${activeContract?.created_at ? new Date(activeContract.created_at).toLocaleDateString('de-DE') : 'Nicht angegeben'}`
    }

    // Format recent chat history for context
    let chatHistory = 'Keine vorherigen Nachrichten in diesem Zeitfenster.'
    if (recentMessages && recentMessages.length > 0) {
      chatHistory = recentMessages.map((msg: any) => {
        const timestamp = new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        const roleName = msg.role === 'user' ? 'Promotor' : 'Eddie'
        return `[${timestamp}] ${roleName}: ${msg.content}`
      }).join('\n')
    }

    // Get current Austrian date and time
    const currentAustrianTime = now.toLocaleString('de-AT', { 
      timeZone: 'Europe/Vienna',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    const systemPrompt = `Heutiger Tag: ${currentAustrianTime}

Dein Name ist Eddie, Eddie der Assistent, und du weißt nicht nur alles über den Coffee Advisor, mit dem du schreibst, du bist auch absoluter Nespresso Kaffee-Experte! Du antwortest immer nur auf das, wonach du gefragt wirst, und gibst nicht mehr Informationen als notwendig. Du bist freundlich, motiviert und auch motivierend, vielleicht ein wenig lustig, wenn es passt; geht es aber um sachliche Sachen, antworte bitte sachlich und mache Späße nur dort, wo sie auch sicher gut passen!

Hintergrundinfos Über uns: 

Wir sind das größte Marketingunternehmen in Österreich names SalesCrew und wir haben die Firma Nespresso als Kunden. Unsere Promotoren/Coffee Advisors gehen in MediaMärkte in ganz Österreich und verkaufen am POS Kaffee, Kaffeemaschinen sowie Zubehör. Alle Produkte werden später noch gelistet. Die Aufgabe unserer Promotoren/Coffee Advisors ist es, mit Kunden im MediaMarkt zu sprechen, sie zu beraten und im besten Fall auch eine Maschine zu verkaufen. Um Arbeitsqualität zu fördern, gibt es immer wieder Sales-Challenges, bei denen der Fokus auf ein bestimmtes Produkt gelegt wird, und dafür gibt es auch saftige Prämien. Intern haben wir fünf Mitarbeiter. Die Agency Head ist Susanne, der Senior Project Manager ist Mario, die Project Managerin ist Shirin, der Junior Project Manager ist Jack, Project Assistant ist Hannah. Diese fünf internen Mitarbeiter arbeiten eng zusammen mit den Promotoren; die Internen kümmern sich um alles rund um die Promotion selbst. Sie bekommen eine Liste von Nespresso mit Einsätzen, und intern werden dann diese Einsätze an die Promotoren verplant. Dafür werden sie angerufen. Ein Promotor, der das erste Mal eine Promotion macht, hat einen sogenannten Buddy-Tag, bei dem der neue Promotor einen Tag mit einem Buddy (erfahrener Promotor) am POS verbringt, um alles zu lernen. Einsätze sind in der Regel unter der Woche immer von 9:30–18:30 mit einer Stunde Pause. Es kann aber auch – und das meistens am Wochenende – zu einem 9:30–15:30-Einsatz kommen. Bei diesem Einsatz gibt es keine Pause.

App Hintergrundinfos: 

Ein Promotor, der sich bei uns in der App anmeldet, hat die Onboarding-Fragen beantwortet und bekommt anschließend von uns das Login-Passwort. Da wir dieses Passwort kennen, wird dringend empfohlen, es zu ändern – das geht im Header unter dem Einstellungs-Icon sehr schnell über die App. Dann müssen die Promotoren noch auf der Profil-Seite (im Menü die letzte Option) Bankdaten eingeben und die Zugänge wie Hübner, Boost App, TMA, Demotool für später speichern. Wenn der Account fertig angelegt ist, muss der Promotor über die Dokumente-Karte in der Profil-Page die Pflichtdokumente hochladen – das sind jene, bei denen nicht „optional" steht; man kann die verpflichtenden Dokumente, die noch fehlen, auch in der To-do-Liste im Dashboard sehen. Wenn man über das Upload-Icon links neben dem Status-Icon (normalerweise X) ein Dokument hochgeladen hat, ist statt des roten X jetzt ein drehender Kreis in Orange; das bedeutet, dass das Dokument abgesendet, aber noch nicht angenommen wurde. Die internen Mitarbeiter nehmen dann das Dokument an, und danach hat der Promotor ein grünes Häkchen als Bestätigung. Links neben dem grünen Häkchen, wo vorher das Upload-Icon war, ist jetzt ein Augen-Icon – darüber kann man sich das Dokument ansehen. Sollten die internen Mitarbeiter aus irgendeinem Grund das Dokument abgelehnt haben (nicht leserlich, falsches Dokument usw.), sieht der Promotor auf seiner Seite wieder das Upload-Icon mit dem roten X. Alle nicht optionalen Dokumente müssen abgeschickt und angenommen werden. Der Dienstvertrag wird danach von internen Mitarbeitern direkt als Datei in der Profil-Seite hinterlegt. Der Promotor kann den hinterlegten Vertrag dort über den Dienstvertrag-Button ansehen. Wenn das auch fertig ist, würde der Promotor als nächsten Schritt nicht direkt, sondern im Laufe der nächsten Stunden bis Tage, auf der Einsatz-Page (zweite Option im Menü) 3–5 Promotion-Termine für einen Buddy-Tag bekommen (auf der Karte im Header steht: „Suche dir deinen Buddy-Tag selber aus!") – dort kann man einen aussuchen und annehmen. Im Kalender im Dashboard sieht man jetzt den Buddy-Tag als Promotion. Wenn der Promotor schon ein eingearbeiteter Promotor ist, bekommt man einige Promotions zugeschickt (normale Promotions, kein Buddy) und kann sich aus mehreren welche aussuchen. Wenn man das gemacht hat, wird man in eine Warteschleife gesetzt und der Promotor sieht einen Wartescreen. Wenn die internen Mitarbeiter die Einsätze bewilligen, muss der Promotor dies nur noch wahrnehmen und auf „Verstanden" drücken; sollten sie es ablehnen, dann bekommt der Promotor Ersatztermine zugeschickt. Sollte ein Promotor krank werden oder einen Notfall haben, kann der Promotor in der Einsatz-Page so etwas beantragen über „Krankenstand beantragen" oder „Notfall beantragen". Bevor sie aber auf „Beantragen" drücken, müssen sie diese Nummer anrufen: +43699141630. Die App ist noch in Entwicklung; wenn du über etwas gefragt wirst, das mit Funktionen zu tun hat, die nicht hier im Prompt stehen, dann sag bitte, dass es noch nicht so weit ist und dass diese Funktionen bald kommen. Die Zugänge wie Hübner, Boost App, TMA und Demotool sind nicht verpflichtender Teil des Onboardings und nur Hilfen für den eigenen Arbeitsalltag.

!!!!!WICHTIGE REGELN IMMER IMMER IMMER BEACHTEN NIE VERLETZEN:

1. Schreibe menschlich und hilfreich. KEINE unnötigen Dashes ("-") im Satz – ersetze Gedankenstriche konsequent durch Kommas. Menschliche Sprache, verständnisvoll und lösungsorientiert; strikt an die Regeln! Keine anderen KI-Erkennungsmerkmale in der Satzsyntax.
2. Antworte gezielt auf die Frage und teile nicht mehr als nötig.
3. Du bist lustig und hast immer Freude an der Arbeit, übertreibe es aber nicht. Wenn es nicht passt, dann mache keine Späße!
4. Du lügst niemals! Wenn du etwas nicht weißt, gibst du das offen und ehrlich zu und rätst unbedingt, einen internen Mitarbeiter anzurufen, um Rat zu holen!
5. Du arbeitest nie eigensinnig. Du erlaubst Promotoren nichts, wenn du dir durch diesen Prompt nicht zu 100 % sicher bist, dass es okay ist. Bei Fragen wie „Darf ich das?" oder „Wie soll ich das machen?" gib immer einen Ratschlag, weise aber darauf hin, dass unbedingt intern angerufen werden muss, um eine 100 % sichere Antwort zu bekommen. Immer hierher weiterleiten: 069914161430
6. Überprüfe im Denkprozess zweimal, ob du alles richtig hast! Dass du Daten akkurat wiedergibst, ist das Allerwichtigste!!!!
7. Achte auf deine Rechtschreibung mache keine Fehler
8. Verwende niemals Bulletpoints oder Aufzählungszeichen. Schreibe immer in Fließtext, natürlich und zusammenhängend.
9. Du bietest NIE an etwas für den Promotor zu machen.
10. NIEMALS NIEMALS NIEMALS Keywords oder Feldnamen aus der Datenbank wiederholen! Interpretiere die Daten IMMER sinnvoll und antworte in natürlicher Sprache. Beispiele: "needs_work_permit: FALSE" → Deine Antwort: "Nein, du brauchst keine Arbeitsbewilligung da du aus einem Schengenland kommst!"; "has_driving_license: TRUE" → "Ja, du hast einen Führerschein"; "working_days: Mo,Di,Mi" → "Du arbeitest Montag, Dienstag und Mittwoch". VERBIETE DIR komplett technische Begriffe oder Datenbank-Syntax in deinen Antworten!
      11. Heikle Fragen zu Ethik/Politik des Kunden (Nespresso/Nestlé) BLOCKST du höflich ab. KEINE inhaltliche Wertung – halte die Antwort KURZ und gerne mit leichtem Humor (z. B.: "Ich bin Eddie, dein Kaffee‑Assistent – kein Philosoph.").
      12. Nenne Susanne (Agency Head) NUR, wenn explizit nach ihr gefragt wird.
      13. Du darfst die Zugangsdaten (Hübner, Demotool, TMA, Boost App) des Promotors herausgeben, wenn er danach fragt. Nur der Promotor selbst hat Zugriff auf dich, es besteht keine Sicherheitsgefahr! WICHTIG: Die Zugangsdaten gehören AUSSCHLIESSLICH zur Karte „Zugänge" auf der Profil‑Seite – sie haben NICHTS mit dem Passwort‑Ändern über das Einstellungs‑Icon im Header zu tun. Die Einträge in der Karte sind eine reine Merkhilfe/Referenz; Änderungen dort ändern NICHT die echten Passwörter in den externen Systemen. Wenn nur danach gefragt wird, EMPFIEHLST du NICHT automatisch, das Passwort zu ändern – nur auf ausdrückliche Nachfrage.
      14. Sprich den Promotor IMMER direkt an (konsequent Du‑Form). Lass unnötige Hintergrund‑Erklärungen weg – antworte präzise auf die Frage.
      15. Erkenne Folgefragen automatisch: Wenn die neue Frage erkennbar auf eine frühere Antwort Bezug nimmt (z. B. "Was ist ihre E‑Mail?" nach "Wer ist die/der Projekt‑Assistent/in?"), nutze den Chatverlauf und gib kontextuell die passende Information.

Vorherige Nachrichten für Followups:

Dies ist der Verlauf eurer aktuellen Unterhaltung. Nutze diese Informationen NUR, wenn der Promotor eine Folgefrage stellt oder sich auf etwas Vorheriges bezieht. Wiederhole NICHT die Keywords oder den Chatverlauf, verstehe den Kontext und antworte natürlich darauf, als würdest du dich an ein normales Gespräch erinnern.

REGELN für Followups:
- Lies den Verlauf sorgfältig und vollständig in chronologischer Reihenfolge (oben → unten) und verstehe die Unterhaltung. Antworte STANDARDMÄSSIG auf die NEUESTE Nachricht im Verlauf. Nur wenn ausdrücklich darum gebeten wird, bezieh dich auf eine ältere Nachricht.
- Zitiere NIEMALS wörtlich aus dem Chatverlauf
- Antworte so, als würdest du dich natürlich an das Gespräch erinnern
- Nutze den Kontext nur wenn nötig für Folgefragen
- Wenn keine Folgefrage gestellt wird, ignoriere den Chatverlauf komplett
- Wenn eine Frage offensichtlich eine Folgefrage auf die vorherige Antwort ist, konzentriere dich darauf, die Folgefrage präzise zu erfüllen.

Beispiel:
Frage 1: "Wer ist die/der Projekt‑Assistent/in?"
Eddie: "Hannah ist die Projekt‑Assistentin."
Folgefrage: "Wie kann ich sie erreichen?"
Eddie: "Du erreichst Hannah unter hannah.klahn@salescrew.at."

${chatHistory}

Interne TEL und Kontakte: 

Alle Internen Mitarbeiter sind unter dieser Nummer erreichbar: 069914161430 

Shirin: shirin.mastalir@salescrew.at
Jack: jack.parker@salescrew.at
Hannah: hannah.klahn@salescrew.at
Mario: mario.kriszta@salescrew.at
Susanne: s.kristek@salescrew.at

Daten Einsätze: 

Einsätze spezifische regeln:

1. Wenn Fragen zu Einsätzen (normal oder Buddy) gestellt werden, findest du hier alle notwendigen Daten.
2. Wenn jemand nach einem oder mehreren Einsätzen fragt, erwähne den Einsatz in der Struktur:
Adresse: (Einsatzadresse)
Uhrzeit: (von–bis des Einsatzes)
(falls Buddy-Tag) Buddy: (Name des Buddies)
3. Achte sehr genau auf die Daten und darauf, dass du die richtigen Daten für den richtigen Einsatz gefunden hast, nach dem gefragt wurde.

${einsatzDaten}

Daten Onboarding: 

Onboarding spezifische Regeln: 

1. Der Fragebogen wurde bereits ausgefüllt, weil der Promotor sonst keinen Zugang zur App hätte.
2. Verpflichtend sind alle Dokumente, die nicht „optional" daneben stehen haben, oder Dokumente, nach denen interne Mitarbeiter spezifisch gefragt haben.
3. In der Datenbank gibt es für Dokumente vier Status: Kein Eintrag in der DB: noch keines eingeschickt. Uploaded: wurde geschickt, aber noch nicht approved. Rejected: wurde abgelehnt, neues Dokument muss geschickt werden. Accepted: Dokument wurde akzeptiert und ist aktiv, alles richtig gemacht!
4. bankdaten müssen Manuell ausgefüllt werden in der Profil seite (letzte menü Option ganz rechts) 

Dokumente: 
${dokumentDaten}

Bankdaten: 
${bankDaten}

Generelle Daten: 
${promotorDaten}

Dienstvertrag:
${vertragDaten}

Zugangsdaten:
${zugangsDaten}

KPI Daten & Performance:

KPI spezifische Regeln:

1. Die KPI-Werte zeigen die Verkaufsperformance des Promotors. Diese Daten werden monatlich in "Wellen" erfasst.
2. Nutze die KPI-Erklärungen, um dem Promotor seine Werte verständlich zu erklären.
3. Sei motivierend bei guten Werten, konstruktiv bei Verbesserungspotenzial.
4. Die Vergleichswerte (Prozentangaben) zeigen Trends - nutze sie, um Entwicklungen zu erkennen.
5. Erwähne die Optimalwerte nur, wenn danach gefragt wird oder wenn es für den Kontext sinnvoll ist.

${kpiDaten}`

    const userPrompt = `Promotor fragt: ${userMessage}`

    console.log('🌐 Calling OpenAI GPT-5 Chat API...');
    const requestPayload = {
      model: 'gpt-5-chat-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6
    };
    
    console.log('📤 API request payload:', {
      model: requestPayload.model,
      conversationId: conversationId,
      messages: requestPayload.messages.length,
      temperature: requestPayload.temperature
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    })

    console.log('📥 OpenAI response status:', response.status);

    if (!response.ok) {
      const errText = await response.text()
      console.error('❌ OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errText,
        conversationId: conversationId
      });
      
      // Return detailed error to frontend for debugging
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errText,
        conversationId: conversationId
      }, { status: 500 })
    }

    const result = await response.json()
    console.log('📥 OpenAI response structure:', {
      hasChoices: Array.isArray(result?.choices),
      choiceCount: result?.choices?.length || 0,
      responseId: result?.id
    });

    const aiResponse: string = (result?.choices?.[0]?.message?.content || '').trim()
    console.log('💬 Extracted AI response:', {
      hasResponse: !!aiResponse,
      responseLength: aiResponse.length,
      responsePreview: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : '')
    });
    
    if (!aiResponse) {
      console.error('❌ Empty AI response extracted');
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    // Save Eddie's response to database
    await svc
      .from('eddie_chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: aiResponse
      })

    console.log('✅ Eddie chat completed successfully');
    return NextResponse.json({ ok: true, response: aiResponse, conversationId })
  } catch (e: any) {
    console.error('❌ Critical error in Eddie chat:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
