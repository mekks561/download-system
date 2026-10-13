import { Router } from 'express';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limiters';
import {
  UserCreateSchema,
  LoginSchema,
  UserUpdateSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
  OnboardingStep2Schema,
} from '@dm/shared';
import * as ctrl from '../controllers/auth.controller';
import * as setupCtrl from '../controllers/setup.controller';

import { generateToken } from '../config/csrf';

// 认证接口限流（authLimiter）：防止登录暴力破解与注册批量刷号（10 次/15 分钟/IP）；
// S3 Task 4 起抽到 middleware/rate-limiters.ts，GM 登录端点共用同一实例
const router = Router();

// CSRF Token 获取接口
router.get('/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ success: true, data: { token }, timestamp: new Date().toISOString() });
});

// S1 首次运行初始化：未鉴权可达，故与登录注册同样限流（防止被刷爆用户表判定）
router.get('/setup-status', authLimiter, setupCtrl.getSetupStatus);
router.post('/setup', authLimiter, validate(OnboardingStep2Schema), setupCtrl.setup);
router.post('/skip-setup', authLimiter, setupCtrl.skipSetup);
router.post('/register', authLimiter, validate(UserCreateSchema), ctrl.register);
router.post('/login', authLimiter, validate(LoginSchema), ctrl.login);
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, validate(UserUpdateSchema), ctrl.updateProfile);
router.post('/change-password', auth, validate(ChangePasswordSchema), ctrl.changePassword);
router.post('/logout', auth, ctrl.logout);
router.delete('/account', auth, validate(DeleteAccountSchema), ctrl.deleteAccount);
export default router;
