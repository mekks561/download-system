import { Router } from 'express';
import { auth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { StorageBrowseQuerySchema } from '@dm/shared';
import * as ctrl from '../controllers/storage.controller';

const router = Router();

// 目录浏览会暴露服务端文件结构，仅管理员可用
router.use(auth, requireAdmin);

router.get('/dirs', validate(StorageBrowseQuerySchema, 'query'), ctrl.browse);

export default router;
