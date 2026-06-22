// Allowed origins: CLIENT_URL env var (comma-separated) + localhost defaults
const rawOrigins = process.env.CLIENT_URL || ''
const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://localhost:5173',
  ...rawOrigins.split(',').map(o => o.trim()).filter(Boolean),
])

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) return callback(null, true)
    if (allowedOrigins.has(origin)) return callback(null, true)
    // Allow any *.onrender.com subdomain for Render deployments
    if (/^https:\/\/[a-z0-9-]+\.onrender\.com$/.test(origin)) return callback(null, true)
    callback(new Error(`CORS: Origin ${origin} not allowed`))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}

export default corsOptions