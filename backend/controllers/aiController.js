import { generateCopy } from '../services/geminiService.js'
import { generateImage } from '../services/imageService.js'
import { generateVideo } from '../services/videoService.js'
import { AI_COSTS } from '../config/aiCosts.js'
import Generation from '../models/Generation.js'
import { companyOwnerId } from '../utils/companyWorkspace.js'

// Record a successful generation so its cost flows into the user's Total Spend.
// Best-effort: a logging failure must never break the generation response.
async function recordGeneration(req, kind, title, url = '') {
  try {
    if (!req.user?.id) return
    await Generation.create({ user: companyOwnerId(), kind, cost: AI_COSTS[kind] || 0, title, url })
  } catch (err) {
    console.error('Could not record generation spend:', err.message)
  }
}

export async function generateCopyHandler(req, res, next) {
  try {
    const { brand, product, audience, tone, type, keywords, words } = req.body
    if (!brand || !product) return res.status(400).json({ error: 'brand and product are required' })
    const content = await generateCopy({ brand, product, audience, tone, type, keywords, words })
    await recordGeneration(req, 'copy', `${brand} · ${product}`)
    res.json({ content })
  } catch (err) {
    next(err)
  }
}

export async function generateImageHandler(req, res, next) {
  try {
    const { prompt, product, style, size, pixelWidth, pixelHeight, images } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })
    const image = await generateImage({ prompt, product, style, size, pixelWidth, pixelHeight, images })
    const url = `${req.protocol}://${req.get('host')}/generated/images/${image.filename}`
    await recordGeneration(req, 'image', product || prompt, url)
    res.json({ url, model: image.model })
  } catch (err) {
    next(err)
  }
}

export async function generateVideoHandler(req, res, next) {
  try {
    const { prompt, format, music, quality, voice, brand, cta, images } = req.body
    if (!prompt) return res.status(400).json({ error: 'prompt is required' })

    const video = await generateVideo({ prompt, format, music, quality, voice, brand, cta, images })
    const videoUrl = `${req.protocol}://${req.get('host')}/generated/videos/${video.filename}`

    await recordGeneration(req, 'video', brand || prompt, videoUrl)
    res.json({ videoUrl, operationName: video.operationName, model: video.model })
  } catch (err) {
    next(err)
  }
}

// GET /api/ai/usage — this user's generations + total spend, for the dashboard.
export async function getUsageHandler(req, res, next) {
  try {
    const generations = await Generation.find({}).sort({ createdAt: -1 }).limit(100)
    const totalSpend = generations.reduce((sum, g) => sum + (g.cost || 0), 0)
    res.json({ generations, totalSpend })
  } catch (err) {
    next(err)
  }
}
