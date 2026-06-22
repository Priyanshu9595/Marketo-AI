import fetch from 'node-fetch'

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`

function normalizeToken(token = '') {
  return String(token).trim().replace(/^['"]|['"]$/g, '')
}

function getRawConfig() {
  const accessToken = normalizeToken(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_USER_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN
  )
  const pageId = String(process.env.FACEBOOK_PAGE_ID || '').trim()

  if (!accessToken || !pageId) {
    const err = new Error('Facebook posting is not configured. Add FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in backend/.env.')
    err.status = 400
    throw err
  }

  return { accessToken, pageId }
}

function explainFacebookTokenError(err) {
  const message = err.message || ''
  if (/could not be decrypted|invalid.*token|OAuthException/i.test(message)) {
    const friendly = new Error('Facebook access token is invalid or expired. Generate a fresh Page access token from Graph API Explorer using pages_manage_posts, paste the Page access_token from /me/accounts into FACEBOOK_PAGE_ACCESS_TOKEN, then restart backend.')
    friendly.status = err.status || 400
    return friendly
  }
  if (/publish_actions|Unpublished posts must be posted to a page as the page itself|permission/i.test(message)) {
    const friendly = new Error('Facebook needs a Page access token with pages_manage_posts permission. Your current FACEBOOK_PAGE_ACCESS_TOKEN looks like a user/app token or does not have Page posting permission. Generate a Page access token for this page, update backend/.env, then restart backend.')
    friendly.status = err.status || 400
    return friendly
  }
  return err
}

function isVideoUrl(url = '') {
  return /\.(mp4|mov)(\?|#|$)/i.test(url)
}

function assertPublicFacebookMediaUrl(mediaUrl, video) {
  let parsed
  try {
    parsed = new URL(mediaUrl)
  } catch {
    const err = new Error('Facebook media URL is invalid.')
    err.status = 400
    throw err
  }

  if (parsed.protocol !== 'https:') {
    const err = new Error('Facebook requires a public HTTPS media URL. Set BACKEND_PUBLIC_URL to your public HTTPS backend URL, or paste a public media URL.')
    err.status = 400
    throw err
  }

  if (/^(localhost|127\.|0\.0\.0\.0)/i.test(parsed.hostname)) {
    const err = new Error('Facebook cannot access localhost media. Use a public HTTPS URL for uploaded media.')
    err.status = 400
    throw err
  }

  if (!video && !/\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(parsed.pathname)) {
    const err = new Error('Facebook image posting supports public image URLs. Please upload or paste a JPG/JPEG/PNG/GIF/WEBP image URL.')
    err.status = 400
    throw err
  }

  if (video && !/\.(mp4|mov)(\?|#|$)/i.test(parsed.pathname)) {
    const err = new Error('Facebook video posting supports MP4 or MOV media URLs.')
    err.status = 400
    throw err
  }
}

async function graphPost(path, params) {
  const body = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE_URL}/${path}`, {
    method: 'POST',
    body,
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error?.message || `Facebook API error (${res.status})`)
    err.status = res.status
    throw err
  }

  return data
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${GRAPH_BASE_URL}/${path}?${qs}`)
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error?.message || `Facebook API error (${res.status})`)
    err.status = res.status
    throw err
  }

  return data
}

async function resolvePageAccessToken(accessToken, pageId) {
  const accounts = await graphGet('me/accounts', {
    fields: 'id,name,access_token',
    access_token: accessToken,
  })
  const page = accounts.data?.find(item => item.id === pageId)
  if (!page?.access_token) return accessToken
  return page.access_token
}

async function getConfig() {
  const config = getRawConfig()
  try {
    const accessToken = await resolvePageAccessToken(config.accessToken, config.pageId)
    return { ...config, accessToken }
  } catch {
    return config
  }
}

export async function publishFacebookPost({ caption, mediaUrl, type, postMethod = 'Feed' }) {
  try {
    const { accessToken, pageId } = await getConfig()
    const video = type === 'Video' || isVideoUrl(mediaUrl)
    const story = postMethod === 'Story'

    if (!mediaUrl && story) {
      const err = new Error('Facebook Story posting needs a public image URL.')
      err.status = 400
      throw err
    }

    if (!mediaUrl) {
      const published = await graphPost(`${pageId}/feed`, {
        message: caption,
        access_token: accessToken,
      })
      if (!published.id) throw new Error('Facebook did not return a feed post id.')
      return published
    }

    assertPublicFacebookMediaUrl(mediaUrl, video)

    if (story) {
      if (video) {
        const err = new Error('Facebook video Story publishing is not enabled in this app yet. Use an image Story or Feed video.')
        err.status = 400
        throw err
      }

      const photo = await graphPost(`${pageId}/photos`, {
        url: mediaUrl,
        caption,
        published: 'false',
        access_token: accessToken,
      })
      if (!photo.id) throw new Error('Facebook did not return an unpublished photo id.')

      const storyPost = await graphPost(`${pageId}/photo_stories`, {
        photo_id: photo.id,
        access_token: accessToken,
      })
      if (!storyPost.id && !storyPost.post_id) throw new Error('Facebook did not return a Story id.')
      return { id: storyPost.id || storyPost.post_id, ...storyPost }
    }

    if (video) {
      const published = await graphPost(`${pageId}/videos`, {
        file_url: mediaUrl,
        description: caption,
        access_token: accessToken,
      })
      if (!published.id) throw new Error('Facebook did not return a video post id.')
      return published
    }

    const published = await graphPost(`${pageId}/photos`, {
      url: mediaUrl,
      caption,
      access_token: accessToken,
    })
    if (!published.id && !published.post_id) throw new Error('Facebook did not return a photo post id.')
    return { id: published.post_id || published.id, ...published }
  } catch (err) {
    throw explainFacebookTokenError(err)
  }
}
