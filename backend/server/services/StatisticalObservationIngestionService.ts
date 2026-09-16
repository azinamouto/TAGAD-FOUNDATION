import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { parseCsv, CsvLayout } from '../lib/csvParser';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  OfficeScopeError,
  AppError,
} from '../lib/errors';
import { ObservationService } from './ObservationService';
import { StatisticalDatasetService } from './StatisticalDatasetService';
import { TableBuilderService, ActorContext } from './TableBuilderService';
import { BarangayService } from './BarangayService';
import { AuditService } from './AuditService';
import { logger } from '../lib/logger';
import {
  IngestionMode,
  DuplicateStrategy,
  ColumnMappingConfig,
  ColumnProfile,
  DiscoveryResult,
  PreviewRow,
  PreviewResult,
  ExecuteResult,
  CandidateMappings,
} from '../types/statisticalImport.types';

const MUNICIPALITY_TOKENS = new Set([
  'talibon',
  'municipality',
  'municipal total',
  'total',
  'all barangays',
  'lgu talibon',
  'municipality of talibon',
  'municipal',
  'overall',
]);

export interface StatisticalImportExecuteParams {
  csvLayout?: CsvLayout;
  csvContent: string;
  filename?: string;
  datasetId: string;
  tableId: string;
  ingestionMode: IngestionMode;
  mapping: ColumnMappingConfig;
  duplicateStrategy: DuplicateStrategy;
  methodologyNotes?: string;
  sourceUrl?: string;
}

export interface StatisticalImportPreviewParams {
  csvLayout?: CsvLayout;
  csvContent: string;
  filename?: string;
  datasetId: string;
  tableId: string;
  ingestionMode: IngestionMode;
  mapping: ColumnMappingConfig;
  duplicateStrategy: DuplicateStrategy;
}

export interface StatisticalImportDiscoverParams {
  csvLayout?: CsvLayout;
  csvContent: string;
  filename?: string;
  tableId?: string;
  datasetId?: string;
}

export class StatisticalObservationIngestionService {
  /**
   * Profiles a CSV file, infers data types and roles, and provides candidate
   * column mappings against a statistical table schema if tableId is provided.
   */
  public static async discover(
    params: StatisticalImportDiscoverParams,
    actor?: ActorContext
  ): Promise<DiscoveryResult> {
    const filename = params.filename || 'import.csv';
    const parsed = parseCsv(params.csvContent, params.csvLayout);

    const headers = parsed.headers;
    const normalizedHeaders = headers.map((h) => this.normalizeColumnHeader(h));
    const rows = parsed.rows;
    const totalRows = rows.length;
    const totalColumns = headers.length;

    // Pre-load barangays for heuristic role matching
    const barangays = await BarangayService.getBarangays();

    // Profile each column
    const columns: ColumnProfile[] = headers.map((header, colIdx) => {
      const norm = normalizedHeaders[colIdx];
      const rawValues = rows.map((r) => (r[colIdx] !== undefined ? String(r[colIdx]).trim() : ''));
      const nonEmptyValues = rawValues.filter((v) => v !== '');
      const uniqueValues = Array.from(new Set(nonEmptyValues));
      const detectedType = this.inferColumnType(nonEmptyValues);

      let inferredRole: ColumnProfile['inferredRole'] = 'UNKNOWN';
      let confidence = 0.5;

      if (this.isLikelyPeriod(norm, nonEmptyValues)) {
        inferredRole = 'PERIOD';
        confidence = 0.9;
      } else if (this.isLikelyBarangay(norm, nonEmptyValues, barangays)) {
        inferredRole = 'BARANGAY';
        confidence = 0.9;
      } else if (this.isLikelyMeasureValue(norm, detectedType)) {
        inferredRole = 'MEASURE_VALUE';
        confidence = 0.85;
      } else if (norm.includes('indicator') || norm.includes('sukatan')) {
        inferredRole = 'INDICATOR';
        confidence = 0.85;
      }

      return {
        name: header,
        normalizedName: norm,
        detectedType,
        totalValues: rawValues.length,
        nonEmptyValues: nonEmptyValues.length,
        emptyValues: rawValues.length - nonEmptyValues.length,
        uniqueValuesCount: uniqueValues.length,
        sampleValues: uniqueValues.slice(0, 5),
        inferredRole,
        targetFieldConfidence: confidence,
      };
    });

    // Sample first 5 rows
    const sampleRows = parsed.rawRecords.slice(0, 5);

    // If tableId is supplied, compute candidate mappings
    let candidateMappings: CandidateMappings | undefined;

    if (params.tableId) {
      try {
        const table = await TableBuilderService.getTableById(params.tableId, actor);
        candidateMappings = this.computeCandidateMappings(columns, table);
      } catch (err) {
        logger.warn('STATISTICAL_IMPORT_DISCOVER_TABLE_LOOKUP_FAILED', {
          tableId: params.tableId,
          error: (err as any)?.message,
        });
      }
    }

    return {
      filename,
      totalRows,
      totalColumns,
      rawHeaders: headers,
      normalizedHeaders,
      columns,
      sampleRows,
      candidateMappings,
      csvLayout: parsed.layout,
    };
  }

