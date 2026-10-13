import { Router } from 'express';
import {
  getBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  archiveBeneficiary,
} from '../controllers/admin/beneficiaryController';
import { requireAuth, requireRole, requireOfficeScope } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { uuidParamSchema, createBeneficiarySchema, updateBeneficiarySchema } from '../validation/schemas';
import { Role } from '@prisma/client';

const router = Router();

router.use(requireAuth);
router.get('/', getBeneficiaries);
router.get('/:id', validate(uuidParamSchema, 'params'), getBeneficiaryById);
router.post('/', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), validate(createBeneficiarySchema), createBeneficiary);
router.put('/:id', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), validate(uuidParamSchema, 'params'), validate(updateBeneficiarySchema), updateBeneficiary);
router.delete('/:id', requireRole(Role.ADMIN, Role.ENCODER), requireOfficeScope(), validate(uuidParamSchema, 'params'), archiveBeneficiary);

export default router;
