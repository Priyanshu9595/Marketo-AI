import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import connectDB from './config/db.js'
import corsOptions from './config/corsOptions.js'
import errorHandler from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimit.js'

import authRoutes      from './routes/auth.js'
import campaignRoutes  from './routes/campaigns.js'
import socialRoutes    from './routes/social.js'
import aiRoutes        from './routes/ai.js'
import linkedinRoutes  from './routes/linkedin.js'
import youtubeRoutes   from './routes/youtube.js'

const app = express()
const PORT = process.env.PORT || 5000

// Connect to MongoDB before serving requests
await connectDB()

// ── Middleware ────────────────────────────────────────
app.use(cors(corsOptions))
app.use(express.json({ limit: '25mb' }))
app.use(generalLimiter)

// Static folders
app.use('/generated', express.static(path.resolve(process.cwd(), 'generated')))
app.use('/uploads',   express.static(path.resolve(process.cwd(), 'uploads')))

// ── Routes ────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/campaigns', campaignRoutes)
app.use('/api/social',    socialRoutes)
app.use('/api/ai',        aiRoutes)
app.use('/api/linkedin',  linkedinRoutes)
app.use('/api/youtube',   youtubeRoutes)

// ── Health check ──────────────────────────────────────
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── 404 ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ── Error handler ─────────────────────────────────────
app.use(errorHandler)

// ── Start server ──────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Marketo AI backend running on http://localhost:${PORT}`)
  console.log(`   Health: http://localhost:${PORT}/api/health\n`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`)
    console.error(`   PowerShell mein yeh run karo: Stop-Process -Name node -Force`)
    console.error(`   Phir dobara: npm run dev\n`)
    process.exit(1)
  } else {
    throw err
  }
})