  /**
   * Generates a preview of the imported observations with full validation
   * of periods, barangays, indicators, dimensions, and coordinate duplicates.
   * Strictly side-effect free.
   */
  public static async preview(
    params: StatisticalImportPreviewParams,
    actor: ActorContext
  ): Promise<PreviewResult> {
    const { dataset, table } = await this.validateContext(params.datasetId, params.tableId, actor);
    const barangays = await BarangayService.getBarangays();
    const parsed = parseCsv(params.csvContent, params.csvLayout);

    // Fetch existing observations for this table and dataset
    const existingObservations = await this.getExistingObservations(dataset.id, table.id);
    const existingCoordSet = new Set<string>();
    for (const obs of existingObservations) {
      const key = this.buildCoordinateKey(
        obs.period,
        obs.barangayId || null,
        obs.indicatorId || null,
        obs.dimensionsHash || 'EMPTY_DIMENSIONS'
      );
      existingCoordSet.add(key);
    }

    const previewRows: PreviewRow[] = [];
    const intraBatchCoordTracker = new Map<string, number>(); // coordinate -> first seen rowNumber
    let duplicateRowsWithinFile = 0;
    let existingCoordinateCollisions = 0;
    let validRows = 0;
    let invalidRows = 0;
    const blockingErrors: string[] = [];

    // Parse each row according to ingestion mode
    if (params.ingestionMode === 'RECORD_PER_ROW') {
      parsed.rawRecords.forEach((record, idx) => {
        const rowNumber = parsed.rowNumbers[idx];
        const rowErrors: string[] = [];

        // 1. Period
        const period = this.resolvePeriod(record, params.mapping.period);
        if (!period) {
          rowErrors.push('Missing reporting period.');
        }

        // 2. Barangay
        const { barangayId, barangayName, error: brgyError } = this.resolveBarangay(
          record,
          params.mapping.barangay,
          table,
          barangays
        );
        if (brgyError) {
          rowErrors.push(brgyError);
        }

        // 3. Indicator
        const { indicatorId, indicatorCode, error: indError } = this.resolveIndicator(
          record,
          params.mapping.indicator,
          table
        );
        if (indError) {
          rowErrors.push(indError);
        }

        // 4. Numeric Value
        const { numericValue, error: numError } = this.resolveNumericValue(
          record,
          params.mapping.numericValueColumn
        );
        if (numError) {
          rowErrors.push(numError);
        }

        // 5. Unit
        const unit = this.resolveUnit(record, params.mapping.unit, table, indicatorId);

        // 6. Dimensions & Hash
        const { dimensions, dimensionsHash, error: dimError } = this.resolveDimensions(
          record,
          params.mapping.dimensions,
          table
        );
        if (dimError) {
          rowErrors.push(dimError);
        }

        // Check coordinate identity & duplicates
        let status: PreviewRow['status'] = 'VALID';

        if (rowErrors.length > 0) {
          status = 'INVALID';
          invalidRows++;
        } else {
          const coordKey = this.buildCoordinateKey(
            period!,
            barangayId,
            indicatorId,
            dimensionsHash
          );

          // Check intra-batch duplication
          if (intraBatchCoordTracker.has(coordKey)) {
            duplicateRowsWithinFile++;
            status = 'DUPLICATE_IN_FILE';
            const firstSeenRow = intraBatchCoordTracker.get(coordKey);
            if (params.duplicateStrategy === 'REJECT') {
              const msg = `Duplicate coordinate within CSV file (collides with row ${firstSeenRow}).`;
              rowErrors.push(msg);
              blockingErrors.push(`Row ${rowNumber}: ${msg}`);
            }
          } else {
            intraBatchCoordTracker.set(coordKey, rowNumber);

            // Check collision with existing database observation
            if (existingCoordSet.has(coordKey)) {
              existingCoordinateCollisions++;
              status = 'COLLIDES_EXISTING';
              if (params.duplicateStrategy === 'REJECT') {
                const msg = `Coordinate collides with existing observation in dataset '${dataset.datasetCode}'.`;
                rowErrors.push(msg);
                blockingErrors.push(`Row ${rowNumber}: ${msg}`);
              }
            }
          }

          if (status === 'VALID' || ((status === 'DUPLICATE_IN_FILE' || status === 'COLLIDES_EXISTING') && params.duplicateStrategy !== 'REJECT')) {
            validRows++;
          }
        }

        previewRows.push({
          rowNumber,
          rawRecord: record,
          coordinate: {
            period: period || '',
            barangayId,
            barangayName,
            indicatorId,
            indicatorCode,
            dimensions: dimensions || {},
            dimensionsHash,
          },
          numericValue,
          unit,
          status,
          errors: rowErrors,
        });
      });
    } else {
      // MEASURE_COLUMNS mode: Each row unpivots into multiple observations
      const measureColumns = params.mapping.measureColumns || [];
      if (measureColumns.length === 0) {
        throw new ValidationError('MEASURE_COLUMNS mode requires at least one measure column mapping.');
      }

      parsed.rawRecords.forEach((record, recordIdx) => {
        const baseRowNumber = parsed.rowNumbers[recordIdx];

        // Shared dimensions/period/barangay across measure columns in this row
        const period = this.resolvePeriod(record, params.mapping.period);
        const { barangayId, barangayName, error: brgyError } = this.resolveBarangay(
          record,
          params.mapping.barangay,
          table,
          barangays
        );
        for (const mc of measureColumns) {
          const period = mc.period || this.resolvePeriod(record, params.mapping.period);
          const columnDimensions = Object.fromEntries(Object.entries(mc.dimensions || {}).map(([key, value]) => [key, { constantValue: value }]));
          const { dimensions, dimensionsHash, error: dimError } = this.resolveDimensions(
            record, { ...params.mapping.dimensions, ...columnDimensions }, table
          );
          const rowErrors: string[] = [];

          if (!period) rowErrors.push('Missing reporting period.');
          if (brgyError) rowErrors.push(brgyError);
          if (dimError) rowErrors.push(dimError);

          // Measure indicator validation
          const tableIndicator = (table.indicators || []).find(
            (i: any) => i.id === mc.indicatorId || i.indicatorCode === mc.indicatorId
          );
          if (!tableIndicator) {
            rowErrors.push(`Referenced measure column indicator '${mc.indicatorId}' is not bound to table.`);
          }

          // Numeric value from specific column
          const { numericValue, error: numericError } = this.resolveNumericValue(record, mc.columnName);
          if (numericError) rowErrors.push(numericError);

          const unit = mc.unit || tableIndicator?.unit || null;
          let status: PreviewRow['status'] = 'VALID';

          if (rowErrors.length > 0) {
            status = 'INVALID';
            invalidRows++;
          } else {
            const indId = tableIndicator?.id || mc.indicatorId;
            const coordKey = this.buildCoordinateKey(
              period!,
              barangayId,
              indId,
              dimensionsHash
            );

            if (intraBatchCoordTracker.has(coordKey)) {
              duplicateRowsWithinFile++;
              status = 'DUPLICATE_IN_FILE';
              const firstSeenRow = intraBatchCoordTracker.get(coordKey);
              if (params.duplicateStrategy === 'REJECT') {
                const msg = `Duplicate coordinate within CSV file for indicator '${mc.columnName}' (collides with row ${firstSeenRow}).`;
                rowErrors.push(msg);
                blockingErrors.push(`Row ${baseRowNumber} [${mc.columnName}]: ${msg}`);
              }
            } else {
              intraBatchCoordTracker.set(coordKey, baseRowNumber);

              if (existingCoordSet.has(coordKey)) {
                existingCoordinateCollisions++;
                status = 'COLLIDES_EXISTING';
                if (params.duplicateStrategy === 'REJECT') {
                  const msg = `Coordinate collides with existing observation for indicator '${mc.columnName}' in dataset '${dataset.datasetCode}'.`;
                  rowErrors.push(msg);
                  blockingErrors.push(`Row ${baseRowNumber} [${mc.columnName}]: ${msg}`);
                }
              }
            }

            if (status === 'VALID' || ((status === 'DUPLICATE_IN_FILE' || status === 'COLLIDES_EXISTING') && params.duplicateStrategy !== 'REJECT')) {
              validRows++;
            }
          }

          previewRows.push({
            rowNumber: baseRowNumber,
            rawRecord: record,
            coordinate: {
              period: period || '',
              barangayId,
              barangayName,
              indicatorId: tableIndicator?.id || mc.indicatorId,
              indicatorCode: tableIndicator?.indicatorCode || null,
              dimensions: dimensions || {},
              dimensionsHash,
            },
            numericValue,
            unit,
            status,
            errors: rowErrors,
          });
        }
      });
    }

    const isValid = blockingErrors.length === 0 && invalidRows === 0;

    return {
      valid: isValid,
      totalRows: previewRows.length,
      validRows,
      invalidRows,
      duplicateRowsWithinFile,
      existingCoordinateCollisions,
      blockingErrors,
      rows: previewRows,
      dataset: {
        id: dataset.id,
        datasetCode: dataset.datasetCode,
        name: dataset.name,
        publicationStatus: dataset.publicationStatus,
        officeId: dataset.officeId,
      },
      table: {
        id: table.id,
        tableCode: table.tableCode,
        title: table.title,
        geographicLevel: table.geographicLevel,
        rowGrain: table.rowGrain,
      },
    };
  }

