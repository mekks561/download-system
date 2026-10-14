import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rate-limiters';
import { requireGmAuth } from '../middleware/gm-auth';
import multer from 'multer';
import os from 'node:os';
import {
  GmLoginSchema,
  GmResetPasswordSchema,
  GmUserQuerySchema,
  GmUserUpdateSchema,
  GmDownloadQuerySchema,
  GmUploadQuerySchema,
  GmActivityQuerySchema,
  GmPluginToggleSchema,
  GmStorageCleanupSchema,
} from '@dm/shared';
import * as ctrl from '../controllers/gm.controller';
import * as storageCtrl from '../controllers/gm-storage.controller';

/** 路径 :id 校验（params 原生是字符串，coerce 成正整数） */
const GmIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

const upload = multer({ dest: os.tmpdir() });

// 公开：GM 登录（独立 gm_users），与主站认证端点共享 10 次/15 分钟限流
router.post('/auth/login', authLimiter, validate(GmLoginSchema), ctrl.login);

// 其余全部要求独立 GM JWT（主站 JWT_SECRET 签发的 token 在此验签失败 → 401）
router.use(requireGmAuth);

router.get('/dashboard', ctrl.dashboard);
router.get('/workers', ctrl.getWorkers);
router.get('/logs', ctrl.getLogs);
router.get('/users', validate(GmUserQuerySchema, 'query'), ctrl.users);
router.patch(
  '/users/:id',
  validate(GmIdParamSchema, 'params'),
  validate(GmUserUpdateSchema),
  ctrl.updateUser,
);
router.post(
  '/users/:id/reset-password',
  validate(GmIdParamSchema, 'params'),
  validate(GmResetPasswordSchema),
  ctrl.resetPassword,
);
router.get('/downloads', validate(GmDownloadQuerySchema, 'query'), ctrl.downloads);
router.post('/downloads/:id/cancel', validate(GmIdParamSchema, 'params'), ctrl.cancelDownload);
// 既有只读上传审计端点保留（切换为 GM 独立鉴权）
router.get('/uploads', ctrl.uploads);
router.delete('/uploads/:id', validate(GmIdParamSchema, 'params'), ctrl.deleteUpload);
router.get('/activities', validate(GmActivityQuerySchema, 'query'), ctrl.activities);

// ---------------------------------------------------------------
// 系统设置
// ---------------------------------------------------------------
router.get('/settings', ctrl.listSettings);
router.patch('/settings/:key', ctrl.updateSetting);

// ---------------------------------------------------------------
// 插件管理 (Task 3)
// ---------------------------------------------------------------
router.get('/plugins', ctrl.plugins);
router.post('/plugins/upload', upload.single('plugin'), ctrl.uploadPlugin);
router.post('/plugins/:id/toggle', validate(GmPluginToggleSchema), ctrl.togglePlugin);
router.delete('/plugins/:id', ctrl.uninstallPlugin);

// ---------------------------------------------------------------
// 资源治理 (Task 3)
// ---------------------------------------------------------------
router.get('/storage/stats', storageCtrl.getStats);
router.get('/storage/category-stats', storageCtrl.getCategoryStats);
router.get('/storage/trends', storageCtrl.getTrends);
router.get('/storage/ai-insights', storageCtrl.getAiInsights);
router.get('/storage/duplicates', storageCtrl.getDuplicates);
router.get('/storage/archiving/suggestions', storageCtrl.getArchivingSuggestions);
router.post('/storage/archiving/apply', storageCtrl.applyArchiving);
router.post('/storage/archiving/restore', storageCtrl.restoreArchiving);
router.get('/storage/user-profiles', storageCtrl.getUserProfiles);
router.get('/traffic/stats', storageCtrl.getTrafficStats);
router.get('/traffic/forecast', storageCtrl.getTrafficForecast);
router.get('/autonomous/logs', storageCtrl.getAutonomousLogs);
router.get('/autonomous/status', storageCtrl.getAutoScalerStatus);
router.post('/autonomous/toggle', storageCtrl.toggleAutoScaler);
router.post('/storage/ai-action', storageCtrl.applyAiAction);
router.get('/storage/cleanup/preview', storageCtrl.getCleanupPreview);
router.post('/storage/cleanup', validate(GmStorageCleanupSchema), storageCtrl.cleanup);

export default router;
