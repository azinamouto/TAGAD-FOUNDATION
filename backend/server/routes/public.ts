import { getBarangayGeoData } from '../controllers/admin/barangayController';
import { Router } from 'express';
import {
  getPublicDashboard,
  getPublicDemographics,
  getPublicPrograms,
  getPublicAccomplishments,
  getPublicGADPlans,
  getPublicOffices,
  getPublicBarangays,
  submitPublicFeedback,
  getPublicDatasets,
} from '../controllers/publicController';
import { enforcePIISafety } from '../middleware/piiSanitizer';
import { validate } from '../middleware/validate';
import { feedbackRateLimiter } from '../middleware/rateLimiter';
import { publicFeedbackSchema } from '../validation/schemas';

const router = Router();

// Apply PII Sanitizer middleware to all public endpoints
router.use(enforcePIISafety);

router.get('/dashboard', getPublicDashboard);
router.get('/demographics', getPublicDemographics);
router.get('/programs', getPublicPrograms);
router.get('/accomplishments', getPublicAccomplishments);
router.get('/gad-plans', getPublicGADPlans);
router.get('/offices', getPublicOffices);
router.get('/barangays/geo', getBarangayGeoData);
router.get('/barangays', getPublicBarangays);
router.get('/datasets', getPublicDatasets);
router.post('/feedback', feedbackRateLimiter, validate(publicFeedbackSchema), submitPublicFeedback);

export default router;
