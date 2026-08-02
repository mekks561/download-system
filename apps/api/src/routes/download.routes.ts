import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DownloadCreateSchema } from '@dm/shared';
import * as ctrl from '../controllers/download.controller';

const router = Router();
router.use(auth); // 所有下载路由需认证
router.get('/', ctrl.list);
router.post('/', validate(DownloadCreateSchema), ctrl.create);
router.post('/:id/start', ctrl.start);
router.post('/:id/pause', ctrl.pause);
router.post('/:id/resume', ctrl.resume);
router.post('/:id/cancel', ctrl.cancel);
router.delete('/:id', ctrl.remove);
export default router;
