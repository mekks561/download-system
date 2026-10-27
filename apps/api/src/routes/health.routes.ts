import { Router } from 'express';
import * as ctrl from '../controllers/health.controller.js';

const router = Router();
router.get('/', ctrl.check);
export default router;