  /**
   * Executes the statistical CSV import transactionally, creating or updating
   * observations, recording provenance, generating audit logs, and returning execution counts.
   */
  public static async execute(
    params: StatisticalImportExecuteParams,
    actor: ActorContext,
    req?: Request
  ): Promise<ExecuteResult> {
    const startTime = Date.now();

    // 1. Run preview logic to validate input and coordinates
    const preview = await this.preview(
      {
        csvContent: params.csvContent,
        csvLayout: params.csvLayout,
        filename: params.filename,
        datasetId: params.datasetId,
        tableId: params.tableId,
        ingestionMode: params.ingestionMode,
        mapping: params.mapping,
        duplicateStrategy: params.duplicateStrategy,
      },
      actor
    );

    if (preview.blockingErrors.length > 0) {
      throw new ConflictError(
        `Import execution aborted due to duplicate coordinate collisions: ${preview.blockingErrors.join('; ')}`
      );
    }

    if (preview.invalidRows > 0) {
      const sampleErrors = preview.rows
        .filter((r) => r.status === 'INVALID')
        .slice(0, 3)
        .map((r) => `Row ${r.rowNumber}: ${r.errors.join(', ')}`)
        .join('; ');
      throw new ValidationError(
        `Import execution aborted: ${preview.invalidRows} row(s) failed validation. ${sampleErrors}`
      );
    }

    const dataset = preview.dataset;
    const table = preview.table;
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ rowNumber: number; message: string }> = [];

