import { Router } from 'express';
import { validate } from '../middleware/validate';
import { UserCreateSchema, LoginSchema } from '@dm/shared';
import * as ctrl from '../controllers/auth.controller';

const router = Router();
router.post('/register', validate(UserCreateSchema), ctrl.register);
router.post('/login', validate(LoginSchema), ctrl.login);
export default router;
