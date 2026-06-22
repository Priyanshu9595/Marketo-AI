import { Router } from 'express'
import { signup, login, logout, createClient } from '../controllers/authController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/signup', signup)
router.post('/login',  login)
router.post('/logout', logout)
router.post('/client', requireAuth, createClient) // company creates a client account

export default router
