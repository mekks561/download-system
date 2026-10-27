import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as ctrl from '../controllers/upload.controller.js';

const router = Router();
router.use(auth);
router.get('/', ctrl.list);
router.delete('/:id', ctrl.remove);
export default router;
