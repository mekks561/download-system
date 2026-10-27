import { Router } from 'express';
import { auth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { DownloadSettingsUpdateSchema } from '@dm/shared';
import * as ctrl from '../controllers/settings.controller.js';

const router = Router();

// 下载目录/并发/限速是**服务端全局**配置（单实例），非管理员不得读写
router.use(auth, requireAdmin);

router.get('/download', ctrl.getDownload);
router.put('/download', validate(DownloadSettingsUpdateSchema), ctrl.updateDownload);

export default router;
