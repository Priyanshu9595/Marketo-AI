import { generateCopy } from '../services/geminiService.js'
import { generateImage } from '../services/imageService.js'
import { generateVideo } from '../services/videoService.js'
import { AI_COSTS } from '../config/aiCosts.js'
import Generation from '../models/Generation.js'
import { companyOwnerId } from '../utils/companyWorkspace.js'
import { uploadBuffer } from '../services/mediaHostService.js'
import fs from 'fs/promises'
import path from 'path'

async function recordGeneration(req, kind, title, url = '', preview = '') {
  try {
    if (!req.user?.id) return
    await Generation.create({
      user: companyOwnerId(),
      kind,
      cost: AI_COSTS[kind] || 0,
      title,
      url,
      preview,
    })
  } catch (err) {
    console.error('Could not record generation spend:', err.message)
  }
}

async function permanentGeneratedUrl(folder, filename, publicUrl) {
  try {
    const filePath = path.resolve(process.cwd(), 'generated', folder, filename)
    const buffer = await fs.readFile(filePath)
    return await uploadBuffer(buffer, { filename })
  } catch (err) {
    console.error('Could not move generated media to permanent hosting:', err.message)
    return publicUrl
  }
}

function serializeGeneration(generation) {
  return {
    id: generation.id,
    at: new Date(generation.createdAt).getTime(),
    kind: generation.kind === 'copy' ? 'text' : generation.kind,
    title: generation.title,
    preview: generation.preview,
    cost: generation.cost,
    url: generation.url,
  }
}

export async function generateCopyHandler(req, res, next) {
  try {
    const { brand, product, audience, tone, type, keywords, words } = req.body
    if (!brand || !product) return res.status(400).json({ error: 'brand and product are required' })

    const content = await generateCopy({ brand, product, audience, tone, type, keywords, words })
    await recordGeneration(req, 'copy', `${brand} - ${product}`, '', content)
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
    const localUrl = `${req.protocol}://${req.get('host')}/generated/images/${image.filename}`
    const url = await permanentGeneratedUrl('images', image.filename, localUrl)

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
    const localVideoUrl = `${req.protocol}://${req.get('host')}/generated/videos/${video.filename}`
    const videoUrl = await permanentGeneratedUrl('videos', video.filename, localVideoUrl)

    await recordGeneration(req, 'video', brand || prompt, videoUrl)
    res.json({ videoUrl, operationName: video.operationName, model: video.model })
  } catch (err) {
    next(err)
  }
}

export async function getUsageHandler(req, res, next) {
  try {
    const allowedKinds = ['copy', 'image', 'video']
    const kind = allowedKinds.includes(req.query.kind) ? req.query.kind : ''
    const limit = Math.min(Number(req.query.limit) || 100, 100)
    const query = kind ? { kind } : {}
    const generations = await Generation.find(query).sort({ createdAt: -1 }).limit(limit)
    const totalSpend = generations.reduce((sum, g) => sum + (g.cost || 0), 0)

    res.json({ generations: generations.map(serializeGeneration), totalSpend })
  } catch (err) {
    next(err)
  }
}

export async function clearUsageHandler(req, res, next) {
  try {
    const allowedKinds = ['copy', 'image', 'video']
    const kind = allowedKinds.includes(req.query.kind) ? req.query.kind : ''
    const query = kind ? { kind } : {}
    const result = await Generation.deleteMany(query)
    res.json({ success: true, deleted: result.deletedCount || 0 })
  } catch (err) {
    next(err)
  }
}
