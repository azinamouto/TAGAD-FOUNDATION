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
    const tableId = req.params.tableId || req.params.id;
    const { datasetId, format = 'csv' } = req.query as any;

    if (!datasetId) {
      return res.status(400).json({ success: false, message: 'datasetId query parameter is required for export.' });
    }

    // Fetch all observations without pagination
    const result = await ObservationService.listObservations(
      tableId,
      { datasetId: String(datasetId), page: 1, limit: 10000 },
      req.user
    );

    const observations = result.observations ?? [];
    const tableTitle = result.table?.title ?? tableId;
    const datasetCode = result.dataset?.datasetCode ?? datasetId;
    const safeTitle = tableTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 50);
    const filename = `${safeTitle}_${datasetCode}`;

    if (String(format).toLowerCase() === 'xlsx') {
      // â”€â”€ Excel export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'TAGAD Statistical System';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Observations');

      sheet.columns = [
        { header: 'Period', key: 'period', width: 14 },
        { header: 'Barangay', key: 'barangayName', width: 24 },
        { header: 'Indicator', key: 'indicatorCode', width: 22 },
        { header: 'Numeric Value', key: 'numericValue', width: 16 },
        { header: 'Unit', key: 'unit', width: 14 },
        { header: 'Dimensions', key: 'dimensions', width: 40 },
        { header: 'Suppression Status', key: 'suppressionStatus', width: 20 },
        { header: 'ID', key: 'id', width: 38 },
      ];

      // Header row styling
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E4F7' } };

      for (const obs of observations) {
        sheet.addRow({
          period: obs.period ?? '',
          barangayName: obs.barangay?.name ?? obs.barangayId ?? '',
          indicatorCode: obs.indicator?.indicatorCode ?? obs.indicatorId ?? '',
          numericValue: obs.numericValue ?? '',
          unit: obs.unit ?? '',
          dimensions: obs.dimensions ? JSON.stringify(obs.dimensions) : '',
          suppressionStatus: obs.suppressionStatus ?? '',
          id: obs.id ?? '',
        });
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      return res.end();
    } else {
      // â”€â”€ CSV export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const csvLines: string[] = [
        'period,barangay,indicator_code,numeric_value,unit,dimensions,suppression_status,id',
      ];

      for (const obs of observations) {
        const escape = (v: any) => {
          const s = v === null || v === undefined ? '' : String(v);
          return s.includes(',') || s.includes('"') || s.includes('\n')
            ? `"${s.replace(/"/g, '""')}"` : s;
        };

        csvLines.push([
          escape(obs.period ?? ''),
          escape(obs.barangay?.name ?? obs.barangayId ?? ''),
          escape(obs.indicator?.indicatorCode ?? obs.indicatorId ?? ''),
          escape(obs.numericValue ?? ''),
          escape(obs.unit ?? ''),
          escape(obs.dimensions ? JSON.stringify(obs.dimensions) : ''),
          escape(obs.suppressionStatus ?? ''),
          escape(obs.id ?? ''),
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.end(csvLines.join('\n'));
    }
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};
