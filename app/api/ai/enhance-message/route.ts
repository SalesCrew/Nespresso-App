import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth/routeGuards'

export async function POST(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const inputText: string = (body?.text || '').toString()

    if (!inputText.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 })
    }
    if (inputText.length > 5000) {
      return NextResponse.json({ error: 'text too long' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const systemPrompt = `Deine Aufgabe ist es NUR Groß- und Kleinschreibung auszubessern und Satzzeichen zu setzen.
KEINE Bindestriche hinzufügen, außer sie stehen bereits da. Verändere KEINE Wörter, außer sie sind grammatikalisch falsch
und der Satz ergibt keinen Sinn. In diesem Fall korrigiere minimal, so nah wie möglich am Original.

ZUSÄTZLICH: Formatiere die Nachricht professionell in dieser Struktur:
- Anrede (falls nicht vorhanden, füge eine passende hinzu wie "Liebe Promotoren," oder "Hallo zusammen,")
- Hauptnachricht mit Absätzen an sinnvollen Stellen
- Abschluss: "Liebe Grüße, euer Nespresso Team"

Mache Absätze (Zeilenumbrüche) wo es inhaltlich Sinn macht, um die Lesbarkeit zu verbessern.`

    const userPrompt = `Korrigiere folgenden Text gemäß den Regeln. Antworte NUR mit der korrigierten Version, ohne Erklärungen:
"""
${inputText}
"""`

    const requestPayload = {
      model: 'gpt-5-chat-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2
    } as const;

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
      return NextResponse.json({ error: 'AI request failed' }, { status: 502 })
    }

    const result = await response.json()
    const enhanced: string = (result?.choices?.[0]?.message?.content || '').trim()
    if (!enhanced) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, text: enhanced })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}


