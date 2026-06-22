import fs from 'fs/promises'
import path from 'path'
import fetch from 'node-fetch'

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'
const VIDEO_MODELS = [
  'veo-3.0-generate-001'
]
const VIDEO_RESOLUTION = '720p'
const POLL_INTERVAL_MS = 10000
const TIMEOUT_MS = 6 * 60 * 1000

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function getApiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const err = new Error('GEMINI_API_KEY is missing in backend/.env')
    err.status = 500
    throw err
  }
  return key
}

function buildPrompt({ prompt, format, music, voice, brand, cta }) {
  return [
    prompt,
    format ? `Format: ${format}.` : '',
    music ? `Background music: ${music}.` : '',
    voice ? `Voiceover: ${voice}.` : '',
    brand ? `Brand: ${brand}.` : '',
    cta ? `End with this call to action: ${cta}.` : '',
    'Realistic'
  ].filter(Boolean).join('\n')
}

function withoutImagesPrompt(prompt) {
  return [
    prompt,
    'Use the written description as the full creative direction.Also used uploaded image inputs.',
  ].join('\n')
}

function safeVideoPrompt({ prompt, format, music, voice, brand, cta }) {
  return [
 
    `Original theme summary: ${prompt.replace(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g, 'a fictional person')}`,
    format ? `Format: ${format}.` : '',
    music ? `Background music: ${music}.` : '',
    voice ? `Voiceover: ${voice}.` : '',
    brand ? `Use fictional/generic branding inspired by: ${brand}.` : '',
    cta ? `End with this call to action: ${cta}.` : '',
    'Create a polished social media video ad with cinematic pacing, clean cuts, and a clear final brand moment.',
  ].filter(Boolean).join('\n')
}

function aspectRatioFor(format = '') {
  return /story|reel|short|9:16/i.test(format) ? '9:16' : '16:9'
}

function normalizeImages(images = []) {
  return images
    .filter(img => img?.data && img?.mimeType)
    .slice(0, 3)
    .map(img => ({
      image: {
        inlineData: {
          mimeType: img.mimeType,
          data: img.data,
        },
      },
      referenceType: 'asset',
    }))
}

async function geminiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'x-goog-api-key': getApiKey(),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const err = new Error(errBody.error?.message || `Gemini video API error (${res.status})`)
    err.status = res.status
    throw err
  }

  return res
}

function findVideoResult(status) {
  const response = status.response || {}
  const generated =
    response.generateVideoResponse?.generatedSamples ||
    response.generateVideoResponse?.generated_samples ||
    response.generateVideoResponse?.generatedVideos ||
    response.generateVideoResponse?.generated_videos ||
    response.generatedVideos ||
    response.generated_videos ||
    []

  for (const item of generated) {
    const video = item?.video || item
    const inlineData = video?.inlineData || video?.inline_data
    const data =
      inlineData?.data ||
      video?.bytesBase64Encoded ||
      video?.bytes_base64_encoded ||
      video?.videoBytes ||
      video?.video_bytes ||
      video?.bytes
    const uri =
      video?.uri ||
      video?.fileUri ||
      video?.file_uri ||
      video?.gcsUri ||
      video?.gcs_uri ||
      video?.file?.uri ||
      video?.file?.fileUri ||
      video?.file?.file_uri

    if (uri) return { uri }
    if (data) {
      return {
        data,
        mimeType: inlineData?.mimeType || inlineData?.mime_type || video?.mimeType || 'video/mp4',
      }
    }
  }

  return null
}

function getVideoFilterReason(status) {
  const response = status.response || status
  const videoResponse = response.generateVideoResponse || response.generate_video_response || response
  const reasons =
    videoResponse.raiMediaFilteredReasons ||
    videoResponse.rai_media_filtered_reasons ||
    videoResponse.raiFilteredReasons ||
    videoResponse.rai_filtered_reasons ||
    []
  const filteredCount =
    videoResponse.raiMediaFilteredCount ||
    videoResponse.rai_media_filtered_count ||
    videoResponse.raiFilteredCount ||
    videoResponse.rai_filtered_count ||
    0

  if (filteredCount || reasons.length > 0) {
    return reasons.join(' ') || 'Gemini filtered this video request.'
  }

  return ''
}

function retryableVideoError(message, status = 422) {
  const err = new Error(message)
  err.status = status
  err.retryable = true
  return err
}

