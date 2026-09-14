import { Response } from 'express';
import ExcelJS from 'exceljs';
import { ObservationService } from '../../services/ObservationService';
import { sendSuccess, sendError } from '../../lib/response';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { UnauthorizedError } from '../../lib/errors';

export const listObservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableId = req.params.tableId || req.params.id;
    const { datasetId, period, barangayId, indicatorId, page, limit } = req.query as any;

    const filter = {
      datasetId: String(datasetId),
      period: period ? String(period) : undefined,
      barangayId: barangayId ? String(barangayId) : undefined,
      indicatorId: indicatorId ? String(indicatorId) : undefined,
      page: page !== undefined ? Number(page) : 1,
      limit: limit !== undefined ? Number(limit) : 100,
    };

    const result = await ObservationService.listObservations(tableId, filter, req.user);
    return sendSuccess(res, result.observations, {
      table: result.table,
      dataset: result.dataset,
      pagination: result.pagination,
    });
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};

export const getObservationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tableId = req.params.tableId || req.params.id;
    const observationId = req.params.observationId;

    const observation = await ObservationService.getObservationById(tableId, observationId, req.user);
    return sendSuccess(res, observation);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 404);
  }
};

export const createObservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const tableId = req.params.tableId || req.params.id;
    const observation = await ObservationService.createObservation(tableId, req.body, req.user, req);
    return sendSuccess(res, observation, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const updateObservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const tableId = req.params.tableId || req.params.id;
    const observationId = req.params.observationId;
    const observation = await ObservationService.updateObservation(tableId, observationId, req.body, req.user, req);
    return sendSuccess(res, observation);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const deleteObservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const tableId = req.params.tableId || req.params.id;
    const observationId = req.params.observationId;
    const result = await ObservationService.deleteObservation(tableId, observationId, req.user, req);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const bulkSaveObservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const tableId = req.params.tableId || req.params.id;
    const result = await ObservationService.bulkSaveObservations(tableId, req.body, req.user, req);
    return sendSuccess(res, result.data);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};


/**
 * GRID-5: for a table+dataset as CSV or Excel.
 * GET /tables/:id/observations/export?datasetId=...&format=csv|xlsx
 *
 * Always fetches the full result set (no pagination) â€” callers should ensure
 * the dataset is reasonably sized before exporting.
 */
export const exportObservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    const tableId = req.params.tableId || req.params.id;
    const { datasetId, format = 'csv', period, barangayId, indicatorId } = req.query;
    if (typeof datasetId !== 'string' || !['csv', 'xlsx'].includes(String(format))) {
      return res.status(400).json({ message: 'datasetId and format=csv|xlsx are required' });
    }
    const filters = { datasetId, limit: 500,
      period: typeof period === 'string' ? period : undefined,
      barangayId: typeof barangayId === 'string' ? barangayId : undefined,
      indicatorId: typeof indicatorId === 'string' ? indicatorId : undefined };
    let result = await ObservationService.listObservations(tableId, { ...filters, page: 1 }, req.user);
    const filename = `${result.table.tableCode}_${result.dataset.datasetCode}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    const columns = ['period', 'barangay', 'indicator_code', 'numeric_value', 'unit', 'dimensions', 'suppression_status', 'id'];
    const values = (obs: any) => [obs.period ?? '', obs.barangay?.name ?? obs.barangayId ?? '',
      obs.indicator?.indicatorCode ?? obs.indicatorId ?? '', obs.numericValue ?? '', obs.unit ?? '',
      JSON.stringify(obs.dimensions ?? {}), obs.suppressionStatus ?? '', obs.id];
    const escape = (value: any) => {
      let text = String(value);
      if (typeof value === 'string' && /^[=+@-]/.test(text)) text = "'" + text;
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    };
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
    res.setHeader('Cache-Control', 'no-store');
    let workbook: ExcelJS.stream.xlsx.WorkbookWriter | undefined;
    let sheet: ExcelJS.Worksheet | undefined;
    if (format === 'xlsx') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
      sheet = workbook.addWorksheet('Observations');
      sheet.addRow(columns).commit();
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.write(columns.join(',') + '\r\n');
    }
    let page = 1;
    while (true) {
      if (res.destroyed) return;
      for (const obs of result.observations) {
        if (sheet) sheet.addRow(values(obs)).commit();
        else if (!res.write(values(obs).map(escape).join(',') + '\r\n')) {
          await new Promise<void>((resolve, reject) => {
            const cleanup = () => { res.off('drain', drained); res.off('close', closed); };
            const drained = () => { cleanup(); resolve(); };
            const closed = () => { cleanup(); reject(new Error('Export connection closed')); };
            res.once('drain', drained); res.once('close', closed);
          });
        }
      }
      if (page >= result.pagination.totalPages) break;
      result = await ObservationService.listObservations(tableId, { ...filters, page: ++page }, req.user);
    }
    if (workbook) { sheet!.commit(); await workbook.commit(); }
    else res.end();
  } catch (error: any) {
    if (res.headersSent) { res.destroy(error); return; }
    return sendError(res, error, error.statusCode || 500);
  }
};
