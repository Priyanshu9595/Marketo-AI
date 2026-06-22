import { Router } from 'express'
import { generateCopyHandler, generateImageHandler, generateVideoHandler, getUsageHandler } from '../controllers/aiController.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Auth so each generation can be billed to the right user's auto campaign.
router.use(requireAuth)

// POST /api/ai/copy   — generate marketing copy
router.post('/copy',  aiLimiter, generateCopyHandler)

// POST /api/ai/image  — generate product image
router.post('/image', aiLimiter, generateImageHandler)

router.post('/video', aiLimiter, generateVideoHandler)

// GET /api/ai/usage — generation history + total generation spend
router.get('/usage', getUsageHandler)

export default router
