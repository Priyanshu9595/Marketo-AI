import { Router } from 'express'
import * as ctrl from '../controllers/campaignController.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.use(requireAuth)

router.get   ('/',     ctrl.getAll)
router.post  ('/',     ctrl.create)
router.put   ('/:id',  ctrl.update)
router.delete('/:id',  ctrl.remove)

export default router