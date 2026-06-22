import fetch from 'node-fetch'

const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

function getConfig() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
  const igUserId = process.env.INSTAGRAM_IG_USER_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID

  if (!accessToken || !igUserId) {
    const err = new Error('Instagram posting is not configured. Add INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_IG_USER_ID in backend/.env.')
    err.status = 400
    throw err
  }

  return { accessToken, igUserId }
}

function isVideoUrl(url = '') {
  return /\.(mp4|mov)(\?|#|$)/i.test(url)
}

function assertPublicInstagramMediaUrl(mediaUrl, video) {
  let parsed
  try {
    parsed = new URL(mediaUrl)
  } catch {
    const err = new Error('Instagram media URL is invalid.')
    err.status = 400
    throw err
  }

  if (parsed.protocol !== 'https:') {
    const err = new Error('Instagram requires a public HTTPS media URL. Localhost uploads cannot be posted directly. Set BACKEND_PUBLIC_URL to your public HTTPS backend URL, or paste a public media URL.')
    err.status = 400
    throw err
  }

  if (/^(localhost|127\.|0\.0\.0\.0)/i.test(parsed.hostname)) {
    const err = new Error('Instagram cannot access localhost media. Use a public HTTPS URL for uploaded media.')
    err.status = 400
    throw err
  }

  if (!video && !/\.(jpe?g)(\?|#|$)/i.test(parsed.pathname)) {
    const err = new Error('Instagram image posting supports JPG/JPEG media. Please upload a JPG image or use an MP4/MOV video.')
    err.status = 400
    throw err
  }

  if (video && !/\.(mp4|mov)(\?|#|$)/i.test(parsed.pathname)) {
    const err = new Error('Instagram video posting supports MP4 or MOV media.')
    err.status = 400
    throw err
  }
}

async function graphPost(path, params) {
  const body = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE_URL}/${path}`, {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error?.message || `Instagram API error (${res.status})`)
    err.status = res.status
    throw err
  }

  return data
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE_URL}/${path}?${qs}`, {
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error?.message || `Instagram API error (${res.status})`)
    err.status = res.status
    throw err
  }

  return data
}

// Poll a media container until it has finished processing. Reels need the most
// time; image Stories process quickly but are NOT instant — publishing too early
// is what triggers "Media ID is not available".
async function waitForContainer(containerId, accessToken, { video } = {}) {
  const maxTries = video ? 24 : 10
  const delayMs = video ? 5000 : 2000
  for (let i = 0; i < maxTries; i += 1) {
    const status = await graphGet(containerId, {
      fields: 'status_code',
      access_token: accessToken,
    })

    if (status.status_code === 'FINISHED') return
    if (status.status_code === 'ERROR') throw new Error('Instagram media processing failed.')
    // Images may not expose a status_code at all once ready — for non-video,
    // anything other than IN_PROGRESS means we can go ahead.
    if (!video && status.status_code && status.status_code !== 'IN_PROGRESS') return
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
}

// Publish a container, retrying when Instagram reports the media isn't ready yet
// (the container is still finishing in the background).
async function publishContainer(igUserId, creationId, accessToken, tries = 5) {
  let lastErr
  for (let i = 0; i < tries; i += 1) {
    try {
      const published = await graphPost(`${igUserId}/media_publish`, {
        creation_id: creationId,
        access_token: accessToken,
      })
      if (published.id) return published
      lastErr = new Error('Instagram did not return a published media id.')
    } catch (err) {
      lastErr = err
      // Only "not ready yet" errors are worth retrying; anything else is fatal.
      if (!/not available|not ready|still being processed|media is not/i.test(err.message || '')) throw err
    }
    await new Promise(resolve => setTimeout(resolve, 3000))
  }
  throw lastErr
}

export async function publishInstagramPost({ caption, mediaUrl, type, postMethod = 'Feed' }) {
  if (!mediaUrl) {
    const err = new Error('Instagram does not support text-only posting here. Upload a public JPG/MP4/MOV media URL, or choose another platform.')
    err.status = 400
    throw err
  }

  const { accessToken, igUserId } = getConfig()
  const video = type === 'Video' || isVideoUrl(mediaUrl)
  const story = postMethod === 'Story'
  assertPublicInstagramMediaUrl(mediaUrl, video)

  const createParams = {
    access_token: accessToken,
    ...(story ? {} : { caption }),
    ...(story
      ? { media_type: 'STORIES', ...(video ? { video_url: mediaUrl } : { image_url: mediaUrl }) }
      : video
        ? { media_type: 'REELS', video_url: mediaUrl }
        : { image_url: mediaUrl }),
  }

  const container = await graphPost(`${igUserId}/media`, createParams)
  if (!container.id) throw new Error('Instagram did not return a media container id.')

  // Reels and Stories both need the container to finish processing before publish.
  if (video || story) await waitForContainer(container.id, accessToken, { video })

  const published = await publishContainer(igUserId, container.id, accessToken)
  return published
}
