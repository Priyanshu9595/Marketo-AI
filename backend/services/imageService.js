import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1'
const IMAGEN_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const NANO_BANANA_MODELS = [
  'gemini-3.1-flash-image'
]



const ASPECT_RATIO = {
  '1:1': '1:1',
  '4:5': '4:5',
  '9:16': '9:16',
  '16:9': '16:9',
  '1.91:1': '16:9',
  '2:3': '2:3',
  '3:2': '4:3',
}

const MIME_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const err = new Error('GEMINI_API_KEY is missing in backend/.env')
    err.status = 500
    throw err
  }
  return key
}

function pixelInstruction(pixelWidth, pixelHeight) {
  const width = Number(pixelWidth)
  const height = Number(pixelHeight)
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return ''
  return `Requested output pixel size: ${Math.round(width)}x${Math.round(height)} px.`
}

function buildPrompt({ prompt, product, style, size, pixelWidth, pixelHeight }) {
  const aspectRatio = ASPECT_RATIO[size] || '1:1'
  return [
    prompt,
    product && `Product: ${product}.`,
    style && `${style} style.`,
    pixelInstruction(pixelWidth, pixelHeight),
    `Aspect ratio: ${aspectRatio}.`,
    'If a reference image is provided, use it as the visual source and preserve the main subject while applying the requested edit or ad concept.',
    'Generate one high quality image and return it as inline image data. Commercial product photography, sharp focus, professional lighting.',
  ].filter(Boolean).join(' ')
}

function buildSafePrompt({ prompt, product, style, size, pixelWidth, pixelHeight }) {
  const aspectRatio = ASPECT_RATIO[size] || '1:1'
  return [
    `Create an original advertising visual inspired by this brief: ${prompt}`,
    product && `Feature a fictional, generic version of this product or category: ${product}.`,
    style && `${style} style.`,
    pixelInstruction(pixelWidth, pixelHeight),
    `Aspect ratio: ${aspectRatio}.`,
    'If a reference image is provided, use it for composition, outfit/product details, colors, and pose without copying protected logos or exact branding.',
    'Do not depict real people, public figures, athletes, national teams, official uniforms, celebrities, copyrighted characters, real logos, trademarks, or exact event branding.',
    'Use fictional models, generic branding, original colors, and safe commercial photography. Return only the final image as inline image data.',
  ].filter(Boolean).join(' ')
}

function normalizeReferenceImages(images = []) {
  return images
    .filter(img => img?.data && img?.mimeType)
    .slice(0, 3)
    .map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }))
}

function apiError(message, status) {
  const err = new Error(message)
  err.status = status
  return err
}

async function parseError(res, fallback) {
  const errBody = await res.json().catch(() => ({}))
  return errBody.error?.message || fallback
}

function imageFromGeminiResponse(data, model) {
  const parts = data.candidates?.flatMap(candidate => candidate.content?.parts || []) || []
  const inlinePart = parts.find(part => part.inlineData?.data || part.inline_data?.data)
  const inlineData = inlinePart?.inlineData || inlinePart?.inline_data

  if (inlineData?.data) {
    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png'
    return {
      buffer: Buffer.from(inlineData.data, 'base64'),
      mimeType,
      model,
    }
  }

  const text = parts.map(part => part.text).filter(Boolean).join(' ').trim()
  const finishReason = data.candidates?.[0]?.finishReason
  const blockReason = data.promptFeedback?.blockReason
  const details = [text, finishReason && `finishReason: ${finishReason}`, blockReason && `blockReason: ${blockReason}`]
    .filter(Boolean)
    .join(' | ')

  throw new Error(`${model} did not return image bytes${details ? ` (${details})` : ''}.`)
}

function imageFromImagenResponse(data, model) {
  const generated = data.generatedImages?.[0] || data.generated_images?.[0]
  const prediction = data.predictions?.[0]
  const b64 =
    generated?.image?.imageBytes ||
    generated?.image?.image_bytes ||
    generated?.imageBytes ||
    generated?.image_bytes ||
    prediction?.bytesBase64Encoded ||
    prediction?.bytes_base64_encoded ||
    prediction?.image?.imageBytes ||
    prediction?.image?.image_bytes

  if (b64) {
    return {
      buffer: Buffer.from(b64, 'base64'),
      mimeType: prediction?.mimeType || prediction?.mime_type || 'image/png',
      model,
    }
  }

  const detail =
    generated?.raiFilteredReason ||
    generated?.rai_filtered_reason ||
    prediction?.raiFilteredReason ||
    prediction?.rai_filtered_reason ||
    JSON.stringify(data).slice(0, 400)

  throw new Error(`${model} did not return image bytes${detail ? ` (${detail})` : ''}.`)
}

