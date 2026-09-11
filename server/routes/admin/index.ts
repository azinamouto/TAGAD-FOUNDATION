import { Router } from 'express';
import { requireAuth } from '../../middleware/authMiddleware';
import { getDashboardStats } from '../../controllers/admin/dashboardController';

import beneficiaryRoutes from './beneficiaries';
import programRoutes from './programs';
import gadPlanRoutes from './gadPlans';
import accomplishmentRoutes from './accomplishments';
import userRoutes from './users';
import auditLogRoutes from './auditLogs';
import officeRoutes from './offices';
import barangayRoutes from './barangays';
import ingestionRoutes from './ingestion';
import datasetRoutes from './datasets';
import tableBuilderRoutes from './tableBuilder';
import statisticalCatalogRoutes from '../statisticalCatalog';
import statisticalImportRoutes from './statisticalImport';

const router = Router();

// All /api/admin/* endpoints strictly require authentication
router.use(requireAuth);

// Admin dashboard
router.get('/dashboard', getDashboardStats);

// Sub-resources
router.use('/beneficiaries', beneficiaryRoutes);
router.use('/programs', programRoutes);
router.use('/gad-plans', gadPlanRoutes);
router.use('/accomplishments', accomplishmentRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/offices', officeRoutes);
router.use('/barangays', barangayRoutes);
router.use('/ingestion', ingestionRoutes);
router.use('/datasets', datasetRoutes);
router.use('/table-builder', tableBuilderRoutes);
router.use('/statistical-catalog', statisticalCatalogRoutes);
router.use('/statistical-import', statisticalImportRoutes);

export default router;
