import Post from '../models/Post.js'
import { publishInstagramPost } from '../services/instagramService.js'
import { publishFacebookPost } from '../services/facebookService.js'
import { publishLinkedInPost } from '../services/linkedinService.js'
import { recomputeAutoCampaign } from '../services/autoCampaignService.js'
import { uploadBase64, rehostLocalUrl } from '../services/mediaHostService.js'
import { fetchEngagement, supportsRealEngagement } from '../services/engagementService.js'
import { companyOwnerId } from '../utils/companyWorkspace.js'
import fs from 'fs/promises'
import path from 'path'

const ENGAGEMENT_REFRESH_MS = 30 * 1000
let maintenanceRunning = false
const SCHEDULE_TIME_ZONE_OFFSET = process.env.SCHEDULE_TIME_ZONE_OFFSET || '+05:30'

// Pull REAL engagement (likes/comments/shares) from the platform for posted
// Facebook/Instagram items, refreshing at most once every few minutes so the
// dashboard shows actual response, not invented numbers.
async function syncEngagementDue() {
  const cutoff = new Date(Date.now() - ENGAGEMENT_REFRESH_MS)
  const posts = await Post.find({
    posted: true,
    deleted: { $ne: true },
    platform: { $in: ['Facebook', 'Instagram', 'LinkedIn'] },
    externalPostId: { $nin: [null, ''] },
    $or: [{ engagementSyncedAt: { $exists: false } }, { engagementSyncedAt: { $lt: cutoff } }],
  })

  for (const post of posts) {
    const metrics = supportsRealEngagement(post) ? await fetchEngagement(post) : null
    await Post.updateOne(
      { _id: post._id },
      { $set: { ...(metrics || {}), engagementSyncedAt: new Date() } }
    )
  }
}

const normalizeTime = (time = '10:00:00') => {
  const [h = '10', m = '00', s = '00'] = String(time).split(':')
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}:${(s || '00').padStart(2, '0')}`
}

const scheduledDateTime = (date, time) =>
  new Date(`${date}T${normalizeTime(time)}${SCHEDULE_TIME_ZONE_OFFSET}`)

const isDue = (date, time) => {
  const scheduled = scheduledDateTime(date, time)
  return !isNaN(scheduled) && scheduled <= new Date()
}

const POSTING_LOCK_TIMEOUT_MS = 15 * 60 * 1000
const POST_FAILURE_RETRY_MS = 30 * 60 * 1000
const REAL_POSTING_PLATFORMS = new Set(['Instagram', 'Facebook', 'LinkedIn'])
const EXTERNAL_WORKFLOW_PLATFORMS = new Set(['YouTube'])
const PLATFORM_PUBLISHERS = {
  Facebook: publishFacebookPost,
  Instagram: publishInstagramPost,
  LinkedIn: publishLinkedInPost,
}

const MEDIA_EXTENSIONS = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpeg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/mov': 'mov',
}

function mimeFromFilename(name = '') {
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg'
  if (/\.mp4$/i.test(name)) return 'video/mp4'
  if (/\.mov$/i.test(name)) return 'video/quicktime'
  return ''
}

function extensionFromUpload(mediaUpload, mimeType) {
  if (/\.jpeg$/i.test(mediaUpload?.name || '')) return 'jpeg'
  if (/\.jpg$/i.test(mediaUpload?.name || '')) return 'jpg'
  return MEDIA_EXTENSIONS[mimeType]
}

function configuredPublicBaseUrl() {
  return (process.env.BACKEND_PUBLIC_URL || process.env.PUBLIC_BACKEND_URL || '').trim().replace(/\/$/, '')
}

function publicBaseUrl(req) {
  return configuredPublicBaseUrl() || `${req.protocol}://${req.get('host')}`
}

function assertPublicUploadUrl(platform) {
  const baseUrl = configuredPublicBaseUrl()
  if (!baseUrl || !/^https:\/\//i.test(baseUrl) || /\/\/(localhost|127\.|0\.0\.0\.0)/i.test(baseUrl)) {
    const err = new Error(`Upload is okay, but ${platform} cannot read localhost files. Add BACKEND_PUBLIC_URL with a public HTTPS backend URL in backend/.env, restart backend, then upload again.`)
    err.status = 400
    throw err
  }
}

