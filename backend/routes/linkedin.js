import { Router } from 'express'
import * as ctrl from '../controllers/linkedinController.js'

const router = Router()

router.get('/auth-url', ctrl.authUrl)
router.get('/start', ctrl.start)
router.get('/callback', ctrl.callback)
router.post('/exchange', ctrl.exchange)

export default router