    // Filter candidate observations and resolve duplicate strategy
    const finalObservationsToUpsert: Array<{
      period: string;
      barangayId: string | null;
      indicatorId: string | null;
      numericValue: number;
      unit: string | null;
      dimensions: Record<string, string> | null;
      dimensionsHash: string;
      isUpdate: boolean;
      existingId?: string;
    }> = [];

    const existingObs = await this.getExistingObservations(dataset.id, table.id);
    const existingMap = new Map<string, any>();
    for (const eo of existingObs) {
      const key = this.buildCoordinateKey(
        eo.period,
        eo.barangayId || null,
        eo.indicatorId || null,
        eo.dimensionsHash || 'EMPTY_DIMENSIONS'
      );
      existingMap.set(key, eo);
    }

    const batchCoordMap = new Map<string, number>();

    for (const pr of preview.rows) {
      const coordKey = this.buildCoordinateKey(
        pr.coordinate.period,
        pr.coordinate.barangayId,
        pr.coordinate.indicatorId,
        pr.coordinate.dimensionsHash
      );

      // Intra-batch handling
      if (batchCoordMap.has(coordKey)) {
        if (params.duplicateStrategy === 'SKIP') {
          skippedCount++;
          continue;
        } else if (params.duplicateStrategy === 'OVERWRITE') {
          // Replace earlier row in batch
          const existingIdx = finalObservationsToUpsert.findIndex(
            (item) =>
              this.buildCoordinateKey(
                item.period,
                item.barangayId,
                item.indicatorId,
                item.dimensionsHash
              ) === coordKey
          );
          if (existingIdx !== -1) {
            finalObservationsToUpsert[existingIdx] = {
              period: pr.coordinate.period,
              barangayId: pr.coordinate.barangayId,
              indicatorId: pr.coordinate.indicatorId,
              numericValue: pr.numericValue!,
              unit: pr.unit,
              dimensions: Object.keys(pr.coordinate.dimensions).length > 0 ? pr.coordinate.dimensions : null,
              dimensionsHash: pr.coordinate.dimensionsHash,
              isUpdate: finalObservationsToUpsert[existingIdx].isUpdate,
              existingId: finalObservationsToUpsert[existingIdx].existingId,
            };
            continue;
          }
        }
      }

      batchCoordMap.set(coordKey, pr.rowNumber);

      // Existing database collision handling
      const existingRecord = existingMap.get(coordKey);
      if (existingRecord) {
        if (params.duplicateStrategy === 'SKIP') {
          skippedCount++;
          continue;
        } else if (params.duplicateStrategy === 'OVERWRITE') {
          finalObservationsToUpsert.push({
            period: pr.coordinate.period,
            barangayId: pr.coordinate.barangayId,
            indicatorId: pr.coordinate.indicatorId,
            numericValue: pr.numericValue!,
            unit: pr.unit,
            dimensions: Object.keys(pr.coordinate.dimensions).length > 0 ? pr.coordinate.dimensions : null,
            dimensionsHash: pr.coordinate.dimensionsHash,
            isUpdate: true,
            existingId: existingRecord.id,
          });
          continue;
        }
      }

      // Fresh insert
      finalObservationsToUpsert.push({
        period: pr.coordinate.period,
        barangayId: pr.coordinate.barangayId,
        indicatorId: pr.coordinate.indicatorId,
        numericValue: pr.numericValue!,
        unit: pr.unit,
        dimensions: Object.keys(pr.coordinate.dimensions).length > 0 ? pr.coordinate.dimensions : null,
        dimensionsHash: pr.coordinate.dimensionsHash,
        isUpdate: false,
      });
    }

