import { Router } from 'express'
import { generateCopyHandler, generateImageHandler } from '../controllers/aiController.js'
import { aiLimiter } from '../middleware/rateLimit.js'

const router = Router()

// POST /api/ai/copy   — generate marketing copy
router.post('/copy',  aiLimiter, generateCopyHandler)

// POST /api/ai/image  — generate product image
router.post('/image', aiLimiter, generateImageHandler)

export default router