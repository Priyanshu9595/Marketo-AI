import fetch from 'node-fetch'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const FALLBACK_TEXT_MODELS = ['gemini-2.5-flash']

let cachedTextModels = null

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const err = new Error('GEMINI_API_KEY is missing in backend/.env')
    err.status = 500
    throw err
  }
  return key
}

function buildPrompt({ brand, product, audience, tone, type, keywords, words }) {
  const wordInstruction = words
    ? `Target length: about ${words} words.`
    : 'Do not apply a fixed word limit. Use as much length as needed for the selected content type.'

  return `You are an expert D2C marketing copywriter for Indian brands.

Generate a ${type} for:
- Brand: ${brand}
- Product: ${product}
- Target audience: ${audience}
- Brand tone: ${tone}
- Keywords to include: ${keywords}
- ${wordInstruction}

Write only the final copy, no explanation. Make it compelling and conversion-focused.`
}

function isTextModel(model) {
  const name = model.name || ''
  return (
    model.supportedGenerationMethods?.includes('generateContent') &&
    /^models\/gemini-/i.test(name) &&
    !/image|embedding|veo|tts|live/i.test(name)
  )
}

function sortTextModels(models) {
  return models.sort((a, b) => {
    const aName = a.replace(/^models\//, '')
    const bName = b.replace(/^models\//, '')
    const aFallbackRank = FALLBACK_TEXT_MODELS.indexOf(aName)
    const bFallbackRank = FALLBACK_TEXT_MODELS.indexOf(bName)

    if (aFallbackRank !== -1 || bFallbackRank !== -1) {
      return (aFallbackRank === -1 ? 99 : aFallbackRank) - (bFallbackRank === -1 ? 99 : bFallbackRank)
    }
    if (/flash/i.test(aName) !== /flash/i.test(bName)) return /flash/i.test(aName) ? -1 : 1
    if (/preview/i.test(aName) !== /preview/i.test(bName)) return /preview/i.test(aName) ? 1 : -1
    return bName.localeCompare(aName)
  })
}

async function getTextModels() {
  if (cachedTextModels?.length) return cachedTextModels

  try {
    const res = await fetch(`${BASE_URL}/models?key=${getApiKey()}`)
    if (!res.ok) throw new Error('Could not list Gemini models')
    const data = await res.json()
    const models = (data.models || []).filter(isTextModel).map(model => model.name)
    cachedTextModels = sortTextModels(models)
  } catch {
    cachedTextModels = FALLBACK_TEXT_MODELS.map(model => `models/${model}`)
  }

  return cachedTextModels
}

async function generateWithModel(modelName, prompt) {
  const res = await fetch(`${BASE_URL}/${modelName}:generateContent?key=${getApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.85,
      },
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const err = new Error(errBody.error?.message || `Gemini API error (${res.status})`)
    err.status = res.status
    throw err
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim()
  if (!text) throw new Error(`${modelName.replace(/^models\//, '')} returned no content.`)
  return text
}

function shouldTryNextModel(err) {
  return /high demand|overloaded|unavailable|try again|quota|rate/i.test(err.message || '') || [429, 500, 503].includes(err.status)
}

export async function generateCopy(params) {
  const prompt = buildPrompt(params)
  const models = await getTextModels()
  let lastError

  for (const modelName of models) {
    try {
      return await generateWithModel(modelName, prompt)
    } catch (err) {
      lastError = err
      if (!shouldTryNextModel(err)) break
    }
  }

  throw lastError || new Error('No Gemini text model is available for this API key.')
}
