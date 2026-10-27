import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ShareCreateSchema, ShareUpdateSchema } from '@dm/shared';
import * as ctrl from '../controllers/share.controller.js';

const router = Router();
router.use(auth);
router.get('/', ctrl.list);
router.post('/', validate(ShareCreateSchema), ctrl.create);
router.patch('/:id', validate(ShareUpdateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
export default router;
