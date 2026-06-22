// Fetch REAL engagement (likes/comments/shares) for a posted item from the
// platform's Graph API, so the dashboard reflects actual audience response
// instead of simulated numbers.
//
// Notes:
//   • Facebook deprecated organic post impressions in recent API versions, so
//     "views" is not reliably available and is reported as 0. Likes, comments
//     and shares are the dependable signals.
//   • Instagram exposes like_count and comments_count; it does not expose shares
//     for most media, so shares is 0.
//   • LinkedIn exposes likes and comments on a post via its socialActions REST
//     endpoint (same token used to publish). Views/impressions need the
//     organization analytics API and aren't fetched here, so they stay at
//     whatever was entered manually.

const GRAPH_VERSION = process.env.FACEBOOK_GRAPH_VERSION || process.env.INSTAGRAM_GRAPH_VERSION || 'v23.0'
const LINKEDIN_VERSION = process.env.LINKEDIN_VERSION || '202606'

function facebookToken() {
  return (process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
    process.env.FACEBOOK_USER_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
}

function instagramToken() {
  return (process.env.INSTAGRAM_ACCESS_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
}

function linkedinToken() {
  return (process.env.LINKEDIN_ACCESS_TOKEN || '').trim().replace(/^['"]|['"]$/g, '')
}

async function graphGet(path, params) {
  const qs = new URLSearchParams(params)
  // Abort a hung Facebook call so it can't stall the calendar request.
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}?${qs}`, {
    signal: AbortSignal.timeout(8000),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error?.message || `Graph error ${res.status}`)
  return data
}

async function fetchFacebook(externalPostId, token) {
  // Fetch each metric independently. Some need different scopes (likes →
  // pages_read_engagement, comments → pages_read_user_content); requesting them
  // together makes one missing permission fail the whole call. We only return
  // metrics we actually read, so a blocked field never zeroes a real value.
  const safeGet = async (fields, idOverride) => {
    try { return await graphGet(idOverride || externalPostId, { fields, access_token: token }) }
    catch { return null }
  }
  const result = {}

  const likesRes = await safeGet('likes.summary(true)')
  if (likesRes?.likes?.summary) result.likes = likesRes.likes.summary.total_count || 0

  const commentsRes = await safeGet('comments.summary(true)')
  if (commentsRes?.comments?.summary) result.comments = commentsRes.comments.summary.total_count || 0

  const storyRes = await safeGet('page_story_id')
  if (storyRes?.page_story_id) {
    const sharesRes = await safeGet('shares', storyRes.page_story_id)
    if (sharesRes) result.shares = sharesRes.shares?.count || 0
  }

  return result
}

// Try metric-sets in order; return the first insights payload that succeeds.
// Different IG media types support different metrics, and a single invalid
// metric fails the whole call — so we degrade gracefully.
async function instagramInsights(mediaId, token) {
  const sets = ['views,shares', 'reach,shares', 'impressions,shares', 'views', 'reach']
  for (const metric of sets) {
    try {
      const data = await graphGet(`${mediaId}/insights`, { metric, access_token: token })
      if (data.data?.length) return data.data
    } catch { /* not permitted or not applicable — try the next set */ }
  }
  return null
}

async function fetchInstagram(mediaId, token) {
  const result = {}

  // Basic counts — available without the insights permission.
  try {
    const data = await graphGet(mediaId, { fields: 'like_count,comments_count', access_token: token })
    if (typeof data.like_count === 'number') result.likes = data.like_count
    if (typeof data.comments_count === 'number') result.comments = data.comments_count
  } catch { /* leave likes/comments untouched */ }

  // Views + shares come from insights (needs instagram_manage_insights). Skipped
  // silently if the permission isn't granted, so we never overwrite with 0.
  const insights = await instagramInsights(mediaId, token)
  if (insights) {
    for (const item of insights) {
      const value = item.total_value?.value ?? item.values?.[0]?.value
      if (typeof value !== 'number') continue
      if (['views', 'impressions', 'reach'].includes(item.name)) result.views = value
      if (item.name === 'shares') result.shares = value
    }
  }

  return result
}

// Read likes + comments for a LinkedIn post from the socialActions endpoint.
// The post id we store is the share/ugcPost URN (e.g. urn:li:share:123…).
async function fetchLinkedIn(postUrn, token) {
  const result = {}
  try {
    const res = await fetch(`https://api.linkedin.com/rest/socialActions/${encodeURIComponent(postUrn)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Linkedin-Version': LINKEDIN_VERSION,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      signal: AbortSignal.timeout(8000),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const likes = data.likesSummary?.totalLikes ?? data.likesSummary?.aggregatedTotalLikes
      const comments = data.commentsSummary?.aggregatedTotalComments ?? data.commentsSummary?.totalFirstLevelComments
      if (typeof likes === 'number') result.likes = likes
      if (typeof comments === 'number') result.comments = comments
    }
  } catch { /* not permitted or unreachable — leave likes/comments untouched */ }
  return result
}

// Platforms whose engagement we can read automatically once a post has a real id.
export function supportsRealEngagement(post) {
  return ['Facebook', 'Instagram', 'LinkedIn'].includes(post.platform) && Boolean(post.externalPostId)
}

// Returns { views, likes, shares, comments } or null if it can't be fetched.
export async function fetchEngagement(post) {
  try {
    if (post.platform === 'Facebook') {
      const token = facebookToken()
      return token ? await fetchFacebook(post.externalPostId, token) : null
    }
    if (post.platform === 'Instagram') {
      const token = instagramToken()
      return token ? await fetchInstagram(post.externalPostId, token) : null
    }
    if (post.platform === 'LinkedIn') {
      const token = linkedinToken()
      return token ? await fetchLinkedIn(post.externalPostId, token) : null
    }
  } catch {
    return null
  }
  return null
}
