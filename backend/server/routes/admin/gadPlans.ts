import { Router } from 'express';
import {
  getGADPlans,
  getGADPlanById,
  createGADPlan,
  updateGADPlan,
  updatePlanStatus,
  deleteGADPlan,
} from '../../controllers/admin/gadPlanController';
import { requireRole, requireOfficeScope } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import {
  createGADPlanSchema,
  updateGADPlanSchema,
  updatePlanStatusSchema,
  paginationQuerySchema,
  uuidParamSchema,
} from '../../validation/schemas';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', validate(paginationQuerySchema, 'query'), getGADPlans);
router.get('/:id', validate(uuidParamSchema, 'params'), getGADPlanById);
router.post(
  '/',
  requireRole(Role.ADMIN, Role.ENCODER),
  requireOfficeScope(),
  validate(createGADPlanSchema),
  createGADPlan
);
router.put(
  '/:id',
  requireRole(Role.ADMIN, Role.ENCODER),
  requireOfficeScope(),
  validate(uuidParamSchema, 'params'),
  validate(updateGADPlanSchema),
  updateGADPlan
);
router.patch(
  '/:id/status',
  requireRole(Role.ADMIN, Role.SUPER_ADMIN),
  validate(uuidParamSchema, 'params'),
  validate(updatePlanStatusSchema),
  updatePlanStatus
);
router.delete(
  '/:id',
  requireRole(Role.ADMIN, Role.ENCODER),
  requireOfficeScope(),
  validate(uuidParamSchema, 'params'),
  deleteGADPlan
);

export default router;