function buildNanoBananaBodies(model, prompt, size, images = []) {
  const imageConfig = {
    aspectRatio: ASPECT_RATIO[size] || '1:1',
  }
  if (model === 'gemini-3.1-flash-image') imageConfig.imageSize = '1K'

  const referenceParts = normalizeReferenceImages(images)
  const baseBody = {
    contents: [{ parts: [{ text: prompt }, ...referenceParts] }],
  }

  return [
    baseBody,
    {
      ...baseBody,
      generationConfig: {
        responseModalities: ['IMAGE'],
        responseFormat: {
          image: imageConfig,
        },
      },
    },
  ]
}

async function generateWithNanoBanana(model, prompt, size, images) {
  let lastError

  for (const body of buildNanoBananaBodies(model, prompt, size, images)) {
    const res = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'x-goog-api-key': getApiKey(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      lastError = apiError(await parseError(res, `${model} request failed (${res.status})`), res.status)
      const canRetrySimpleBody =
        body.generationConfig &&
        /Invalid JSON payload|responseModalities|responseFormat|generationConfig|Cannot find field/i.test(lastError.message)
      if (canRetrySimpleBody) continue
      throw lastError
    }

    try {
      return imageFromGeminiResponse(await res.json(), model)
    } catch (err) {
      lastError = err
      if (body.generationConfig && /did not return image bytes/i.test(err.message || '')) continue
      throw err
    }
  }

  throw lastError
}

async function generateWithImagen(model, prompt, size) {
  const aspectRatio = ASPECT_RATIO[size] || '1:1'
  const res = await fetch(`${IMAGEN_BASE_URL}/models/${model}:predict`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': getApiKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio,
      },
    }),
  })

  if (!res.ok) {
    throw apiError(await parseError(res, `${model} request failed (${res.status})`), res.status)
  }

  return imageFromImagenResponse(await res.json(), model)
}

async function storeImage(image) {
  const dir = path.resolve(process.cwd(), 'generated', 'images')
  await fs.mkdir(dir, { recursive: true })

  const extension = MIME_EXTENSION[image.mimeType] || 'png'
  const filename = `image-${Date.now()}.${extension}`
  await fs.writeFile(path.join(dir, filename), image.buffer)

  return {
    filename,
    mimeType: image.mimeType,
    model: image.model,
  }
}

function shouldTryNext(err) {
  return /did not return image bytes|not found|not supported|unavailable|high demand|overloaded|try again|model/i.test(err.message || '') ||
    [400, 404, 429, 500, 503].includes(err.status)
}

export async function generateImage({ prompt, product, style, size, pixelWidth, pixelHeight, images }) {
  const promptAttempts = [
    buildPrompt({ prompt, product, style, size, pixelWidth, pixelHeight }),
    buildSafePrompt({ prompt, product, style, size, pixelWidth, pixelHeight }),
  ]
  const hasReferenceImages = normalizeReferenceImages(images).length > 0
  const failures = []

  for (const fullPrompt of promptAttempts) {
    for (const model of NANO_BANANA_MODELS) {
      try {
        const image = await generateWithNanoBanana(model, fullPrompt, size, images)
        return await storeImage(image)
      } catch (err) {
        failures.push(`${model}: ${err.message}`)
        if (!shouldTryNext(err)) throw err
      }
    }

    if (hasReferenceImages) continue

    for (const model of IMAGEN_MODELS) {
      try {
        const image = await generateWithImagen(model, fullPrompt, size)
        return await storeImage(image)
      } catch (err) {
        failures.push(`${model}: ${err.message}`)
        if (!shouldTryNext(err)) throw err
      }
    }
  }

  throw new Error(`Gemini image generation failed. ${failures.join(' | ')}`)
}
