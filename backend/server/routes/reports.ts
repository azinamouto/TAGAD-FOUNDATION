import express from 'express';
import { getGPBExcel, getGARExcel, getBeneficiariesPDF } from '../controllers/reportController';
import { protect } from '../middleware/authMiddleware';
import { GarReportService } from '../services/GarReportService';
import { sendSuccess, sendError } from '../lib/response';

const router = express.Router();

router.use(protect);

router.get('/gpb-excel', getGPBExcel);
router.get('/gar-excel', getGARExcel);
router.get('/beneficiaries-pdf', getBeneficiariesPDF);

/**
 * GET /api/reports/gar-variance
 * Returns Quarterly GAR Variance Report.
 * Query params: year, quarter (1-4 or "ALL"), officeId, status
 */
router.get('/gar-variance', async (req, res) => {
  try {
    const report = await GarReportService.getQuarterlyGarVariance({
      year: req.query.year ? Number(req.query.year) : undefined,
      quarter: req.query.quarter as string | undefined,
      officeId: req.query.officeId as string | undefined,
      status: req.query.status as string | undefined,
    });
    sendSuccess(res, report);
  } catch (err: any) {
    // Validation errors on quarter value → 400 Bad Request
    if (err.message && err.message.includes('Invalid quarter')) {
      return res.status(400).json({ success: false, message: err.message });
    }
    sendError(res, err);
  }
});

export default router;
