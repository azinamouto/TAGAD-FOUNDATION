import { Router } from 'express';
import { getBarangays, getBarangayById, getBarangayGeoData } from '../../controllers/admin/barangayController';
import { validate } from '../../middleware/validate';
import { uuidParamSchema } from '../../validation/schemas';

const router = Router();

router.get('/', getBarangays);
router.get('/geo', getBarangayGeoData);
router.get('/:id', validate(uuidParamSchema, 'params'), getBarangayById);

export default router;
