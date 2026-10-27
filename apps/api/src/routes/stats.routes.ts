import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/stats.controller.js';

const router = Router();
router.use(auth);
router.get('/overview', ctrl.overview);
router.get('/activities', ctrl.activities);
router.get('/trend', ctrl.trend);
router.get('/file-types', ctrl.fileTypes);
export default router;
