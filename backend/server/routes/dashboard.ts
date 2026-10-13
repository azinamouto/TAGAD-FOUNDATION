import { Router, Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { sendSuccess, sendError } from '../lib/response';
import { requireAuth, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

// Legacy dashboard route returns public aggregates or full dashboard
router.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const stats: any = await DashboardService.getAdminDashboardStats(year, req.user);
    const enriched = {
      ...stats,
      ...(stats?.summary || {}),
    };
    return res.json(enriched);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
    const stats: any = await DashboardService.getAdminDashboardStats(year, req.user);
    const enriched = {
      ...stats,
      ...(stats?.summary || {}),
    };
    return res.json(enriched);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
});

export default router;
