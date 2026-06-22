import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const ALLOWED_DOMAIN = '@nxtwave.co.in'

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' })

// POST /api/auth/signup
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      return res.status(400).json({ error: `Only ${ALLOWED_DOMAIN} email addresses are allowed` })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    const user = await User.create({ name, email, password })
    const token = signToken(user.id)
    res.status(201).json({ user, token })
  } catch (err) { next(err) }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    const token = signToken(user.id)
    res.json({ user, token })
  } catch (err) { next(err) }
}

// POST /api/auth/client — a logged-in company user creates a client account.
// Clients can use any email (the @nxtwave.co.in rule only applies to self-signup).
export async function createClient(req, res, next) {
  try {
    const { name, email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' })
    }
    const user = await User.create({ name, email, password, role: 'client', createdBy: req.user.id })
    res.status(201).json({ user })
  } catch (err) { next(err) }
}

// POST /api/auth/logout — stateless JWT, nothing to do server-side
export async function logout(_req, res) {
  res.json({ success: true })
}
