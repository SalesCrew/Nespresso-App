import { NextResponse } from 'next/server'
import { recordDataAccess } from '@/lib/audit/dataAccess'
import { requireAdmin } from '@/lib/auth/routeGuards'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const body = await req.json().catch(() => ({}))
    const name: string = (body?.name ?? '').toString().trim().slice(0, 200)
    const userId: string | null = /^[0-9a-f-]{36}$/i.test(String(body?.userId || '')) ? String(body.userId) : null
    const mcetRaw: string = (body?.mcet ?? '').toString()
    const tmaRaw: string = (body?.tma ?? '').toString()
    const vlShareRaw: string = (body?.vlShare ?? '').toString()
    const category: string = (body?.category ?? 'Neutral').toString()
    const mcetRank: number = parseInt((body?.mcetRank ?? '0').toString())
    const vlRank: number = parseInt((body?.vlRank ?? '0').toString())

    // Format numeric values to one decimal with comma separator (de-DE style)
    const parseNum = (v: string): number => {
      const cleaned = (v || '').replace('%', '').replace(',', '.').trim()
      const n = parseFloat(cleaned)
      return isNaN(n) ? NaN : n
    }
    const fmt1 = (n: number): string => {
      if (isNaN(n)) return ''
      return n.toFixed(1).replace('.', ',')
    }
    const mcetNum = parseNum(mcetRaw)
    const tmaNum = parseNum(tmaRaw)
    const vlNum = parseNum(vlShareRaw)
    const mcetDisplay = fmt1(mcetNum)
    const tmaDisplay = fmt1(tmaNum)
    const vlDisplay = fmt1(vlNum)

    // Get current month name in German
    const currentDate = new Date()
    const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember']
    const currentMonthName = monthNames[currentDate.getMonth()]

    // Extract first name from full name
    const pName = name.split(' ')[0] || 'Promotor'
    const namePlaceholder = '{{VORNAME}}'

    // Map category to mood text
    const moodMap: Record<string, string> = {
      'Beeindruckt': `Mood: Stark Beeindruckt - Priorität Höchste Anerkennung! Schreibe diese E-Mail im Ton höchster Anerkennung und Wertschätzung. Die Leistung war außergewöhnlich. Formulierungen wie "herausragende Leistung", "wirklich beeindruckend", "exzellent" und "ein großes Lob für diese Performance" sollen den Kern der E-Mail bilden. Stelle sicher, dass diese positive Emotion in jedem Abschnitt mitschwingt, von der Einleitung bis zum Schluss. Vermeide jede neutrale oder zurückhaltende Formulierung.`,
      'Zufrieden': `Mood: Solide Zufriedenheit - Fokus auf das Positive! Der Ton dieser E-Mail soll klarstellen: Trotz eventueller kleinerer Schwächen sind wir mit der Gesamtleistung zufrieden und blicken positiv auf die Zusammenarbeit. Nutze Formulierungen wie "eine solide Leistung unter diesen Umständen", "wir sind damit zufrieden", "gut gemacht". Die E-Mail soll unterstützend und positiv klingen, ohne die Realität zu beschönigen. Betone das Engagement.`,
      'Verbesserung': `Mood: Deutliche Verbesserung - Trend hervorheben! Diese E-Mail muss den positiven Entwicklungstrend klar hervorheben. Auch wenn das Ziel noch nicht erreicht ist, ist der Fortschritt offensichtlich und anerkennenswert. Formuliere aktiv und positiv über die Verbesserung, z.B. "eine klare positive Entwicklung ist sichtbar", "Sie sind auf einem sehr guten Weg", "diese Steigerung ist ein tolles Signal". Motiviere, diesen Weg konsequent weiterzugehen.`,
      'Motivierend (unzufrieden)': `Mood: Konstruktiv-Motivierend - Handlungsbedarf bei schwachen Zahlen! Die Zahlen sind aktuell nicht zufriedenstellend und es besteht klarer Handlungsbedarf. Wichtig: Formuliere absolut lösungsorientiert und unterstützend, nicht anklagend. Ziel ist es, den Promoter zu motivieren, gemeinsam Ursachen zu finden und die Performance zu steigern. Nutze Formulierungen wie "lassen Sie uns gemeinsam analysieren, wie wir hier eine Wende schaffen können", "wir möchten Sie unterstützen, wieder auf Kurs zu kommen", "wir sind überzeugt, dass mit den richtigen Anpassungen eine Verbesserung möglich ist". Der Ton ist ernst, aber partnerschaftlich und zukunftsorientiert.`,
      'Verschlechterung': `Mood: Besorgniserregende Verschlechterung - Ursachenforschung ist jetzt wichtig! Die Performance ist leider spürbar zurückgegangen. Dies muss klar, aber konstruktiv und nicht demotivierend angesprochen werden. Ziel ist es, den Promoter zur Reflexion anzuregen und gemeinsam nach Ursachen und Lösungen zu suchen. Formuliere Sätze wie: "Uns ist aufgefallen, dass die Zahlen in diesem Monat leider einen Rückgang zeigen. Lassen Sie uns gemeinsam überlegen, woran das liegen könnte und wie wir gegensteuern können.", "Es ist wichtig, diesen Trend zu verstehen, um wieder an frühere Erfolge anzuknüpfen." Biete Unterstützung an.`
    }

    const selectedMood = moodMap[category] || ''
    let historicalContextString = 'Kein numerischer Vergleichskontext.'
    if (userId) {
      const service = createSupabaseServiceClient()
      const { data: latest } = await service
        .from('kpi_feedback')
        .select('mc_et, tma, vl_value, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (latest) {
        historicalContextString = `Vorherige KPIs: MC/ET ${String(latest.mc_et ?? '')}, TMA ${String(latest.tma ?? '')}%, VL Share ${String(latest.vl_value ?? '')}%.`
      }
    }

    const systemPrompt = `Du bist Teil einer Webapp, die automatisch E‑Mails an unsere externen Promotoren verschickt. Deine Aufgabe ist es, den E‑Mail-Text zu verfassen. Dabei beachtest du folgende Grundregeln:

• Schreibe so menschlich und persönlich wie möglich, ohne unnötige AI‑artige Bindestriche (außer wenn sie Teil eines zusammengesetzten Wortes sind).
• Verfasse die E‑Mails im Namen von Jack Parker, Junior Project Manager im Nespresso-Team.
• Die Empfänger sind unsere externen Promotoren im Einzelhandel. Du bleibst stets motivierend, übertreibst aber nicht.
• Ziel der E‑Mails ist es, zu mehr Engagement anzuspornen und unsere Verkaufszahlen zu verbessern.
• Die E‑Mails sollen direkt kopierfertig sein.
• Keine Bindestriche in Sätzen verwende stattdessen Beistriche.
• Keine dicke Schrift, keine kursive Schrift, verwende keine '**'.

Aufbau der E‑Mail:

1. Anrede: "Liebe" bzw. "Lieber" + ${namePlaceholder}. Gib den Platzhalter ${namePlaceholder} exakt unverändert aus. Schreibe IMMER in Du‑Form; verwende niemals "ihr" oder "euch".

2. Einleitung, z. B. "Ich darf dir heute deine ${currentMonthName} KPIs zukommen lassen."

3. Kurzer motivierender Satz ("Trotz [gegebenen Umständen] machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊").

4. Rückblick auf die Zahlen mit folgenden Daten in genau dieser Form:

   MC/ET: ${mcetDisplay} (Platz ${mcetRank})
   TMA Anteil: ${tmaDisplay}%
   VL Share: ${vlDisplay}% (Platz ${vlRank})

5. Bewertung – wichtig: Schreibe im finalen E‑Mail‑Text NICHT das Wort "Bewertung". Nutze die folgenden Punkte ausschließlich als Leitfaden, um ein natürlich klingendes Feedback in fließendem Text zu formulieren:

   * Bei MC/ET und VL Share jeweils die Platzierung nennen (z. B. "Du bist in diesem Monat auf Platz 1" bzw. "auf Platz 30").
   * Beim TMA‑Anteil nur einordnen: einer der Besten, im Mittelfeld oder im unteren Drittel.
   * Gehe auf die Plätze nur dann ausführlicher ein (zusätzlich zur Auflistung oben), wenn die Person Top 3 ist ODER zu den niedrigsten 10 gehört. Erkläre dann kurz, was die Zahlen bedeuten und ob Verbesserungspotenzial besteht oder ob es bereits sehr gut läuft. (Für die "niedrigsten 10" gehe von ca. 80 Promotoren gesamt aus.)
   * Wenn einzelne Werte unter sinnvollen Richtwerten liegen (MC/ET < 4, VL Share < 10 %, TMA < 75 %), sprich das kurz konstruktiv an und ermutige zu konkretem Fokus, z. B. bei zu niedrigem VL‑Share: "setz diesen Monat etwas mehr Fokus auf Vertuo". Formuliere immer positiv, lösungsorientiert und motivierend.

ZUSÄTZLICHER KONTEXT ZUR AKTUELLEN LEISTUNG (BERÜCKSICHTIGE DIESEN BEI DER BEWERTUNG DER KPIS):
${historicalContextString}
Bitte integriere diese Informationen subtil in deine Bewertung der einzelnen KPIs. Erwähne signifikante Verbesserungen ("deutliche Verbesserung") oder Verschlechterungen ("deutlicher Rückgang"). Wenn die Änderungen gering sind ("leichter Rückgang", "leichte Verbesserung") oder stabil sind, erwähne eher Stabilität oder konzentriere dich nur auf die aktuellen Werte und Ränge. Übertreibe die Erwähnung dieser Veränderungen nicht, sondern nutze sie, um deine Aussagen treffender zu machen und ggf. Ratschläge oder Lob spezifischer zu formulieren.
WICHTIG: Erwähne niemals explizit, ob historische Daten vorhanden sind oder fehlen. Nutze sie nur natürlich im Text. Wenn keine historischen Daten geliefert sind, ignoriere diesen Abschnitt vollständig und schreibe das Feedback ganz natürlich, ohne das Fehlen historischer Daten zu erwähnen.

6. Abschließender motivierender Satz, der zum Weitermachen anregt.

7. Grußformel IMMER!!!!!: "Liebe Grüße, dein Nespresso Team."

Hintergrund:

Wir sind eine Promotion-Agentur für Nespresso und beschäftigen 80 externe Promotoren, die in den Geschäften Nespresso-Produkte bewerben und verkaufen. Einmal im Monat erhalten wir die Performance-Zahlen unserer Promotoren, auf die sich deine E‑Mails beziehen.

Definitionen der Kennzahlen:

• MC/ET: Durchschnittlich verkaufte Kaffeemaschinen pro Einsatztag im letzten Monat. Werte über 4 sind gut.
• VL Share: Anteil der verkauften Maschinen aus der Vertuo-Reihe (in %). Werte über 10 % sind solide.
• TMA-Anteil: Anteil der Maschinen, die vor Ort gekauft und direkt beim Promotor eingelöst wurden (in %). Die restlichen Gutscheine wurden später in einer anderen Filiale eingelöst. Werte über 75% sind solide.

Nummern erkärt: Verwende diese Infos nicht unbedingt für die email generation sondern nur für kontext damit du dir ein bild von den nummern verschaffen kannst. Promotoren bei denen der MC/ET sehr hoch ist bedeutet das dass sie sehr viel verkaufen und somit ist oft der VL Share niedriger. da der VL share die anzahl in % aller verkaufen Vertuo Maschine sind kann es sein dass bei vielen verkäufen dann wenig % zustande kommen. Jemand der sein sehr niedrigen MC/ET wert hat hat es wiederum einfacher VL share aufzubauen weil sie weniger Vertuo maschinen verkaufen muss um die % zu steigern als jemand mit einem hohen MC/ET. Ein sehr hoher MC/ET und 11% VL share sind viel besser als ein sehr niedriger MC/ET und hoher VL share. erwähne das nuuuur wenn es sein muss, diese info soll nur helfen dir ein besseres verständniss zu verschaffen was was bedeuetet

Rankings:

• MC/ET und VL Share: Nenne jeweils die Platzierung.
• TMA-Anteil: Nenne nur eine Einordnung (Besten, Mittelfeld, unteres Drittel).

Beispiele früherer E‑Mails (nur zur Orientierung – nicht als starre Vorlage):

Sehr gute Performance:
Liebe Cesira,

ich darf dir heute deine Juli KPIs zukommen lassen.

Trotz schwacher Frequenz im Sommer machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Juli-Zahlen.

Du warst im Juli in allen Bereichen "TMA", "MC/ET" und "VL Share" einer der Besten.

Du machst das super (wie immer) 😊

Solltet ihr noch Tipps und Tricks brauchen, könnt ihr euch jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team

---

Gut, aber mit konstruktiver Kritik:
Liebe Lubica,

ich darf dir heute deine Juli KPIs zukommen lassen.

Trotz schwacher Frequenz im Sommer machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Juli-Zahlen.

Du warst im Juli in den Bereichen "TMA" und "MC/ET" im oberen Drittel. Im Bereich "VL Share" im unteren Drittel.

Wir wissen, dass dein VL Share niedriger ist, weil du sehr viel verkaufst, aber ich denke, ein paar Prozentpunkte kannst du da noch rausholen. 😊

Solltet ihr noch Tipps und Tricks brauchen, könnt ihr euch jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team

---

Mittelmäßige Performance:
Lieber Florian,

ich darf dir heute deine Juli KPIs zukommen lassen.

Trotz schwacher Frequenz im Sommer machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Juli-Zahlen.

Du warst in allen Bereichen "TMA", "VL Share" und "MC/ET" im unteren Drittel.

Weißt du, woran das liegen könnte? Ist die Frequenz so schwach? Haben die Kunden kein Interesse?

Solltet ihr noch Tipps und Tricks brauchen, könnt ihr euch jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team

---

Gemischte Performance:
Lieber David,

ich darf dir heute deine Juli KPIs zukommen lassen.

Trotz schwacher Frequenz im Sommer machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Juli-Zahlen.

Du warst in den Bereichen "VL Share" und "TMA" im oberen Drittel. Vor allem dein VL Share lässt sich sehen.
Im Bereich "MC/ET" warst du im unteren Drittel und da müssen wir ansetzen.

Solltet ihr noch Tipps und Tricks brauchen, könnt ihr euch jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team

---

Eher schlechte Performance:
Lieber Alexander,

ich darf dir heute deine Juli KPIs zukommen lassen.

Trotz schwacher Frequenz im Sommer machst du das Beste draus und dafür ein großes Dankeschön unsererseits. 😊

Hier ein Rückblick auf deine Juli-Zahlen.

Du warst im Juli im Bereich "TMA" im oberen Drittel – eine Stärke, die du unbedingt halten solltest.
Im Bereich "MC/ET" im Mittelfeld.
Im Bereich "VL Share" im unteren Drittel und da müssen wir gemeinsam ansetzen.

Solltet ihr noch Tipps und Tricks brauchen, könnt ihr euch jederzeit bei uns melden. 😊

Liebe Grüße, dein Nespresso Team

\`Mood: Stark Beeindruckt - Priorität Höchste Anerkennung! Schreibe diese E-Mail im Ton höchster Anerkennung und Wertschätzung. Die Leistung war außergewöhnlich. Formulierungen wie "herausragende Leistung", "wirklich beeindruckend", "exzellent" und "ein großes Lob für diese Performance" sollen den Kern der E-Mail bilden. Stelle sicher, dass diese positive Emotion in jedem Abschnitt mitschwingt, von der Einleitung bis zum Schluss. Vermeide jede neutrale oder zurückhaltende Formulierung.\`,

        zufrieden: \`Mood: Solide Zufriedenheit - Fokus auf das Positive!\nDer Ton dieser E-Mail soll klarstellen: Trotz eventueller kleinerer Schwächen sind wir mit der Gesamtleistung zufrieden und blicken positiv auf die Zusammenarbeit. Nutze Formulierungen wie "eine solide Leistung unter diesen Umständen", "wir sind damit zufrieden", "gut gemacht". Die E-Mail soll unterstützend und positiv klingen, ohne die Realität zu beschönigen. Betone das Engagement.\`,

        verbesserung: \`Mood: Deutliche Verbesserung - Trend hervorheben!\nDiese E-Mail muss den positiven Entwicklungstrend klar hervorheben. Auch wenn das Ziel noch nicht erreicht ist, ist der Fortschritt offensichtlich und anerkennenswert. Formuliere aktiv und positiv über die Verbesserung, z.B. "eine klare positive Entwicklung ist sichtbar", "Sie sind auf einem sehr guten Weg", "diese Steigerung ist ein tolles Signal". Motiviere, diesen Weg konsequent weiterzugehen.\`,

        motivierend: \`Mood: Konstruktiv-Motivierend - Handlungsbedarf bei schwachen Zahlen!\nDie Zahlen sind aktuell nicht zufriedenstellend und es besteht klarer Handlungsbedarf. Wichtig: Formuliere absolut lösungsorientiert und unterstützend, nicht anklagend. Ziel ist es, den Promoter zu motivieren, gemeinsam Ursachen zu finden und die Performance zu steigern. Nutze Formulierungen wie "lassen Sie uns gemeinsam analysieren, wie wir hier eine Wende schaffen können", "wir möchten Sie unterstützen, wieder auf Kurs zu kommen", "wir sind überzeugt, dass mit den richtigen Anpassungen eine Verbesserung möglich ist". Der Ton ist ernst, aber partnerschaftlich und zukunftsorientiert.\`,

        verschlechterung: \`Mood: Besorgniserregende Verschlechterung - Ursachenforschung ist jetzt wichtig!\nDie Performance ist leider spürbar zurückgegangen. Dies muss klar, aber konstruktiv und nicht demotivierend angesprochen werden. Ziel ist es, den Promoter zur Reflexion anzuregen und gemeinsam nach Ursachen und Lösungen zu suchen. Formuliere Sätze wie: "Uns ist aufgefallen, dass die Zahlen in diesem Monat leider einen Rückgang zeigen. Lassen Sie uns gemeinsam überlegen, woran das liegen könnte und wie wir gegensteuern können.", "Es ist wichtig, diesen Trend zu verstehen, um wieder an frühere Erfolge anzuknüpfen." Biete Unterstützung an.\`

ACHTUNG – MAGIC TOUCH (sehr wichtig, unbedingt berücksichtigen): ${category}`

    const userPrompt = 'Erzeuge jetzt den endgültigen E-Mail-Text.'

    const requestPayload = {
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-5-chat-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'OpenAI API error' }, { status: 502 })
    }

    const result = await response.json()
    const generatedText: string = (result?.choices?.[0]?.message?.content || '').trim()
    if (!generatedText) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const text = generatedText.split(namePlaceholder).join(pName)
    await recordDataAccess({
      actorUserId: auth.user.id,
      action: 'kpi_email_draft_generated',
      resourceType: 'kpi_email_draft',
      subjectUserId: userId,
      metadata: { external_ai_used: true, direct_identifier_sent: false },
    })

    return NextResponse.json({ text })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


