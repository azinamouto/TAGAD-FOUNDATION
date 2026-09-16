import { Router } from 'express';
import { z } from 'zod';
import { requireRole, AuthenticatedRequest } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { FeedbackService } from '../../services/FeedbackService';
import { sendSuccess, sendError } from '../../lib/response';

const router = Router();
router.use(requireRole('ADMIN', 'SUPER_ADMIN'));
const statuses = z.enum(['NEW', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']);
const idSchema = z.object({ id: z.string().uuid() });
router.get('/', validate(z.object({ status: statuses.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }), 'query'), async (req: AuthenticatedRequest, res) => {
  try { return sendSuccess(res, await FeedbackService.list(req.user!, req.query.status as string | undefined, Number(req.query.page), Number(req.query.limit))); }
  catch (error: any) { return sendError(res, error); }
});
router.get('/:id', validate(idSchema, 'params'), async (req: AuthenticatedRequest, res) => {
  try { return sendSuccess(res, await FeedbackService.detail(req.user!, req.params.id)); }
  catch (error: any) { return sendError(res, error); }
});
router.patch('/:id', validate(idSchema, 'params'), validate(z.object({
  status: statuses, reviewNote: z.string().trim().min(3).max(2000), expectedUpdatedAt: z.string().datetime(),
}).strict()), async (req: AuthenticatedRequest, res) => {
  try { return sendSuccess(res, await FeedbackService.review(req.user!, req.params.id, req.body)); }
  catch (error: any) { return sendError(res, error); }
});
export default router;
