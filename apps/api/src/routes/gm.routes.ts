import { Router } from 'express';
import { auth, requireAdmin } from '../middleware/auth';
import * as ctrl from '../controllers/gm.controller';

const router = Router();
router.use(auth, requireAdmin); // 所有 GM 路由需管理员
router.get('/dashboard', ctrl.dashboard);
router.get('/users', ctrl.users);
router.get('/downloads', ctrl.downloads);
router.get('/uploads', ctrl.uploads);
export default router;
