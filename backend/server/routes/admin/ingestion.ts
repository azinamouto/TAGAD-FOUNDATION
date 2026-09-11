import { Router } from 'express';
import { IngestionController } from '../../controllers/admin/ingestionController';
import { validate } from '../../middleware/validate';
import { csvPreviewSchema, csvExecuteSchema } from '../../validators/ingestionValidator';
import { requireRole } from '../../middleware/authMiddleware';
import { Role } from '@prisma/client';

const router = Router();

// Phase 1: CSV Schema Discovery (Read-only profiling)
router.post('/discover-schema', IngestionController.discoverSchema);

// Phase 2 Step A: CSV Dry-run validation and row-level preview
router.post('/preview', validate(csvPreviewSchema), IngestionController.previewData);

// Phase 2 Step B: Transactional CSV Ingestion execution
router.post(
	'/execute',
	requireRole(Role.ADMIN, Role.ENCODER),
	validate(csvExecuteSchema),
	IngestionController.executeIngestion
);

export default router;
