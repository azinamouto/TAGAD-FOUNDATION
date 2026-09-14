import { Router } from 'express';
import {
  getGADPlans,
  getGADPlanById,
  createGADPlan,
  updateGADPlan,
  updatePlanStatus,
  deleteGADPlan,
} from '../controllers/admin/gadPlanController';
import { requireAuth, requireRole, requireOfficeScope } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { uuidParamSchema } from '../validation/schemas';
import { Role } from '@prisma/client';
import { GADPlanService } from '../services/GADPlanService';
import { sendSuccess, sendError } from '../lib/response';

const router = Router();

router.use(requireAuth);
router.get('/', getGADPlans);
router.get('/:id', validate(uuidParamSchema, 'params'), getGADPlanById);
router.post('/', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), createGADPlan);
router.put('/:id', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), validate(uuidParamSchema, 'params'), updateGADPlan);
// Status transitions — ADMIN/SUPER_ADMIN only for arbitrary changes; ENCODER may submit via submitPlan
router.patch('/:id/status', requireRole(Role.ADMIN, Role.SUPER_ADMIN), validate(uuidParamSchema, 'params'), updatePlanStatus);
router.delete('/:id', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), validate(uuidParamSchema, 'params'), deleteGADPlan);

// Plan lifecycle routes
router.post('/:id/submit', async (req, res) => {
  try {
    const plan = await GADPlanService.submitPlan(req.params.id, (req as any).user, req.body?.remarks, req);
    sendSuccess(res, plan);
  } catch (err: any) {
    sendError(res, err);
  }
});

router.post('/:id/approve', requireRole(Role.ADMIN, Role.SUPER_ADMIN), async (req, res) => {
  try {
    const { forceApproval = false, reason } = req.body || {};
    const plan = await GADPlanService.approvePlan(req.params.id, (req as any).user, forceApproval, reason, req);
    sendSuccess(res, plan);
  } catch (err: any) {
    sendError(res, err);
  }
});

router.post('/:id/revise', requireRole(Role.ADMIN, Role.SUPER_ADMIN), async (req, res) => {
  try {
    const { remarks } = req.body || {};
    const plan = await GADPlanService.revisePlan(req.params.id, (req as any).user, remarks, req);
    sendSuccess(res, plan);
  } catch (err: any) {
    sendError(res, err);
  }
});

export default router;
