import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { DownloadCreateSchema, DownloadUpdateSchema } from '@dm/shared';
import * as ctrl from '../controllers/download.controller';

const router = Router();
router.use(auth); // 所有下载路由需认证
router.get('/', ctrl.list);
// 静态路径必须注册在 :id 参数路由之前，避免 /stats、/completed 被 :id 匹配
router.get('/stats', ctrl.stats);
router.delete('/completed', ctrl.clearCompleted);
router.post('/', validate(DownloadCreateSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(DownloadUpdateSchema), ctrl.update);
router.post('/:id/start', ctrl.start);
router.post('/:id/pause', ctrl.pause);
router.post('/:id/resume', ctrl.resume);
router.post('/:id/cancel', ctrl.cancel);
router.delete('/:id', ctrl.remove);
export default router;
