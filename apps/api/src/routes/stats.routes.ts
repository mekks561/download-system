import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/stats.controller';

const router = Router();
router.use(auth);
router.get('/overview', ctrl.overview);
router.get('/activities', ctrl.activities);
router.get('/trend', ctrl.trend);
router.get('/file-types', ctrl.fileTypes);
export default router;
