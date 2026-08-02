import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../middleware/validate';
import { auth } from '../middleware/auth';
import {
  UserCreateSchema,
  LoginSchema,
  UserUpdateSchema,
  ChangePasswordSchema,
  DeleteAccountSchema,
} from '@dm/shared';
import * as ctrl from '../controllers/auth.controller';

// 认证接口限流：防止登录暴力破解与注册批量刷号（10 次/15 分钟/IP）
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: '尝试次数过多，请 15 分钟后再试' },
    timestamp: new Date().toISOString(),
  },
});

const router = Router();
router.post('/register', authLimiter, validate(UserCreateSchema), ctrl.register);
router.post('/login', authLimiter, validate(LoginSchema), ctrl.login);
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, validate(UserUpdateSchema), ctrl.updateProfile);
router.post('/change-password', auth, validate(ChangePasswordSchema), ctrl.changePassword);
router.post('/logout', auth, ctrl.logout);
router.delete('/account', auth, validate(DeleteAccountSchema), ctrl.deleteAccount);
export default router;
