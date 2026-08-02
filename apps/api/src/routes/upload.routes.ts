import { Router } from 'express';
import { auth } from '../middleware/auth';
import * as ctrl from '../controllers/upload.controller';

const router = Router();
router.use(auth);
router.get('/', ctrl.list);
router.delete('/:id', ctrl.remove);
export default router;
