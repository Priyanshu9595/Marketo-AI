import fetch from 'node-fetch'

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

export async function generateCopy({ brand, product, audience, tone, type, keywords }) {
  const prompt = `You are an expert D2C marketing copywriter for Indian brands.

Generate a ${type} for:
- Brand: ${brand}
- Product: ${product}
- Target audience: ${audience}
- Brand tone: ${tone}
- Keywords to include: ${keywords}

Write only the final copy, no explanation. Make it compelling and conversion-focused.`

  const res = await fetch(`${BASE}?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 600 },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error?.message || 'Gemini API error')
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated.'
}