    let provenanceId: string | null = null;
    const provenanceRecordId = uuidv4();

    // 2. Execute Persistence
    if (ObservationService.isInMemoryExecution()) {
      const memoryRecords: any[] = [];
      throw new AppError(
        'Database connection required for statistical CSV ingestion. In-memory persistence is disabled.',
        503
      );

      for (const item of finalObservationsToUpsert) {
        if (item.isUpdate && item.existingId) {
          const idx = memoryRecords.findIndex((m) => m.id === item.existingId);
          if (idx !== -1) {
            memoryRecords[idx] = {
              ...memoryRecords[idx],
              numericValue: item.numericValue,
              unit: item.unit,
              dimensions: item.dimensions,
              dimensionsHash: item.dimensionsHash,
              provenanceId: provenanceRecordId,
              updatedAt: new Date(),
            };
            updatedCount++;
          }
        } else {
          const newRecord: any = {
            id: uuidv4(),
            datasetId: dataset.id,
            tableDefinitionId: table.id,
            indicatorId: item.indicatorId,
            barangayId: item.barangayId,
            period: item.period,
            numericValue: item.numericValue,
            unit: item.unit,
            dimensions: item.dimensions,
            dimensionsHash: item.dimensionsHash,
            provenanceId: provenanceRecordId,
            suppressionStatus: 'NONE',
            suppressionReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryRecords.push(newRecord);
          insertedCount++;
        }
      }

      (ObservationService as any).setInMemoryObservations(memoryRecords);
      provenanceId = provenanceRecordId;

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_CSV_IMPORT_COMPLETED',
        entityType: 'StatisticalDataset',
        entityId: dataset.id,
        afterState: {
          datasetCode: dataset.datasetCode,
          tableCode: table.tableCode,
          filename: params.filename || 'import.csv',
          duplicateStrategy: params.duplicateStrategy,
          ingestionMode: params.ingestionMode,
          totalRows: preview.totalRows,
          insertedCount,
          updatedCount,
          skippedCount,
          errorCount: errors.length,
          provenanceId,
          processingTimeMs: Date.now() - startTime,
        },
        req,
      });
    } else {
      // PostgreSQL Interactive Transaction
      await prisma.$transaction(async (tx) => {
        // Create Provenance record
        const prov = await tx.statisticalProvenance.create({
          data: {
            id: provenanceRecordId,
            sourceAgency: dataset.officeId ? (await tx.office.findUnique({ where: { id: dataset.officeId } }))?.code : 'LGU Talibon',
            sourceFileName: params.filename ? params.filename.slice(0, 255) : 'import.csv',
            datasetCode: dataset.datasetCode,
            tableCode: table.tableCode,
            reportingPeriod: preview.rows[0]?.coordinate.period || 'MULTIPLE',
            importedById: actor.id,
            methodologyNotes: params.methodologyNotes || null,
            sourceUrl: params.sourceUrl || null,
          },
        });
        provenanceId = prov.id;

        // Process chunked upserts
        for (const item of finalObservationsToUpsert) {
          if (item.isUpdate && item.existingId) {
            await tx.statisticalObservation.update({
              where: { id: item.existingId },
              data: {
                numericValue: item.numericValue,
                unit: item.unit,
                dimensions: (item.dimensions as any) || undefined,
                dimensionsHash: item.dimensionsHash,
                provenanceId,
                updatedAt: new Date(),
              },
            });
            updatedCount++;
          } else {
            await tx.statisticalObservation.create({
              data: {
                datasetId: dataset.id,
                tableDefinitionId: table.id,
                indicatorId: item.indicatorId,
                barangayId: item.barangayId,
                period: item.period,
                numericValue: item.numericValue,
                unit: item.unit,
                dimensions: (item.dimensions as any) || undefined,
                dimensionsHash: item.dimensionsHash,
                provenanceId,
              },
            });
            insertedCount++;
          }
        }

        // Audit Trail
        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'STATISTICAL_CSV_IMPORT_COMPLETED',
          entityType: 'StatisticalDataset',
          entityId: dataset.id,
          afterState: {
            datasetCode: dataset.datasetCode,
            tableCode: table.tableCode,
            filename: params.filename || 'import.csv',
            duplicateStrategy: params.duplicateStrategy,
            ingestionMode: params.ingestionMode,
            totalRows: preview.totalRows,
            insertedCount,
            updatedCount,
            skippedCount,
            errorCount: errors.length,
            provenanceId,
            processingTimeMs: Date.now() - startTime,
          },
          req,
        });
      });
    }

    const processingTimeMs = Date.now() - startTime;
    logger.info('STATISTICAL_CSV_IMPORT_SUCCESS', {
      datasetCode: dataset.datasetCode,
      tableCode: table.tableCode,
      insertedCount,
      updatedCount,
      skippedCount,
      processingTimeMs,
    });

    return {
      success: true,
      datasetId: dataset.id,
      datasetCode: dataset.datasetCode,
      tableId: table.id,
      tableCode: table.tableCode,
      totalRows: preview.totalRows,
      insertedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      duplicateStrategy: params.duplicateStrategy,
      ingestionMode: params.ingestionMode,
      provenanceId,
      auditLogId: null,
      processingTimeMs,
      errors,
    };
  }

  // ==========================================
  // Helper Resolution & Validation Methods
  // ==========================================

  private static async validateContext(datasetId: string, tableId: string, actor: ActorContext) {
    if (!datasetId) {
      throw new ValidationError('Dataset ID is required.');
    }
    if (!tableId) {
      throw new ValidationError('Table ID is required.');
    }

    if (actor.role === 'VIEWER') {
      throw new ForbiddenError('VIEWER role does not have permission to import statistical observations.');
    }

    const dataset = await ObservationService.validateDataset(datasetId, actor);
    const table = await TableBuilderService.getTableById(tableId, actor);

    if (actor.role === 'ENCODER') {
      if (dataset.officeId && actor.officeId && dataset.officeId !== actor.officeId) {
        throw new OfficeScopeError('ENCODER cannot import into a dataset belonging to another office.');
      }
    }

    return { dataset, table };
  }

  private static async getExistingObservations(datasetId: string, tableId: string): Promise<any[]> {
    if (ObservationService.isInMemoryExecution()) {
      throw new AppError(
        'Database connection required for statistical CSV preview. In-memory persistence is disabled.',
        503
      );
    }

    return await prisma.statisticalObservation.findMany({
      where: {
        datasetId,
        tableDefinitionId: tableId,
      },
      select: {
        id: true,
        period: true,
        barangayId: true,
        indicatorId: true,
        dimensionsHash: true,
      },
    });
  }

  private static resolvePeriod(
    record: Record<string, string>,
    config?: ColumnMappingConfig['period']
  ): string | null {
    if (config?.constantValue && config.constantValue.trim() !== '') {
      return config.constantValue.trim();
    }
    if (config?.sourceColumn && record[config.sourceColumn] !== undefined) {
      const val = record[config.sourceColumn].trim();
      return val !== '' ? val : null;
    }
    return null;
  }

  private static resolveBarangay(
    record: Record<string, string>,
    config?: ColumnMappingConfig['barangay'],
    table?: any,
    barangays: any[] = []
  ): { barangayId: string | null; barangayName: string | null; error?: string } {
    const isMunicipalGrain =
      table?.rowGrain === 'MUNICIPALITY' || table?.geographicLevel === 'MUNICIPALITY';

    let rawValue: string | null = null;
    if (config?.constantValue !== undefined) {
      rawValue = config.constantValue;
    } else if (config?.sourceColumn && record[config.sourceColumn] !== undefined) {
      rawValue = record[config.sourceColumn].trim();
    }

    // If municipality grain and no value is provided, it defaults to null (Municipal total)
    if (isMunicipalGrain && (!rawValue || rawValue.trim() === '')) {
      return { barangayId: null, barangayName: 'Talibon (Municipal Total)' };
    }

    if (!rawValue || rawValue.trim() === '') {
      if (isMunicipalGrain) {
        return { barangayId: null, barangayName: 'Talibon (Municipal Total)' };
      }
      return { barangayId: null, barangayName: null, error: 'Missing barangay reference in row.' };
    }

    const clean = rawValue.trim();

    // Check municipality tokens
    if (MUNICIPALITY_TOKENS.has(clean.toLowerCase())) {
      return { barangayId: null, barangayName: 'Talibon (Municipal Total)' };
    }

    // Match against official barangays
    const cleanLower = clean.toLowerCase();

    // 1. Exact code match
    const codeMatch = barangays.find((b) => b.code.toLowerCase() === cleanLower);
    if (codeMatch) {
      return { barangayId: codeMatch.id, barangayName: codeMatch.name };
    }

    // 2. Exact name match
    const nameMatch = barangays.find((b) => b.name.toLowerCase() === cleanLower);
    if (nameMatch) {
      return { barangayId: nameMatch.id, barangayName: nameMatch.name };
    }

    // 3. Normalized name match
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .replace(/^(brgy\.?|barangay)\s+/i, '')
        .replace(/\bsto\.?\b/i, 'santo')
        .replace(/[^\w\s]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    const normalizedClean = normalize(clean);
    const normMatch = barangays.find((b) => normalize(b.name) === normalizedClean);
    if (normMatch) {
      return { barangayId: normMatch.id, barangayName: normMatch.name };
    }

    return {
      barangayId: null,
      barangayName: null,
      error: `Unresolved barangay: '${clean}'. Does not match any of Talibon's 25 official barangays.`,
    };
  }

  private static resolveIndicator(
    record: Record<string, string>,
    config?: ColumnMappingConfig['indicator'],
    table?: any
  ): { indicatorId: string | null; indicatorCode: string | null; error?: string } {
    let indicatorRef: string | null = null;

    if (config?.constantIndicatorId && config.constantIndicatorId.trim() !== '') {
      indicatorRef = config.constantIndicatorId.trim();
    } else if (config?.sourceColumn && record[config.sourceColumn] !== undefined) {
      const val = record[config.sourceColumn].trim();
      indicatorRef = val !== '' ? val : null;
    }

    if (!indicatorRef) {
      // If table has exactly one indicator, default to it
      if (table?.indicators && table.indicators.length === 1) {
        return {
          indicatorId: table.indicators[0].id,
          indicatorCode: table.indicators[0].indicatorCode,
        };
      }
      return { indicatorId: null, indicatorCode: null };
    }

    const matched = (table?.indicators || []).find(
      (ind: any) =>
        ind.id === indicatorRef ||
        ind.indicatorCode?.toLowerCase() === indicatorRef?.toLowerCase() ||
        ind.name?.toLowerCase() === indicatorRef?.toLowerCase()
    );

    if (matched) {
      return { indicatorId: matched.id, indicatorCode: matched.indicatorCode };
    }

    return {
      indicatorId: null,
      indicatorCode: null,
      error: `Referenced indicator '${indicatorRef}' is not bound to table '${table?.tableCode || ''}'.`,
    };
  }

  private static resolveNumericValue(
    record: Record<string, string>,
    columnName?: string
  ): { numericValue: number | null; error?: string } {
    if (!columnName || record[columnName] === undefined) {
      return { numericValue: null, error: 'Missing numeric value column mapping.' };
    }

    const raw = record[columnName];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      return { numericValue: null, error: `Empty numeric value in column '${columnName}'.` };
    }

    const value = String(raw).trim();
    const numericSyntax = /^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    const parsed = Number(value.replace(/,/g, ''));

    if (!numericSyntax.test(value) || !Number.isFinite(parsed)) {
      return { numericValue: null, error: `Invalid numeric value '${raw}' in column '${columnName}'.` };
    }

    return { numericValue: parsed };
  }

  private static resolveUnit(
    record: Record<string, string>,
    config?: ColumnMappingConfig['unit'],
    table?: any,
    indicatorId?: string | null
  ): string | null {
    if (config?.constantValue && config.constantValue.trim() !== '') {
      return config.constantValue.trim();
    }
    if (config?.sourceColumn && record[config.sourceColumn] !== undefined) {
      const val = record[config.sourceColumn].trim();
      if (val !== '') return val;
    }

    if (indicatorId && table?.indicators) {
      const matched = table.indicators.find((i: any) => i.id === indicatorId);
      if (matched?.unit) return matched.unit;
    }

    return null;
  }

  private static resolveDimensions(
    record: Record<string, string>,
    config?: ColumnMappingConfig['dimensions'],
    table?: any
  ): { dimensions: Record<string, string> | null; dimensionsHash: string; error?: string } {
    const rawDimensions: Record<string, string> = {};

    if (config) {
      for (const [dimCode, dimConfig] of Object.entries(config)) {
        if (dimConfig.constantValue && dimConfig.constantValue.trim() !== '') {
          rawDimensions[dimCode] = dimConfig.constantValue.trim();
        } else if (dimConfig.sourceColumn && record[dimConfig.sourceColumn] !== undefined) {
          const val = record[dimConfig.sourceColumn].trim();
          if (val !== '') {
            rawDimensions[dimCode] = val;
          }
        }
      }
    }

    try {
      const { normalizedDimensions, dimensionsHash } = ObservationService.validateDimensions(
        table,
        rawDimensions
      );
      return { dimensions: normalizedDimensions, dimensionsHash };
    } catch (err: any) {
      return {
        dimensions: null,
        dimensionsHash: 'EMPTY_DIMENSIONS',
        error: err?.message || 'Dimension validation failed.',
      };
    }
  }

  private static buildCoordinateKey(
    period: string,
    barangayId: string | null,
    indicatorId: string | null,
    dimensionsHash: string
  ): string {
    return `${period}|${barangayId || 'MUNICIPALITY'}|${indicatorId || 'DEFAULT'}|${dimensionsHash || 'EMPTY'}`;
  }

  private static normalizeColumnHeader(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/[\s_\-]+/g, '_')
      .replace(/[^\w]/g, '');
  }

  private static inferColumnType(values: string[]): ColumnProfile['detectedType'] {
    if (values.length === 0) return 'empty';
    let integerCount = 0;
    let floatCount = 0;
    let boolCount = 0;
    let dateCount = 0;

    const boolSet = new Set(['true', 'false', 'yes', 'no', '1', '0', 'y', 'n']);

    for (const v of values) {
      const clean = v.trim();
      if (/^-?\d+$/.test(clean)) integerCount++;
      else if (/^-?\d+(\.\d+)?$/.test(clean)) floatCount++;
      else if (boolSet.has(clean.toLowerCase())) boolCount++;
      else if (!isNaN(Date.parse(clean)) && clean.length >= 4) dateCount++;
    }

    const total = values.length;
    if (integerCount / total >= 0.8) return 'integer';
    if ((integerCount + floatCount) / total >= 0.8) return 'float';
    if (boolCount / total >= 0.8) return 'boolean';
    if (dateCount / total >= 0.8) return 'date';

    return 'string';
  }

  private static isLikelyPeriod(normHeader: string, values: string[]): boolean {
    if (
      normHeader.includes('year') ||
      normHeader.includes('taon') ||
      normHeader.includes('period') ||
      normHeader.includes('panahon')
    ) {
      return true;
    }
    const yearMatchCount = values.filter((v) => /^(19|20)\d{2}$/.test(v)).length;
    return values.length > 0 && yearMatchCount / values.length >= 0.6;
  }

  private static isLikelyBarangay(normHeader: string, values: string[], barangays: any[]): boolean {
    if (normHeader.includes('barangay') || normHeader.includes('brgy')) {
      return true;
    }
    const names = new Set(barangays.map((b) => b.name.toLowerCase()));
    const codes = new Set(barangays.map((b) => b.code.toLowerCase()));
    const matchCount = values.filter(
      (v) => names.has(v.toLowerCase()) || codes.has(v.toLowerCase())
    ).length;
    return values.length > 0 && matchCount / values.length >= 0.4;
  }

  private static isLikelyMeasureValue(normHeader: string, detectedType: string): boolean {
    if (detectedType !== 'integer' && detectedType !== 'float') return false;
    return (
      normHeader.includes('value') ||
      normHeader.includes('count') ||
      normHeader.includes('total') ||
      normHeader.includes('bilang') ||
      normHeader.includes('dami') ||
      normHeader.includes('amount') ||
      normHeader.includes('number') ||
      normHeader.includes('qty')
    );
  }

  private static computeCandidateMappings(
    columns: ColumnProfile[],
    table: any
  ): CandidateMappings {
    const candidate: CandidateMappings = {};

    // Period
    const periodCol = columns.find((c) => c.inferredRole === 'PERIOD');
    if (periodCol) {
      candidate.period = { sourceColumn: periodCol.name, confidence: 0.9 };
    }

    // Barangay
    const brgyCol = columns.find((c) => c.inferredRole === 'BARANGAY');
    if (brgyCol) {
      candidate.barangay = { sourceColumn: brgyCol.name, confidence: 0.9 };
    }

    // Measure Value (Record-per-row)
    const valCol = columns.find((c) => c.inferredRole === 'MEASURE_VALUE');
    if (valCol) {
      candidate.numericValueColumn = { sourceColumn: valCol.name, confidence: 0.85 };
    }

    // Indicators as Measure Columns
    const indicators = table.indicators || [];
    const measureCandidates: CandidateMappings['measureColumns'] = [];

    for (const ind of indicators) {
      const indNorm = this.normalizeColumnHeader(ind.indicatorCode || '');
      const indNameNorm = this.normalizeColumnHeader(ind.name || '');

      const matchedCol = columns.find((c) => {
        const cn = c.normalizedName;
        return cn === indNorm || cn === indNameNorm || cn.includes(indNorm) || indNorm.includes(cn);
      });

      if (matchedCol) {
        measureCandidates.push({
          columnName: matchedCol.name,
          indicatorId: ind.id,
          indicatorCode: ind.indicatorCode,
          indicatorName: ind.name,
          confidence: 0.85,
        });
      }
    }

    if (measureCandidates.length > 0) {
      candidate.measureColumns = measureCandidates;
    }

    // Bound Dimensions
    const bindings = table.dimensionBindings || [];
    const dimCandidates: NonNullable<CandidateMappings['dimensions']> = {};

    for (const b of bindings) {
      const dimCode = b.dimension?.dimensionCode || b.dimensionCode;
      const dimName = b.dimension?.name || '';
      if (!dimCode) continue;

      const normCode = this.normalizeColumnHeader(dimCode);
      const normName = this.normalizeColumnHeader(dimName);

      const matchedCol = columns.find((c) => {
        const cn = c.normalizedName;
        return cn === normCode || cn === normName || cn.includes(normCode) || normCode.includes(cn);
      });

      if (matchedCol) {
        dimCandidates[dimCode] = {
          sourceColumn: matchedCol.name,
          dimensionCode: dimCode,
          dimensionName: dimName,
          confidence: 0.85,
        };
      }
    }

    if (Object.keys(dimCandidates).length > 0) {
      candidate.dimensions = dimCandidates;
    }

    return candidate;
  }
}
