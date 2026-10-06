import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rate-limiters';
import { requireGmAuth } from '../middleware/gm-auth';
import {
  GmLoginSchema,
  GmResetPasswordSchema,
  GmUserQuerySchema,
  GmUserUpdateSchema,
  GmDownloadQuerySchema,
} from '@dm/shared';
import * as ctrl from '../controllers/gm.controller';

/** 路径 :id 校验（params 原生是字符串，coerce 成正整数） */
const GmIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const router = Router();

// 公开：GM 登录（独立 gm_users），与主站认证端点共享 10 次/15 分钟限流
router.post('/auth/login', authLimiter, validate(GmLoginSchema), ctrl.login);

// 其余全部要求独立 GM JWT（主站 JWT_SECRET 签发的 token 在此验签失败 → 401）
router.use(requireGmAuth);

router.get('/dashboard', ctrl.dashboard);
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

export default router;
