import { Router } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { FileCreateFolderSchema, FileRenameSchema, FileMoveSchema } from '@dm/shared';
import * as ctrl from '../controllers/file.controller';

const router = Router();
router.use(auth);
router.get('/', ctrl.list);
router.get('/search', ctrl.search);
router.post('/folder', validate(FileCreateFolderSchema), ctrl.createFolder);
router.patch('/:id/rename', validate(FileRenameSchema), ctrl.rename);
router.patch('/:id/move', validate(FileMoveSchema), ctrl.move);
router.delete('/:id', ctrl.remove);
export default router;
