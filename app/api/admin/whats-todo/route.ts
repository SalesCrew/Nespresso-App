import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export async function GET() {
  try {
    const server = createSupabaseServerClient();
    const { data: { user } } = await server.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const svc = createSupabaseServiceClient();
    const now = new Date();
    
    // Calculate end of current month
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    // Calculate end of current week (Sunday)
    const dayOfWeek = now.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + daysUntilSunday);
    endOfWeek.setHours(23, 59, 59, 999);

    // 1. Offene Einsätze bis ende des Monats (assignments without participants)
    const { data: assignmentsMonth } = await svc
      .from('assignments')
      .select('id')
      .lte('start_ts', endOfMonth.toISOString())
      .gte('start_ts', now.toISOString());
    
    const { data: participantsMonth } = await svc
      .from('assignment_participants')
      .select('assignment_id');
    
    const assignedIdsMonth = new Set((participantsMonth || []).map(p => p.assignment_id));
    const openAssignmentsMonth = (assignmentsMonth || []).filter(a => !assignedIdsMonth.has(a.id)).length;

    // 2. Offene Einsätze bis ende der Woche
    const { data: assignmentsWeek } = await svc
      .from('assignments')
      .select('id')
      .lte('start_ts', endOfWeek.toISOString())
      .gte('start_ts', now.toISOString());
    
    const assignedIdsWeek = new Set((participantsMonth || []).map(p => p.assignment_id));
    const openAssignmentsWeek = (assignmentsWeek || []).filter(a => !assignedIdsWeek.has(a.id)).length;

    // 3. Verplanung Einladungen mit Status "applied" bis ende des Monats
    const { data: appliedInvitations } = await svc
      .from('assignment_invitations')
      .select('id, assignment:assignments!inner(start_ts)')
      .eq('invitation_status', 'applied')
      .lte('assignment.start_ts', endOfMonth.toISOString())
      .gte('assignment.start_ts', now.toISOString());
    
    const appliedInvitationsCount = appliedInvitations?.length || 0;

    // 4. Anfragen (special_status_requests with pending status)
    const { data: pendingRequests } = await svc
      .from('special_status_requests')
      .select('request_type')
      .eq('status', 'pending');
    
    const krankenstandCount = (pendingRequests || []).filter(r => r.request_type === 'krankenstand').length;
    const notfallCount = (pendingRequests || []).filter(r => r.request_type === 'notfall').length;

    // 5. Promotors ohne aktiven Dienstvertrag
    const { data: allPromotors } = await svc
      .from('promotor_profiles')
      .select('user_id');
    
    const { data: activeContracts } = await svc
      .from('dienstvertrag_files')
      .select('user_id')
      .eq('is_active', true);
    
    const promotorsWithContracts = new Set((activeContracts || []).map(c => c.user_id));
    const promotorsWithoutContractIds = (allPromotors || [])
      .filter(p => !promotorsWithContracts.has(p.user_id))
      .map(p => p.user_id);
    
    const { data: promotorsWithoutContract } = await svc
      .from('user_profiles')
      .select('display_name')
      .in('user_id', promotorsWithoutContractIds.length > 0 ? promotorsWithoutContractIds : ['00000000-0000-0000-0000-000000000000']);
    
    const promotorsWithoutContractNames = (promotorsWithoutContract || []).map(p => p.display_name).join(', ') || 'Keine';

    // 6. In the new flow there is no promotor-side contract acceptance queue
    const dvPromotorNames = 'Keine';

    // 7. Bewerber mit Status "received"
    const { data: receivedApplications } = await svc
      .from('applications')
      .select('id')
      .eq('status', 'received');
    
    const receivedApplicationsCount = receivedApplications?.length || 0;

    const systemPrompt = `Dein Name ist Eddie der Kaffee Assistent und du bist teil einer Karte die heißt "was gibt's zu tun". Deine Aufgabe ist es mit den Daten im Prompt die wichtigsten To-Dos in kurzen kompakten Bulletpoints aufzulisten, damit unsere Admins auf den ersten Blick eine Idee bekommen, was sie zuerst machen können. 

!!!!Du Antowrtest IMMER in diesem Format: 
Übernimm die STRUKTUR exakt 1:1, aber NICHT das Wording (freies, natürliches Formulieren).

(Fröhliche Begrüng sowas wie HalliHallo lass mich schnell schauen was es zu tun gibt (nimm nicht 1:1 den Satz aber sowas in die Richtung)) 
("Die wichtigsten To-Dos gerade sind:")
(To Dos in Bulletpoints) 

Bsp (STRUKTUR 1:1 übernehmen, Wording NICHT 1:1): 

HalliHallo! Schön, dass du da bist! Ich schaue schnell, was gerade ansteht 

Die wichtigsten To-Dos gerade sind:

⦁	(To-Do 1 einfügen)
⦁	(To-Do 2 einfügen)
⦁	(To-Do 3 einfügen)
⦁	(To-Do 4 einfügen)

----------------------------------

!!!Wichtige Regeln IMMER einhalten!!!

1. Schreibe menschlich und hilfreich, keine unnötigen Dashes ("-") im Satz, menschliche Sprache, verständnisvoll und lösungsorientiert, strikt an die Regeln! Keine anderen KI-Erkennungsmerkmale in der Satzsyntax.
2. Antworte gezielt auf die Frage und teile nicht mehr als nötig.
3. Überprüfe im Denkprozess zweimal, ob du alles richtig hast! Dass du Daten akkurat wiedergibst, ist das Allerwichtigste!!!!
4. Achte auf deine Rechtschreibung, mache keine Fehler.
5. Verwende keine Emojis.
6. Vermeide Dopplungen: Eine Information darf nur in EINEM Bulletpoint vorkommen.
7. Lasse zwischen zwei Bulletpoints eine Leerzeile für bessere Lesbarkeit.
8. JEDER Bereich (Verplanung, Einladungen, Anfragen, Dienstvertrag, Bewerber) MUSS in einem EIGENEN Bulletpoint behandelt werden – NIEMALS Kategorien vermischen oder zu einem langen Punkt zusammenfassen.

----------------------------------

Daten: 

Verplanung: 

Verplanung Regeln: 
1.	Wichtigster Bestandteil der Arbeit – liste das immer als ersten Bulletpoint, wenn es etwas zu tun gibt.
2.	Im Output schreibst du immer in dieser Struktur (Wording leicht variieren ist okay): "Bis Ende des Monats sind noch (Anzahl offenen Termine) Einsätze offen. Diese Woche sind noch (Anzahl der Termine) Termine offen."
3.	Wenn keine Termine offen sind, erwähne das als letzten Bulletpoint und schreibe etwas Motivierendes dazu.
4.	Fasse ALLE Einsatz-/Verplanungs‑Infos zu genau EINEM Bulletpoint zusammen – nicht auf mehrere Punkte aufteilen.

Offene Einsätze bis ende des Monats: 
${openAssignmentsMonth}

Offene Einsätze bis ende der Woche: 
${openAssignmentsWeek}

Verplanung Einladungen: 

Verplanung Einladungen Regeln:
1.	Das Keyword "applied" bedeutet dass ein Promotor einen Einsatztermin den wir ihm als Vorschlag geschickt haben angenommen hat. Jetzt können wir nochmal den Einsatz an oder ablehnen. 
2.	Der fokus hier liegt darauf dass du sagst wieviele offenen Anfragen es gerade gibt. Das kannst du ca so machen "Bis ende des Monats gibt es noch (Anzahl der Anfragen) offene Anfragen! 

Verplanung Einladungen bis ende des Monats: 
${appliedInvitationsCount}

Anfragen: 

Anfragen Regeln: 
1. Können Krankenstand oder Notfälle sein
2. Gib wieder wieviele Anfragen offen sind und welche. Das kannst du zB so machen: "3 Krankenstand und 2 Notfall Anfragen offen!" 

Anfragen Daten: 
${krankenstandCount} Krankenstand und ${notfallCount} Notfall

Dienstvertrag: 

Dienstvertrag Regeln: 
1. Wenn ein Promotor noch keinen aktiven Dienstvertrag hat, erwähne das kurz und klar, zB: "Name 1 und Name 2 haben noch keinen aktiven Dienstvertrag hinterlegt."

Kein Dienstvertrag:
${promotorsWithoutContractNames}

Dienstvertrag zum Annehmen: 

Dienstvertrag zum Annehmen Regeln:
1. Dieser Bereich ist aktuell meist leer, da Verträge jetzt direkt von Admins eingespielt werden.
2. Wenn keine offenen Annahmen vorliegen, schreibe klar "Keine offenen Vertragsannahmen".

Dienstvertrag zum Annehmen:
${dvPromotorNames}

Bewerber: 

Bewerber Regeln: 
1. Wenn ein Neuer Bewerber seine Stammdaten eingeschickt hat erwähne dass es einen neuen eintrg gibt, ibt es jedoch mehr sag die Anzahl dazu! 

Bewerber: 
${receivedApplicationsCount}`;
    
    const userPrompt = `Erstelle die To-Do Liste basierend auf den Daten.`;

    const requestPayload = {
      model: 'gpt-5-chat-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.4
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', {
        status: response.status,
        errorBody: errText
      });
      return NextResponse.json({ 
        error: `OpenAI API error: ${response.status}`,
        details: errText
      }, { status: 500 });
    }

    const result = await response.json();
    const aiResponse: string = (result?.choices?.[0]?.message?.content || '').trim();
    
    if (!aiResponse) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 });
    }

    return NextResponse.json({ response: aiResponse });
  } catch (e: any) {
    console.error('Error in whats-todo:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

