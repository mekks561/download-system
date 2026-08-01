import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ScheduleCreateSchema } from '@dm/shared';
import * as ctrl from '../controllers/schedule.controller';

const router = Router();
router.use(auth);
router.get('/', ctrl.list);
router.post('/', validate(ScheduleCreateSchema), ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/:id/logs', ctrl.logs);
export default router;