async function saveUploadedMedia(req, mediaUpload, platform) {
  if (!mediaUpload?.data) return ''

  const mimeType = mediaUpload.mimeType || mimeFromFilename(mediaUpload.name)
  const extension = extensionFromUpload(mediaUpload, mimeType)
  if (!extension) {
    const err = new Error('Upload supports JPG/JPEG images or MP4/MOV videos only.')
    err.status = 400
    throw err
  }

  const uploadParams = {
    dataBase64: mediaUpload.data,
    mimeType,
    filename: mediaUpload.name || `social-${Date.now()}.${extension}`,
  }

  // Try public hosting up to 2 times (catbox.moe has occasional hiccups)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const url = await uploadBase64(uploadParams)
      if (url && url.startsWith('http')) return url
    } catch (err) {
      console.warn(`[mediaHost] attempt ${attempt} failed:`, err.message)
      if (attempt < 2) await new Promise(r => setTimeout(r, 1500))
    }
  }

  // Both attempts failed — fall back to local storage
  // Works fine for LinkedIn/YouTube, but Facebook/Instagram need a public URL
  const dir = path.resolve(process.cwd(), 'generated', 'social')
  await fs.mkdir(dir, { recursive: true })
  const filename = `social-${Date.now()}.${extension}`
  await fs.writeFile(path.join(dir, filename), Buffer.from(mediaUpload.data, 'base64'))
  const localUrl = `${publicBaseUrl(req)}/generated/social/${filename}`

  if (REAL_POSTING_PLATFORMS.has(platform)) {
    const publicBase = configuredPublicBaseUrl()
    if (!publicBase || /localhost|127\.|0\.0\.0\.0/i.test(publicBase)) {
      const err = new Error(
        `Image saved locally but public upload failed (catbox.moe unreachable). ` +
        `For Facebook/Instagram posting, either: ` +
        `(1) set CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET in backend/.env, or ` +
        `(2) set BACKEND_PUBLIC_URL to your deployed Render backend URL. ` +
        `Then restart the backend and try again.`
      )
      err.status = 400
      throw err
    }
  }

  return localUrl
}

async function autoPostDue() {
  const posts = await Post.find({ posted: false, deleted: { $ne: true } })
  const now = new Date()
  const duePosts = posts.filter(post => {
    const due = isDue(post.date, post.time)
    console.log(`[DEBUG autoPostDue] Post ${post._id}: date=${post.date}, time=${post.time}, scheduled=${scheduledDateTime(post.date, post.time)}, now=${now}, isDue=${due}`)
    return due && (!post.nextPostAttemptAt || post.nextPostAttemptAt <= now)
  })

  console.log(`[DEBUG autoPostDue] found ${duePosts.length} due posts`)
  for (const post of duePosts) {
    const lockCutoff = new Date(Date.now() - POSTING_LOCK_TIMEOUT_MS)
    const claimed = await Post.findOneAndUpdate(
      {
        _id: post._id,
        posted: false,
        $or: [
          { posting: false },
          { posting: { $exists: false } },
          { postingAt: { $lt: lockCutoff } },
        ],
      },
      {
        $set: { posting: true, postingAt: new Date(), lastPostAttemptAt: new Date(), postError: '' },
        $inc: { postAttemptCount: 1 },
      },
      { new: true }
    )

    if (!claimed) continue

    if (REAL_POSTING_PLATFORMS.has(claimed.platform)) {
      try {
        const publish = PLATFORM_PUBLISHERS[claimed.platform]
        const published = await publish({
          caption: claimed.text,
          mediaUrl: claimed.mediaUrl,
          type: claimed.type,
          postMethod: claimed.postMethod,
        })
        await Post.updateOne(
          { _id: claimed._id },
          {
            $set: {
              posted: true,
              posting: false,
              autoPosted: true,
              postedAt: new Date(),
              externalPostId: published.id,
              postError: '',
            },
            $unset: { postingAt: '', nextPostAttemptAt: '' },
          }
        )
      } catch (err) {
        await Post.updateOne(
          { _id: claimed._id },
          {
            $set: {
              posting: false,
              postError: err.message || `${claimed.platform} posting failed.`,
              nextPostAttemptAt: new Date(Date.now() + POST_FAILURE_RETRY_MS),
            },
            $unset: { postingAt: '' },
          }
        )
      }
      continue
    }

    if (EXTERNAL_WORKFLOW_PLATFORMS.has(claimed.platform)) {
      if (claimed.platform === 'YouTube' && process.env.N8N_WEBHOOK_URL) {
        try {
          const fetch = (await import('node-fetch')).default
          const scheduledDate = scheduledDateTime(claimed.date, claimed.time)
          
          const response = await fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: claimed.id,
              title: claimed.youtubeTitle || claimed.text,
              description: claimed.youtubeDescription || claimed.text,
              tags: claimed.youtubeTags,
              mediaUrl: claimed.mediaUrl,
              scheduledAt: scheduledDate.toISOString(),
            })
          })
          
          if (!response.ok) throw new Error(`n8n webhook returned ${response.status}`)
          
          await Post.updateOne(
            { _id: claimed._id },
            {
              $set: { posted: true, posting: false, autoPosted: true, postedAt: new Date(), postError: '' },
              $unset: { postingAt: '', nextPostAttemptAt: '' }
            }
          )
        } catch (err) {
          await Post.updateOne(
            { _id: claimed._id },
            {
              $set: {
                posting: false,
                postError: `n8n webhook failed: ${err.message}`,
                nextPostAttemptAt: new Date(Date.now() + POST_FAILURE_RETRY_MS)
              },
              $unset: { postingAt: '' }
            }
          )
        }
      } else {
        await Post.updateOne(
          { _id: claimed._id },
          {
            $set: { posted: true, posting: false, autoPosted: true, postedAt: new Date(), postError: '' },
            $unset: { postingAt: '' },
          }
        )
      }
      continue
    }

    await Post.updateOne(
      { _id: claimed._id },
      {
        $set: { posted: true, posting: false, autoPosted: true, postedAt: new Date(), postError: '' },
        $unset: { postingAt: '' },
      }
    )
  }
}

