import { generateCopy } from '../services/geminiService.js'
import { generateImage } from '../services/imageService.js'

export async function generateCopyHandler(req, res, next) {
  try {
    const { brand, product, audience, tone, type, keywords } = req.body
    if (!brand || !product) return res.status(400).json({ error: 'brand and product are required' })
    const content = await generateCopy({ brand, product, audience, tone, type, keywords })
    res.json({ content })
  } catch (err) {
    next(err)
  }
}

export async function generateImageHandler(req, res, next) {
  try {
    const { product, scene, style } = req.body
    if (!product) return res.status(400).json({ error: 'product is required' })
    const url = await generateImage({ product, scene, style })
    res.json({ url })
  } catch (err) {
    next(err)
  }
}