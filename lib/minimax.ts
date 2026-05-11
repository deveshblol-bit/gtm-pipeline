const API_KEY = process.env.MINIMAX_API_KEY
const BASE_URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.chat/v1'
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-Text-01'

export interface MiniMaxMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: MiniMaxMessage[], temperature = 0.7): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions_pro`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MiniMax API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function chatJSON<T = any>(messages: MiniMaxMessage[], temperature = 0.3): Promise<T> {
  const raw = await chat(messages, temperature)
  try {
    // Try to extract JSON from markdown code blocks
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/)
    const jsonStr = match ? (match[1] ?? match[0]) : raw
    return JSON.parse(jsonStr.trim())
  } catch {
    throw new Error(`Failed to parse JSON from MiniMax response:\n${raw.slice(0, 500)}`)
  }
}