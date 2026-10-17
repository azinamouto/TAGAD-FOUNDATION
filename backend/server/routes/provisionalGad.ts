import { Router } from 'express';
import multer from 'multer';
import { requireAuth, type AuthenticatedRequest } from '../middleware/authMiddleware';
import { sendSuccess, sendError } from '../lib/response';
import { isDatabaseConnected } from '../lib/prisma';
import { ValidationError } from '../lib/errors';
import { ProvisionalGadService, parseEntryFile, provisionalError, COLUMNS } from '../services/ProvisionalGadService';

export const provisionalGadService = new ProvisionalGadService();
const router = Router();
router.use((_req, res, next) => {
  if (!isDatabaseConnected()) return sendError(res, provisionalError(new Error('Database unavailable')));
  next();
});
router.use(requireAuth);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1024 } }).single('file');
router.get('/context', async (req: AuthenticatedRequest, res) => {
  try { sendSuccess(res, await provisionalGadService.context(req.user!.id)); }
  catch (error) { sendError(res, provisionalError(error)); }
});
router.post('/series', async (req: AuthenticatedRequest, res) => {
  try { sendSuccess(res, await provisionalGadService.createSeries(req.user!.id, req.body, req)); }
  catch (error) { sendError(res, provisionalError(error)); }
});
router.get('/template', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="gad-barangay-template.csv"');
  res.send(COLUMNS.join(',') + '\r\n');
});
router.post('/preview', (req, res, next) => upload(req, res, error => {
  if (error) return sendError(res, new ValidationError('Upload failed. Use one CSV/XLSX file up to 2 MB.'));
  next();
}), async (req: AuthenticatedRequest, res) => {
  try {
    let rows = req.body.rows, rowNumbers: number[] | undefined;
    if (req.file) {
      try { const parsed = await parseEntryFile(req.file); rows = parsed.rows; rowNumbers = parsed.rowNumbers; }
      catch (error) { return sendError(res, error instanceof ValidationError ? error : new ValidationError('Malformed CSV/XLSX file. Use the template and plain values.')); }
    }
    const result = await provisionalGadService.preview(req.user!.id, req.body.seriesId, rows, req.file ? req.file.originalname.replace(/[\\/\x00-\x1f]/g, '_').slice(0, 255) : null);
    if (rowNumbers) result.results.forEach((row, i) => { row.rowNumber = rowNumbers![i]; });
    sendSuccess(res, result);
  } catch (error) { sendError(res, provisionalError(error)); }
});
router.post('/commit', async (req: AuthenticatedRequest, res) => {
  try { sendSuccess(res, await provisionalGadService.commit(req.user!.id, req.body, req)); }
  catch (error) { sendError(res, provisionalError(error)); }
});
router.get('/statistics', async (req: AuthenticatedRequest, res) => {
  try { sendSuccess(res, await provisionalGadService.statistics(req.user!.id, String(req.query.seriesId ?? ''), String(req.query.period ?? ''))); }
  catch (error) { sendError(res, provisionalError(error)); }
});
export default router;
