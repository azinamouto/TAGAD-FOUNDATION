import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../../middleware/authMiddleware';
import { StatisticalImportController } from '../../controllers/admin/statisticalImportController';
import {
  validateDiscoverInput,
  validatePreviewOrExecuteInput,
} from '../../validators/statisticalImportValidator';

const router = Router();
const allowedRoles = requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER);

router.post('/discover', allowedRoles, validateDiscoverInput, StatisticalImportController.discover);
router.post('/preview', allowedRoles, validatePreviewOrExecuteInput, StatisticalImportController.preview);
router.post('/execute', allowedRoles, validatePreviewOrExecuteInput, StatisticalImportController.execute);

export default router;
