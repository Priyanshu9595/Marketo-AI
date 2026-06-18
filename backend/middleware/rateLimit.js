import rateLimit from 'express-rate-limit'

export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 20,
  message: { error: 'Too many AI requests. Please wait a moment.' },
  standardHeaders: true,
  legacyHeaders: false,
})

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
})