function runSocialMaintenance() {
  if (maintenanceRunning) return
  maintenanceRunning = true
  Promise.resolve()
    .then(async () => {
      try { await autoPostDue() } catch (e) { console.error('autoPostDue:', e.message) }
      try { await syncEngagementDue() } catch (e) { console.error('syncEngagementDue:', e.message) }
      try { await recomputeAutoCampaign() } catch (e) { console.error('recomputeAutoCampaign:', e.message) }
    })
    .finally(() => {
      maintenanceRunning = false
    })
}

export async function getAll(req, res, next) {
  try {
    runSocialMaintenance()
    const posts = await Post.find({}).sort({ date: 1, time: 1 })
    res.json(posts)
  } catch (err) { next(err) }
}

export async function create(req, res, next) {
  try {
    const {
      platform, type, postMethod, text, mediaUrl, mediaUpload, date, time, posted,
      youtubeTitle, youtubeDescription, youtubeTags, rpm,
      impressions, clickRate, conversionRate, averageOrderValue,
    } = req.body
    if (!platform || !text || !date) {
      return res.status(400).json({ error: 'platform, text and date are required' })
    }
    const normalizedTime = normalizeTime(time)
    const dueNow = isDue(date, normalizedTime)
    const shouldMarkPostedNow = Boolean(posted) || (
      dueNow &&
      !REAL_POSTING_PLATFORMS.has(platform) &&
      !EXTERNAL_WORKFLOW_PLATFORMS.has(platform)
    )
    const uploadedMediaUrl = await saveUploadedMedia(req, mediaUpload, platform)
    // A pasted/AI-generated URL pointing at this machine won't be reachable by
    // the social platforms — move it to permanent public hosting if possible.
    const finalMediaUrl = uploadedMediaUrl || await rehostLocalUrl(mediaUrl || '')
    const post = await Post.create({
      user: companyOwnerId(), platform, type: type || 'Text message', postMethod: postMethod || 'Feed', text,
      mediaUrl: finalMediaUrl || '',
      date,
      time: normalizedTime,
      posted: shouldMarkPostedNow,
      autoPosted: !posted && shouldMarkPostedNow,
      postedAt: shouldMarkPostedNow ? new Date() : undefined,
      youtubeTitle: youtubeTitle || '',
      youtubeDescription: youtubeDescription || '',
      youtubeTags: youtubeTags || '',
      rpm: Number(rpm) || 0,
      impressions: Number(impressions) || 0,
      clickRate: Number(clickRate) || 0,
      conversionRate: Number(conversionRate) || 0,
      averageOrderValue: Number(averageOrderValue) || 0,
    })
    if (shouldMarkPostedNow) await recomputeAutoCampaign()
    res.status(201).json(post)
  } catch (err) { next(err) }
}

export async function update(req, res, next) {
  try {
    const body = { ...req.body }
    if (body.retryPosting) {
      body.posting = false
      body.postError = ''
      body.nextPostAttemptAt = null
      body.posted = false
      delete body.retryPosting
      // Move any local/tunnel media to permanent public hosting so the retry can
      // actually be fetched by the platform.
      const current = await Post.findOne({ _id: req.params.id })
      if (current?.mediaUrl) {
        const rehosted = await rehostLocalUrl(current.mediaUrl)
        if (rehosted !== current.mediaUrl) body.mediaUrl = rehosted
      }
    }
    if (body.time) body.time = normalizeTime(body.time)
    if (body.posted && !body.postedAt) {
      body.postedAt = new Date()
      body.posting = false
    }

    const post = await Post.findOneAndUpdate(
      { _id: req.params.id }, body, { new: true }
    )
    if (!post) return res.status(404).json({ error: 'Post not found' })
    await recomputeAutoCampaign()
    res.json(post)
  } catch (err) { next(err) }
}

export async function remove(req, res, next) {
  try {
    const deleted = await Post.findOneAndDelete({ _id: req.params.id })
    if (!deleted) return res.status(404).json({ error: 'Post not found' })
    await recomputeAutoCampaign()
    res.json({ success: true })
  } catch (err) { next(err) }
}
