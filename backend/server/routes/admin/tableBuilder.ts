import { Router } from 'express';
import {
  listTables,
  getTableById,
  createTable,
  updateTable,
  deleteOrArchiveTable,
  bindDimension,
  unbindDimension,
  reorderDimensions,
  createDimension,
  getDimensionDictionary,
  createIndicator,
  updateIndicator,
  deleteIndicator,
} from '../../controllers/admin/tableBuilderController';
import {
  listObservations,
  getObservationById,
  createObservation,
  updateObservation,
  deleteObservation,
  bulkSaveObservations,
  exportObservations,
} from '../../controllers/admin/observationController';
import { requireRole } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { Role } from '@prisma/client';
import {
  tableListQuerySchema,
  tableIdParamSchema,
  tableDimensionParamSchema,
  createTableSchema,
  updateTableSchema,
  bindDimensionSchema,
  reorderDimensionsSchema,
  createDimensionSchema,
  indicatorIdParamSchema,
  createIndicatorSchema,
  updateIndicatorSchema,
} from '../../validators/tableBuilderValidator';
import {
  observationQuerySchema,
  createObservationSchema,
  updateObservationSchema,
  bulkObservationSchema,
} from '../../validators/observationValidator';

const router = Router();

// ==============================================================================
// 1. Dimension Dictionary & Management Routes
// ==============================================================================

// Dimension dictionary catalog lookup
router.get('/dimension-dictionary', getDimensionDictionary);

// Create new dimension definition inline
router.post(
  '/dimensions',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(createDimensionSchema, 'body'),
  createDimension
);

// ==============================================================================
// 2. Indicator Management Routes
// ==============================================================================

// Update existing indicator
router.put(
  '/indicators/:indicatorId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(indicatorIdParamSchema, 'params'),
  validate(updateIndicatorSchema, 'body'),
  updateIndicator
);

// Delete existing unreferenced indicator
router.delete(
  '/indicators/:indicatorId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(indicatorIdParamSchema, 'params'),
  deleteIndicator
);

// ==============================================================================
// 3. Table Dimension Binding & Reorder Routes (Mounted under /tables/:id/...)
// ==============================================================================

// Reorder dimensions on a table
router.put(
  '/tables/:id/dimensions/reorder',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  validate(reorderDimensionsSchema, 'body'),
  reorderDimensions
);

// Bind dimension to a table
router.post(
  '/tables/:id/dimensions',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  validate(bindDimensionSchema, 'body'),
  bindDimension
);

// Unbind dimension from a table
router.delete(
  '/tables/:id/dimensions/:dimensionId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableDimensionParamSchema, 'params'),
  unbindDimension
);

// Create indicator under specific table
router.post(
  '/tables/:id/indicators',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  validate(createIndicatorSchema, 'body'),
  createIndicator
);

// ==============================================================================
// 4. Table Definition CRUD Routes (/tables and /tables/:id)
// ==============================================================================

// List table definitions with rich filtering & summary metadata
router.get('/tables', validate(tableListQuerySchema, 'query'), listTables);

// Get single table definition by ID or Table Code
router.get('/tables/:id', validate(tableIdParamSchema, 'params'), getTableById);

// Create custom table definition
router.post(
  '/tables',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(createTableSchema, 'body'),
  createTable
);

// Update table definition metadata
router.put(
  '/tables/:id',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  validate(updateTableSchema, 'body'),
  updateTable
);

// Delete or archive table definition
router.delete(
  '/tables/:id',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  deleteOrArchiveTable
);

// ==============================================================================
// 5. Statistical Observation Grid CRUD & Bulk Routes
// ==============================================================================

// List observations for table + dataset (scoped to datasetId query param)
router.get(
  '/tables/:tableId/observations',
  validate(observationQuerySchema, 'query'),
  listObservations
);
router.get(
  '/tables/:id/observations',
  validate(observationQuerySchema, 'query'),
  listObservations
);

// Bulk persist observations with atomic upsert & coordinate validation
router.post(
  '/tables/:tableId/observations/bulk',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(bulkObservationSchema, 'body'),
  bulkSaveObservations
);
router.post(
  '/tables/:id/observations/bulk',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(bulkObservationSchema, 'body'),
  bulkSaveObservations
);

// Create single statistical observation
router.post(
  '/tables/:tableId/observations',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(createObservationSchema, 'body'),
  createObservation
);
router.post(
  '/tables/:id/observations',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(createObservationSchema, 'body'),
  createObservation
);

// Get single observation by ID
router.get(
  '/tables/:tableId/observations/:observationId',
  getObservationById
);
router.get(
  '/tables/:id/observations/:observationId',
  getObservationById
);

// Update single observation with coordinate collision validation
router.patch(
  '/tables/:tableId/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(updateObservationSchema, 'body'),
  updateObservation
);
router.patch(
  '/tables/:id/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(updateObservationSchema, 'body'),
  updateObservation
);

// Delete single observation
router.delete(
  '/tables/:tableId/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  deleteObservation
);
router.delete(
  '/tables/:id/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  deleteObservation
);

// Direct /:id/observations alias routes
router.get('/:id/observations', validate(observationQuerySchema, 'query'), listObservations);

// ==============================================================================
// 6. Statistical Observation Grid Export (GRID-5)
//    GET /tables/:id/observations/export?datasetId=...&format=csv|xlsx
//    Must be declared before /:id/observations/:observationId to avoid
//    the literal "export" segment matching the observationId param.
// ==============================================================================

router.get('/tables/:tableId/observations/export', exportObservations);
router.get('/tables/:id/observations/export', exportObservations);
router.get('/:id/observations/export', exportObservations);

router.post(
  '/:id/observations',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(createObservationSchema, 'body'),
  createObservation
);
router.post(
  '/:id/observations/bulk',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(bulkObservationSchema, 'body'),
  bulkSaveObservations
);
router.get('/:id/observations/:observationId', getObservationById);
router.patch(
  '/:id/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  validate(updateObservationSchema, 'body'),
  updateObservation
);
router.delete(
  '/:id/observations/:observationId',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  deleteObservation
);

// ==============================================================================
// 6. Root Aliases (/api/admin/table-builder -> /tables)
// ==============================================================================

router.get('/', validate(tableListQuerySchema, 'query'), listTables);
router.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(createTableSchema, 'body'),
  createTable
);
router.get('/:id', validate(tableIdParamSchema, 'params'), getTableById);
router.put(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  validate(updateTableSchema, 'body'),
  updateTable
);
router.delete(
  '/:id',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN),
  validate(tableIdParamSchema, 'params'),
  deleteOrArchiveTable
);

export default router;