async function startVideoOperation({
  model,
  prompt,
  format,
  music,
  voice,
  brand,
  cta,
  images,
  includeImages = true,
  includeAdvancedParameters = true,
}) {
  const instance = { prompt: buildPrompt({ prompt, format, music, voice, brand, cta }) }
  const referenceImages = includeImages ? normalizeImages(images) : []

  if (referenceImages.length > 0) {
    instance.referenceImages = referenceImages
  }

  const body = {
    instances: [instance],
    parameters: {
      aspectRatio: aspectRatioFor(format),
    },
  }

  if (includeAdvancedParameters) {
    body.parameters.durationSeconds = '8'
    body.parameters.resolution = VIDEO_RESOLUTION
  }

  const res = await geminiFetch(`${BASE_URL}/models/${model}:predictLongRunning`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  const data = await res.json()

  if (!data.name) throw new Error('Gemini video API did not return an operation name.')
  return data.name
}

async function waitForVideo(operationName) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < TIMEOUT_MS) {
    await sleep(POLL_INTERVAL_MS)

    const res = await geminiFetch(`${BASE_URL}/${operationName}`)
    const status = await res.json()

    if (status.error) throw new Error(status.error.message || 'Gemini video generation failed.')
    if (!status.done) continue

    const filterReason = getVideoFilterReason(status)
    if (filterReason) {
      throw retryableVideoError(filterReason)
    }

    const video = findVideoResult(status)
    if (!video) {
      const detail = JSON.stringify(status.response || status).slice(0, 1000)
      throw retryableVideoError(`Gemini finished, but no video URI was returned. Response: ${detail}`)
    }
    return video
  }

  const err = new Error('Gemini video generation timed out. Try again with a shorter prompt or lower resolution.')
  err.status = 504
  throw err
}

async function downloadVideo(video) {
  if (video.data) return Buffer.from(video.data, 'base64')

  const res = await geminiFetch(video.uri, { redirect: 'follow' })
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

function shouldRetryVideoRequest(err) {
  const message = err?.message || ''
  if (/quota|billing|rate-limit|rate limit|RESOURCE_EXHAUSTED/i.test(message)) return false
  return Boolean(err?.retryable) ||
    /inlineData|referenceImages|numberOfVideos|durationSeconds|resolution|isn't supported|not supported|not found|unsupported|real people|likeness|celebrity|filtered|no video URI/i.test(message)
}

export async function generateVideo({ prompt, format, music, voice, brand, cta, images }) {
  const attempts = [
    { prompt, format, music, voice, brand, cta, images },
    {
      prompt: withoutImagesPrompt(prompt),
      format,
      music,
      voice,
      brand,
      cta,
      images: [],
      includeImages: false,
    },
    {
      prompt: safeVideoPrompt({ prompt, format, music, voice, brand, cta }),
      format,
      music: music && music !== 'No music' ? music : '',
      voice,
      brand,
      cta,
      images: [],
      includeImages: false,
      safeFallback: true,
    },
    {
      prompt: safeVideoPrompt({ prompt, format, music, voice, brand, cta }),
      format,
      music: '',
      voice,
      brand,
      cta,
      images: [],
      includeImages: false,
      includeAdvancedParameters: false,
    },
  ]

  let operationName
  let model
  let video
  let lastError

  for (const videoModel of VIDEO_MODELS) {
    for (const attempt of attempts) {
      try {
        const startedOperationName = await startVideoOperation({ ...attempt, model: videoModel })
        const generatedVideo = await waitForVideo(startedOperationName)
        operationName = startedOperationName
        model = videoModel
        video = generatedVideo
        break
      } catch (err) {
        lastError = err
        operationName = ''
        model = ''
        video = null
        if (!shouldRetryVideoRequest(err)) break
      }
    }
    if (operationName || !shouldRetryVideoRequest(lastError)) break
  }

  if (!operationName) throw lastError
  if (!video) throw lastError
  const videoBuffer = await downloadVideo(video)

  const dir = path.resolve(process.cwd(), 'generated', 'videos')
  await fs.mkdir(dir, { recursive: true })

  const filename = `video-${Date.now()}.mp4`
  await fs.writeFile(path.join(dir, filename), videoBuffer)

  return {
    filename,
    operationName,
    model,
  }
}
