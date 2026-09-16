import { Router } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { sendSuccess, sendError } from '../../lib/response';
import { StatisticalSearchService } from '../../services/StatisticalSearchService';

const router = Router();
router.get('/', validate(z.object({ q: z.string().trim().max(100).default('') }), 'query'), async (req: AuthenticatedRequest, res) => {
  try { return sendSuccess(res, await StatisticalSearchService.search(req.query.q as string, req.user!)); }
  catch (error: any) { return sendError(res, error); }
});
router.get('/tables/:id/summary', validate(z.object({ id: z.string().uuid() }), 'params'), validate(z.object({
  datasetId: z.string().uuid(), page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(50),
}), 'query'), async (req: AuthenticatedRequest, res) => {
  try { return sendSuccess(res, await StatisticalSearchService.summarize(req.params.id, req.query.datasetId as string, req.user!, Number(req.query.page), Number(req.query.limit))); }
  catch (error: any) { return sendError(res, error); }
});
export default router;
