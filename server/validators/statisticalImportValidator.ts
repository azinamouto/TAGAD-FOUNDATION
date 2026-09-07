import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../lib/errors';
import { sendError } from '../lib/response';
import { IngestionMode, DuplicateStrategy } from '../types/statisticalImport.types';

const VALID_INGESTION_MODES: IngestionMode[] = ['RECORD_PER_ROW', 'MEASURE_COLUMNS'];
const VALID_DUPLICATE_STRATEGIES: DuplicateStrategy[] = ['REJECT', 'SKIP', 'OVERWRITE'];

export function validateDiscoverInput(req: Request, res: Response, next: NextFunction) {
  let csvContent = req.body?.csvContent;

  // Support multipart uploaded file if present
  if (!csvContent && (req as any).file?.buffer) {
    csvContent = (req as any).file.buffer.toString('utf-8');
    req.body.csvContent = csvContent;
    if (!req.body.filename && (req as any).file.originalname) {
      req.body.filename = (req as any).file.originalname;
    }
  }

  if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
    return sendError(res, new ValidationError('CSV content is required and cannot be empty.'));
  }

  next();
}

export function validatePreviewOrExecuteInput(req: Request, res: Response, next: NextFunction) {
  let csvContent = req.body?.csvContent;

  if (!csvContent && (req as any).file?.buffer) {
    csvContent = (req as any).file.buffer.toString('utf-8');
    req.body.csvContent = csvContent;
    if (!req.body.filename && (req as any).file.originalname) {
      req.body.filename = (req as any).file.originalname;
    }
  }

  if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') {
    return sendError(res, new ValidationError('CSV content is required and cannot be empty.'));
  }

  const { datasetId, tableId, ingestionMode, mapping, duplicateStrategy } = req.body;

  if (!datasetId || typeof datasetId !== 'string' || datasetId.trim() === '') {
    return sendError(res, new ValidationError('datasetId is required.'));
  }

  if (!tableId || typeof tableId !== 'string' || tableId.trim() === '') {
    return sendError(res, new ValidationError('tableId is required.'));
  }

  if (!ingestionMode || !VALID_INGESTION_MODES.includes(ingestionMode)) {
    return sendError(
      res,
      new ValidationError(
        `Invalid ingestionMode '${ingestionMode}'. Must be one of: ${VALID_INGESTION_MODES.join(', ')}`
      )
    );
  }

  if (!duplicateStrategy || !VALID_DUPLICATE_STRATEGIES.includes(duplicateStrategy)) {
    return sendError(
      res,
      new ValidationError(
        `Invalid duplicateStrategy '${duplicateStrategy}'. Must be one of: ${VALID_DUPLICATE_STRATEGIES.join(', ')}`
      )
    );
  }

  if (!mapping || typeof mapping !== 'object') {
    return sendError(res, new ValidationError('mapping configuration object is required.'));
  }

  if (ingestionMode === 'RECORD_PER_ROW') {
    if (!mapping.numericValueColumn && !mapping.indicator?.constantIndicatorId) {
      // It must specify how value is mapped
      if (!mapping.numericValueColumn) {
        return sendError(res, new ValidationError("RECORD_PER_ROW mode requires 'numericValueColumn' in mapping."));
      }
    }
  } else if (ingestionMode === 'MEASURE_COLUMNS') {
    if (!Array.isArray(mapping.measureColumns) || mapping.measureColumns.length === 0) {
      return sendError(
        res,
        new ValidationError(
          "MEASURE_COLUMNS mode requires 'measureColumns' array with at least one column definition."
        )
      );
    }
    for (const mc of mapping.measureColumns) {
      if (!mc.columnName || !mc.indicatorId) {
        return sendError(
          res,
          new ValidationError(
            "Each measure column must specify both 'columnName' and 'indicatorId'."
          )
        );
      }
    }
  }

  next();
}
