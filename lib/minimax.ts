const API_KEY = process.env.OPENAI_API_KEY
const BASE_URL = 'https://api.openai.com/v1'

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function chat(messages: Message[], temperature = 0.7): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function chatJSON<T = any>(messages: Message[], temperature = 0.3): Promise<T> {
  const raw = await chat(messages, temperature)
  try {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? raw.match(/\{[\s\S]*\}/)
    const jsonStr = match ? (match[1] ?? match[0]) : raw
    return JSON.parse(jsonStr.trim())
  } catch {
    throw new Error(`Failed to parse JSON from OpenAI response:\n${raw.slice(0, 500)}`)
  }
}
