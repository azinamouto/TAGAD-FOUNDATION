import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireRole } from '../../middleware/authMiddleware';
import { StatisticalImportController } from '../../controllers/admin/statisticalImportController';
import {
  validateDiscoverInput,
  validatePreviewOrExecuteInput,
} from '../../validators/statisticalImportValidator';

const router = Router();

// Statistical observation import is accessible to SUPER_ADMIN, ADMIN, and ENCODER (scoped)
const allowedRoles = requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER);

// Phase 1: CSV Discovery & Profiling
router.post('/discover', allowedRoles, validateDiscoverInput, StatisticalImportController.discover);

// Phase 2: Side-effect free Dry-Run Validation & Preview
router.post('/preview', allowedRoles, validatePreviewOrExecuteInput, StatisticalImportController.preview);

// Phase 3: Transactional Ingestion Execution
router.post('/execute', allowedRoles, validatePreviewOrExecuteInput, StatisticalImportController.execute);

export default router;
