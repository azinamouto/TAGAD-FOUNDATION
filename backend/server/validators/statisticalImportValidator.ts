import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../lib/errors';
import { sendError } from '../lib/response';
import { IngestionMode, DuplicateStrategy } from '../types/statisticalImport.types';
import { z } from 'zod';

const source = z.object({ sourceColumn: z.string().max(500).optional(), constantValue: z.string().max(500).nullable().optional() }).strict();
const mappingSchema = z.object({
  period: source.optional(), barangay: source.optional(), unit: source.optional(),
  indicator: z.object({ sourceColumn: z.string().max(500).optional(), constantIndicatorId: z.string().max(255).optional() }).strict().optional(),
  numericValueColumn: z.string().max(500).optional(),
  dimensions: z.record(z.string().max(255), source).optional(),
  measureColumns: z.array(z.object({
    columnName: z.string().min(1).max(500), indicatorId: z.string().min(1).max(255), unit: z.string().max(100).optional(),
    period: z.string().min(1).max(50).optional(), dimensions: z.record(z.string().max(255), z.string().min(1).max(500)).optional(),
  }).strict()).min(1).max(500).optional(),
}).strict();

const VALID_INGESTION_MODES: IngestionMode[] = ['RECORD_PER_ROW', 'MEASURE_COLUMNS'];
const VALID_DUPLICATE_STRATEGIES: DuplicateStrategy[] = ['REJECT', 'SKIP', 'OVERWRITE'];

export function validateDiscoverInput(req: Request, res: Response, next: NextFunction) {
  let csvContent = req.body?.csvContent;
  if (!csvContent && (req as any).file?.buffer) {
    csvContent = (req as any).file.buffer.toString('utf-8');
    req.body.csvContent = csvContent;
    if (!req.body.filename && (req as any).file.originalname) req.body.filename = (req as any).file.originalname;
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
    if (!req.body.filename && (req as any).file.originalname) req.body.filename = (req as any).file.originalname;
  }
  if (!csvContent || typeof csvContent !== 'string' || csvContent.trim() === '') return sendError(res, new ValidationError('CSV content is required and cannot be empty.'));

  const { datasetId, tableId, ingestionMode, mapping, duplicateStrategy } = req.body;
  if (!datasetId || typeof datasetId !== 'string' || datasetId.trim() === '') return sendError(res, new ValidationError('datasetId is required.'));
  if (!tableId || typeof tableId !== 'string' || tableId.trim() === '') return sendError(res, new ValidationError('tableId is required.'));
  if (!ingestionMode || !VALID_INGESTION_MODES.includes(ingestionMode)) return sendError(res, new ValidationError(`Invalid ingestionMode '${ingestionMode}'. Must be one of: ${VALID_INGESTION_MODES.join(', ')}`));
  if (!duplicateStrategy || !VALID_DUPLICATE_STRATEGIES.includes(duplicateStrategy)) return sendError(res, new ValidationError(`Invalid duplicateStrategy '${duplicateStrategy}'. Must be one of: ${VALID_DUPLICATE_STRATEGIES.join(', ')}`));
  if (!mapping || typeof mapping !== 'object') return sendError(res, new ValidationError('mapping configuration object is required.'));
  if (!mappingSchema.safeParse(mapping).success) return sendError(res, new ValidationError('Invalid mapping configuration. Column names, periods and dimension values must be strings.'));

  if (ingestionMode === 'RECORD_PER_ROW' && !mapping.numericValueColumn) {
    return sendError(res, new ValidationError("RECORD_PER_ROW mode requires 'numericValueColumn' in mapping."));
  }
  if (ingestionMode === 'MEASURE_COLUMNS') {
    if (!Array.isArray(mapping.measureColumns) || mapping.measureColumns.length === 0) return sendError(res, new ValidationError("MEASURE_COLUMNS mode requires 'measureColumns' array with at least one column definition."));
    for (const measureColumn of mapping.measureColumns) {
      if (!measureColumn.columnName || !measureColumn.indicatorId) return sendError(res, new ValidationError("Each measure column must specify both 'columnName' and 'indicatorId'."));
    }
  }
  next();
}
