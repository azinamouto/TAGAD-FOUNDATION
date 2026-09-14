import prisma, { isDatabaseConnected } from '../lib/prisma';
import {
  StatisticalPublicationStatus,
  Role,
} from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
  AppError,
} from '../lib/errors';
import { AuditService } from './AuditService';
import { TableBuilderService, ActorContext } from './TableBuilderService';
import { StatisticalDatasetService } from './StatisticalDatasetService';
import { BarangayService } from './BarangayService';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface ListObservationsFilter {
  datasetId: string;
  period?: string;
  barangayId?: string;
  indicatorId?: string;
  page?: number;
  limit?: number;
}

export interface CreateObservationParams {
  datasetId: string;
  period: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  numericValue: number;
  unit?: string | null;
  dimensions?: Record<string, any> | null;
  suppressionStatus?: string;
  suppressionReason?: string | null;
}

export interface UpdateObservationParams {
  period?: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  numericValue?: number;
  unit?: string | null;
  dimensions?: Record<string, any> | null;
  suppressionStatus?: string;
  suppressionReason?: string | null;
}

export interface BulkObservationItem {
  id?: string;
  period: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  numericValue: number;
  unit?: string | null;
  dimensions?: Record<string, any> | null;
  suppressionStatus?: string;
  suppressionReason?: string | null;
}

export interface BulkObservationParams {
  datasetId: string;
  observations: BulkObservationItem[];
}

export interface ObservationRecord {
  id: string;
  datasetId: string;
  tableDefinitionId: string;
  indicatorId: string | null;
  barangayId: string | null;
  period: string;
  numericValue: number;
  unit: string | null;
  dimensions: Record<string, any> | null;
  dimensionsHash: string;
  provenanceId: string | null;
  suppressionStatus: string;
  suppressionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  barangay?: any;
  indicator?: any;
}

// In-Memory observation fixture for test runner and offline sandbox mode
let MEMORY_OBSERVATIONS: ObservationRecord[] = [];

export class ObservationService {
  /**
   * Asserts production persistence isolation. In production, memory fallback is strictly forbidden.
   */
  public static assertPersistenceMode(): void {
    if (process.env.NODE_ENV === 'production' && !isDatabaseConnected()) {
      throw new AppError(
        'Database connection required in production. In-memory persistence fallback is strictly disabled.',
        500
      );
    }
  }

  /**
   * Determines whether in-memory execution is allowed (only in non-production environments when database is disconnected).
   */
  public static isInMemoryExecution(): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return !isDatabaseConnected();
  }

  /**
   * Resets in-memory observations for test isolation.
   */
  public static resetInMemoryObservations(): void {
    MEMORY_OBSERVATIONS = [];
  }

  /**
   * Authoritative Deterministic Dimension Hashing Algorithm.
   * Sorts dimension keys alphabetically, trims values, and hashes using SHA-256.
   */
  public static computeDimensionsHash(dimensions: Record<string, any> | null | undefined): string {
    if (!dimensions || typeof dimensions !== 'object' || Object.keys(dimensions).length === 0) {
      return 'EMPTY_DIMENSIONS';
    }

    const sortedKeys = Object.keys(dimensions).sort();
    const normalized: Record<string, string> = {};

    for (const key of sortedKeys) {
      const val = dimensions[key];
      if (val !== undefined && val !== null) {
        normalized[key.trim()] = String(val).trim();
      }
    }

    if (Object.keys(normalized).length === 0) {
      return 'EMPTY_DIMENSIONS';
    }

    const jsonString = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Validates submitted dimensions strictly against active TableDimensionBinding configurations.
   * Enforces:
   * 1. Schema Membership: Every submitted key MUST belong to a bound dimension.
   * 2. Required Completeness: Every required dimension binding MUST be present.
   * 3. Allowed Vocabulary: Values MUST match allowedValues if configured on the binding.
   * 4. Canonical Normalization & Hash Generation.
   */
  public static validateDimensions(
    table: any,
    dimensions: Record<string, any> | null | undefined
  ): { normalizedDimensions: Record<string, any> | null; dimensionsHash: string } {
    const bindings = table.dimensionBindings || [];
    const boundCodeMap = new Map<string, any>();

    for (const b of bindings) {
      const dimCode = b.dimension?.dimensionCode || b.dimensionCode;
      if (dimCode) {
        boundCodeMap.set(dimCode.toUpperCase(), b);
        boundCodeMap.set(dimCode, b);
      }
    }

    const inputDims = dimensions && typeof dimensions === 'object' ? dimensions : {};
    const inputKeys = Object.keys(inputDims);

    // Rule 1: Schema Membership
    for (const key of inputKeys) {
      const trimmedKey = key.trim();
      const binding = boundCodeMap.get(trimmedKey) || boundCodeMap.get(trimmedKey.toUpperCase());
      if (!binding) {
        throw new ValidationError(
          `Unknown dimension key '${key}' for table '${table.tableCode || table.id}'. Dimension is not bound to this table schema.`
        );
      }
    }

    // Rule 2: Required Dimensions
    for (const b of bindings) {
      const dimCode = b.dimension?.dimensionCode || b.dimensionCode;
      if (b.isRequired && dimCode) {
        const val = inputDims[dimCode] ?? inputDims[dimCode.toUpperCase()] ?? inputDims[dimCode.toLowerCase()];
        if (val === undefined || val === null || String(val).trim() === '') {
          throw new ValidationError(
            `Missing required dimension '${dimCode}' for table '${table.tableCode || table.id}'.`
          );
        }
      }
    }

    // Rule 3: Allowed Vocabulary / Values & Normalization
    const normalized: Record<string, string> = {};
    for (const key of inputKeys) {
      const trimmedKey = key.trim();
      const binding = boundCodeMap.get(trimmedKey) || boundCodeMap.get(trimmedKey.toUpperCase());
      const rawValue = inputDims[key];
      if (rawValue === undefined || rawValue === null) continue;

      const stringValue = String(rawValue).trim();
      const canonicalKey = binding.dimension?.dimensionCode || binding.dimensionCode || trimmedKey;

      if (binding.allowedValues) {
        let allowedList: any[] = [];
        if (Array.isArray(binding.allowedValues)) {
          allowedList = binding.allowedValues;
        } else if (typeof binding.allowedValues === 'object' && Array.isArray(binding.allowedValues.values)) {
          allowedList = binding.allowedValues.values;
        }

        if (allowedList.length > 0) {
          const matchedAllowed = allowedList.find(
            (av) => String(av).trim().toLowerCase() === stringValue.toLowerCase()
          );
          if (matchedAllowed === undefined) {
            throw new ValidationError(
              `Invalid value '${stringValue}' for dimension '${canonicalKey}'. Allowed values: [${allowedList.join(', ')}]`
            );
          }
          // Preserve canonical allowed value representation
          normalized[canonicalKey] = String(matchedAllowed);
        } else {
          normalized[canonicalKey] = stringValue;
        }
      } else {
        normalized[canonicalKey] = stringValue;
      }
    }

    const finalDimensions = Object.keys(normalized).length > 0 ? normalized : null;
    const dimensionsHash = this.computeDimensionsHash(finalDimensions);

    return {
      normalizedDimensions: finalDimensions,
      dimensionsHash,
    };
  }

  /**
   * Validates that an indicator belongs to the specified table or is a general system indicator.
   */
  public static async validateIndicator(table: any, indicatorId?: string | null): Promise<void> {
    if (!indicatorId) return;

    const indicators = table.indicators || [];
    const matched = indicators.find((ind: any) => ind.id === indicatorId || ind.indicatorCode === indicatorId);

    if (matched) return;

    // Check database if connected
    if (isDatabaseConnected()) {
      const dbInd = await prisma.statisticalIndicator.findUnique({
        where: { id: indicatorId },
      });
      if (!dbInd) {
        throw new ValidationError(`Referenced indicator '${indicatorId}' does not exist.`);
      }
      if (dbInd.tableDefinitionId && dbInd.tableDefinitionId !== table.id) {
        throw new ValidationError(
          `Indicator '${dbInd.indicatorCode}' belongs to a different table and cannot be used in table '${table.tableCode}'.`
        );
      }
      return;
    }

    throw new ValidationError(`Referenced indicator '${indicatorId}' does not belong to table '${table.tableCode}'.`);
  }

  /**
   * Validates that a barangay ID exists in reference data or is null for municipality totals.
   */
  public static async validateBarangay(barangayId?: string | null): Promise<void> {
    if (!barangayId) return;

    try {
      await BarangayService.getBarangayById(barangayId);
    } catch {
      throw new ValidationError(`Referenced barangay ID '${barangayId}' is invalid.`);
    }
  }

  /**
   * Validates dataset existence, office scoping, and mutability.
   * Observations can only be created/modified in DRAFT datasets.
   */
  public static async validateDataset(datasetId: string, actor: ActorContext): Promise<any> {
    const dataset = await StatisticalDatasetService.getDatasetById(datasetId, actor);
    if (!dataset) {
      throw new NotFoundError(`Statistical Dataset '${datasetId}'`);
    }

    if (
      dataset.publicationStatus === StatisticalPublicationStatus.OFFICIAL ||
      dataset.publicationStatus === StatisticalPublicationStatus.PUBLISHED ||
      dataset.publicationStatus === StatisticalPublicationStatus.WITHDRAWN
    ) {
      throw new ForbiddenError(
        `Dataset '${dataset.datasetCode}' is locked in ${dataset.publicationStatus} status and cannot be modified.`
      );
    }

    return dataset;
  }

  /**
   * Retrieves a paginated list of observations for a specific table + dataset.
   */
  public static async listObservations(
    tableId: string,
    filter: ListObservationsFilter,
    actor?: ActorContext
  ) {
    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);
    const dataset = await StatisticalDatasetService.getDatasetById(filter.datasetId, actor);

    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(500, Math.max(1, filter.limit || 100));

    if (!this.isInMemoryExecution()) {
      const where: any = {
        tableDefinitionId: table.id,
        datasetId: dataset.id,
      };

      if (filter.period) {
        where.period = filter.period;
      }
      if (filter.barangayId) {
        where.barangayId = filter.barangayId;
      }
      if (filter.indicatorId) {
        where.indicatorId = filter.indicatorId;
      }

      const [total, observations] = await Promise.all([
        prisma.statisticalObservation.count({ where }),
        prisma.statisticalObservation.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ period: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
          include: {
            barangay: { select: { id: true, name: true, code: true } },
            indicator: { select: { id: true, indicatorCode: true, name: true, unit: true } },
          },
        }),
      ]);

      return {
        table: {
          id: table.id,
          tableCode: table.tableCode,
          title: table.title,
        },
        dataset: {
          id: dataset.id,
          datasetCode: dataset.datasetCode,
          name: dataset.name,
          publicationStatus: dataset.publicationStatus,
        },
        observations: observations.map((o) => ({
          ...o,
          numericValue: Number(o.numericValue),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // In-Memory fallback for test and offline sandbox execution
    let filtered = MEMORY_OBSERVATIONS.filter(
      (o) => o.tableDefinitionId === table.id && o.datasetId === dataset.id
    );

    if (filter.period) {
      filtered = filtered.filter((o) => o.period === filter.period);
    }
    if (filter.barangayId) {
      filtered = filtered.filter((o) => o.barangayId === filter.barangayId);
    }
    if (filter.indicatorId) {
      filtered = filtered.filter((o) => o.indicatorId === filter.indicatorId);
    }

    // Deterministic sort
    filtered.sort((a, b) => b.period.localeCompare(a.period) || a.createdAt.getTime() - b.createdAt.getTime());

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return {
      table: {
        id: table.id,
        tableCode: table.tableCode,
        title: table.title,
      },
      dataset: {
        id: dataset.id,
        datasetCode: dataset.datasetCode,
        name: dataset.name,
        publicationStatus: dataset.publicationStatus,
      },
      observations: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single observation by ID, ensuring table ownership and scoping.
   */
  public static async getObservationById(
    tableId: string,
    observationId: string,
    actor?: ActorContext
  ) {
    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);

    if (!this.isInMemoryExecution()) {
      const obs = await prisma.statisticalObservation.findUnique({
        where: { id: observationId },
        include: {
          barangay: { select: { id: true, name: true, code: true } },
          indicator: { select: { id: true, indicatorCode: true, name: true, unit: true } },
        },
      });

      if (!obs || obs.tableDefinitionId !== table.id) {
        throw new NotFoundError(`Statistical Observation '${observationId}' in table '${table.tableCode}'`);
      }

      return {
        ...obs,
        numericValue: Number(obs.numericValue),
      };
    }

    const obs = MEMORY_OBSERVATIONS.find(
      (o) => o.id === observationId && o.tableDefinitionId === table.id
    );

    if (!obs) {
      throw new NotFoundError(`Statistical Observation '${observationId}' in table '${table.tableCode}'`);
    }

    return obs;
  }

  /**
   * Creates a single statistical observation with complete schema validation.
   */
  public static async createObservation(
    tableId: string,
    data: CreateObservationParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot create observations');
    }

    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);
    const dataset = await this.validateDataset(data.datasetId, actor);

    await this.validateIndicator(table, data.indicatorId);
    await this.validateBarangay(data.barangayId);

    const { normalizedDimensions, dimensionsHash } = this.validateDimensions(table, data.dimensions);

    const period = String(data.period || '').trim();
    if (!period) {
      throw new ValidationError('Period is mandatory and cannot be empty.');
    }

    const barangayId = data.barangayId || null;
    const indicatorId = data.indicatorId || null;
    const numericValue = Number(data.numericValue);
    const unit = data.unit?.trim() || table.expectedUnit || null;
    const suppressionStatus = data.suppressionStatus || 'NONE';
    const suppressionReason = data.suppressionReason || null;

    // In-Memory Execution (Non-production test/offline mode)
    if (this.isInMemoryExecution()) {
      // Coordinate duplicate check
      const duplicate = MEMORY_OBSERVATIONS.find(
        (o) =>
          o.datasetId === dataset.id &&
          o.tableDefinitionId === table.id &&
          o.period === period &&
          (o.barangayId || null) === barangayId &&
          (o.indicatorId || null) === indicatorId &&
          o.dimensionsHash === dimensionsHash
      );

      if (duplicate) {
        throw new ConflictError(
          `Observation with identical coordinate (period: '${period}', dimensionsHash: '${dimensionsHash}') already exists in dataset '${dataset.datasetCode}'.`
        );
      }

      const newRecord: ObservationRecord = {
        id: uuidv4(),
        datasetId: dataset.id,
        tableDefinitionId: table.id,
        indicatorId,
        barangayId,
        period,
        numericValue,
        unit,
        dimensions: normalizedDimensions,
        dimensionsHash,
        provenanceId: null,
        suppressionStatus,
        suppressionReason,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MEMORY_OBSERVATIONS.push(newRecord);

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_CREATED',
        entityType: 'StatisticalObservation',
        entityId: newRecord.id,
        beforeState: null,
        afterState: {
          datasetId: dataset.id,
          tableCode: table.tableCode,
          period,
          numericValue,
          dimensions: normalizedDimensions,
        },
        req,
      });

      return newRecord;
    }

    // PostgreSQL Transactional Execution
    return await prisma.$transaction(async (tx) => {
      // Check for duplicate coordinate
      const existing = await tx.statisticalObservation.findFirst({
        where: {
          datasetId: dataset.id,
          tableDefinitionId: table.id,
          period,
          barangayId,
          indicatorId,
          dimensionsHash,
        },
      });

      if (existing) {
        throw new ConflictError(
          `Observation with identical coordinate (period: '${period}', dimensionsHash: '${dimensionsHash}') already exists in dataset '${dataset.datasetCode}'.`
        );
      }

      const created = await tx.statisticalObservation.create({
        data: {
          datasetId: dataset.id,
          tableDefinitionId: table.id,
          period,
          barangayId,
          indicatorId,
          numericValue,
          unit,
          dimensions: normalizedDimensions as any,
          dimensionsHash,
          suppressionStatus,
          suppressionReason,
        },
        include: {
          barangay: { select: { id: true, name: true, code: true } },
          indicator: { select: { id: true, indicatorCode: true, name: true, unit: true } },
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_CREATED',
        entityType: 'StatisticalObservation',
        entityId: created.id,
        beforeState: null,
        afterState: {
          datasetId: dataset.id,
          tableCode: table.tableCode,
          period,
          numericValue: Number(created.numericValue),
          dimensions: normalizedDimensions,
        },
        req,
      });

      return {
        ...created,
        numericValue: Number(created.numericValue),
      };
    });
  }

  /**
   * Updates an existing statistical observation with coordinate collision protection and IDOR prevention.
   */
  public static async updateObservation(
    tableId: string,
    observationId: string,
    data: UpdateObservationParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot update observations');
    }

    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);
    const existing = await this.getObservationById(table.id, observationId, actor);

    // Cross-dataset IDOR protection
    if ((data as any).datasetId && (data as any).datasetId !== existing.datasetId) {
      throw new ForbiddenError('Cross-dataset observation migration is not permitted');
    }

    // Validate dataset mutability and actor scope
    const dataset = await this.validateDataset(existing.datasetId, actor);

    const targetIndicatorId = data.indicatorId !== undefined ? data.indicatorId : existing.indicatorId;
    const targetBarangayId = data.barangayId !== undefined ? data.barangayId : existing.barangayId;
    const targetPeriod = data.period !== undefined ? String(data.period).trim() : existing.period;
    if (!targetPeriod) {
      throw new ValidationError('Period cannot be empty.');
    }

    if (data.indicatorId !== undefined) {
      await this.validateIndicator(table, data.indicatorId);
    }
    if (data.barangayId !== undefined) {
      await this.validateBarangay(data.barangayId);
    }

    let normalizedDimensions: Record<string, any> | null = (existing.dimensions as Record<string, any>) || null;
    let dimensionsHash = existing.dimensionsHash;

    if (data.dimensions !== undefined) {
      const dimResult = this.validateDimensions(table, data.dimensions);
      normalizedDimensions = dimResult.normalizedDimensions;
      dimensionsHash = dimResult.dimensionsHash;
    }

    const numericValue = data.numericValue !== undefined ? Number(data.numericValue) : existing.numericValue;
    const unit = data.unit !== undefined ? data.unit : existing.unit;
    const suppressionStatus = data.suppressionStatus !== undefined ? data.suppressionStatus : existing.suppressionStatus;
    const suppressionReason = data.suppressionReason !== undefined ? data.suppressionReason : existing.suppressionReason;

    // In-Memory Execution (Non-production test/offline mode)
    if (this.isInMemoryExecution()) {
      // Check collision with another observation
      const collision = MEMORY_OBSERVATIONS.find(
        (o) =>
          o.id !== observationId &&
          o.datasetId === dataset.id &&
          o.tableDefinitionId === table.id &&
          o.period === targetPeriod &&
          (o.barangayId || null) === (targetBarangayId || null) &&
          (o.indicatorId || null) === (targetIndicatorId || null) &&
          o.dimensionsHash === dimensionsHash
      );

      if (collision) {
        throw new ConflictError(
          `Coordinate collision: another observation already exists with identical coordinate in dataset '${dataset.datasetCode}'.`
        );
      }

      const idx = MEMORY_OBSERVATIONS.findIndex((o) => o.id === observationId);
      const beforeState = { ...MEMORY_OBSERVATIONS[idx] };

      MEMORY_OBSERVATIONS[idx] = {
        ...MEMORY_OBSERVATIONS[idx],
        period: targetPeriod,
        barangayId: targetBarangayId || null,
        indicatorId: targetIndicatorId || null,
        numericValue,
        unit,
        dimensions: normalizedDimensions,
        dimensionsHash,
        suppressionStatus,
        suppressionReason,
        updatedAt: new Date(),
      };

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_UPDATED',
        entityType: 'StatisticalObservation',
        entityId: observationId,
        beforeState,
        afterState: MEMORY_OBSERVATIONS[idx],
        req,
      });

      return MEMORY_OBSERVATIONS[idx];
    }

    // PostgreSQL Transactional Execution
    return await prisma.$transaction(async (tx) => {
      // Check collision
      const collision = await tx.statisticalObservation.findFirst({
        where: {
          id: { not: observationId },
          datasetId: dataset.id,
          tableDefinitionId: table.id,
          period: targetPeriod,
          barangayId: targetBarangayId || null,
          indicatorId: targetIndicatorId || null,
          dimensionsHash,
        },
      });

      if (collision) {
        throw new ConflictError(
          `Coordinate collision: another observation already exists with identical coordinate in dataset '${dataset.datasetCode}'.`
        );
      }

      const updated = await tx.statisticalObservation.update({
        where: { id: observationId },
        data: {
          period: targetPeriod,
          barangayId: targetBarangayId || null,
          indicatorId: targetIndicatorId || null,
          numericValue,
          unit,
          dimensions: normalizedDimensions as any,
          dimensionsHash,
          suppressionStatus,
          suppressionReason,
        },
        include: {
          barangay: { select: { id: true, name: true, code: true } },
          indicator: { select: { id: true, indicatorCode: true, name: true, unit: true } },
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_UPDATED',
        entityType: 'StatisticalObservation',
        entityId: observationId,
        beforeState: existing,
        afterState: {
          ...updated,
          numericValue: Number(updated.numericValue),
        },
        req,
      });

      return {
        ...updated,
        numericValue: Number(updated.numericValue),
      };
    });
  }

  /**
   * Deletes a single statistical observation after ownership and dataset validation.
   */
  public static async deleteObservation(
    tableId: string,
    observationId: string,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot delete observations');
    }

    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);
    const existing = await this.getObservationById(table.id, observationId, actor);

    // Validate dataset mutability and actor office scope
    await this.validateDataset(existing.datasetId, actor);

    // In-Memory Execution (Non-production test/offline mode)
    if (this.isInMemoryExecution()) {
      const idx = MEMORY_OBSERVATIONS.findIndex((o) => o.id === observationId);
      if (idx !== -1) {
        MEMORY_OBSERVATIONS.splice(idx, 1);
      }

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_DELETED',
        entityType: 'StatisticalObservation',
        entityId: observationId,
        beforeState: existing,
        afterState: null,
        req,
      });

      return { success: true, message: 'Observation deleted successfully', id: observationId };
    }

    // PostgreSQL Transactional Execution
    return await prisma.$transaction(async (tx) => {
      await tx.statisticalObservation.delete({
        where: { id: observationId },
      });

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATION_DELETED',
        entityType: 'StatisticalObservation',
        entityId: observationId,
        beforeState: existing,
        afterState: null,
        req,
      });

      return { success: true, message: 'Observation deleted successfully', id: observationId };
    });
  }

  /**
   * Bulk persists observations with atomic validation, duplicate coordinate rejection, and structured auditing.
   */
  public static async bulkSaveObservations(
    tableId: string,
    data: BulkObservationParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot perform bulk saves');
    }

    this.assertPersistenceMode();

    const table = await TableBuilderService.getTableById(tableId, actor);
    const dataset = await this.validateDataset(data.datasetId, actor);

    if (!data.observations || data.observations.length === 0) {
      throw new ValidationError('At least one observation row is required for bulk save');
    }

    if (data.observations.length > 2000) {
      throw new ValidationError('Bulk save payload exceeds maximum allowed limit of 2,000 rows');
    }

    // Pre-validate all rows before committing anything to ensure transactional atomicity
    const validatedRows: Array<{
      id?: string;
      period: string;
      barangayId: string | null;
      indicatorId: string | null;
      numericValue: number;
      unit: string | null;
      dimensions: Record<string, any> | null;
      dimensionsHash: string;
      suppressionStatus: string;
      suppressionReason: string | null;
    }> = [];

    const seenCoordinates = new Map<string, number>();

    for (let i = 0; i < data.observations.length; i++) {
      const row = data.observations[i];
      const period = String(row.period || '').trim();
      if (!period) {
        throw new ValidationError(`Row #${i + 1}: Period is mandatory and cannot be empty.`);
      }

      await this.validateIndicator(table, row.indicatorId);
      await this.validateBarangay(row.barangayId);

      const { normalizedDimensions, dimensionsHash } = this.validateDimensions(table, row.dimensions);

      const barangayId = row.barangayId || null;
      const indicatorId = row.indicatorId || null;

      // C7: Deterministic duplicate coordinate rejection within the same bulk payload
      const coordKey = `${period}|${barangayId || 'TOTAL'}|${indicatorId || 'DEFAULT'}|${dimensionsHash}`;
      if (seenCoordinates.has(coordKey)) {
        const prevIndex = seenCoordinates.get(coordKey)!;
        throw new ConflictError(
          `Duplicate coordinate detected within bulk payload: Row #${prevIndex + 1} and Row #${i + 1} specify identical coordinate (period: '${period}', indicator: '${indicatorId || 'none'}', barangay: '${barangayId || 'none'}', dimensionsHash: '${dimensionsHash}'). Bulk operations must contain distinct coordinates.`
        );
      }
      seenCoordinates.set(coordKey, i);

      // C4: IDOR check for existing row.id if provided
      if (row.id) {
        if (this.isInMemoryExecution()) {
          const existingById = MEMORY_OBSERVATIONS.find((o) => o.id === row.id);
          if (existingById) {
            if (existingById.tableDefinitionId !== table.id) {
              throw new NotFoundError(`Observation '${row.id}' does not belong to table '${table.tableCode}'`);
            }
            if (existingById.datasetId !== dataset.id) {
              throw new NotFoundError(`Observation '${row.id}' does not belong to dataset '${dataset.datasetCode}'`);
            }
          }
        }
      }

      validatedRows.push({
        id: row.id,
        period,
        barangayId,
        indicatorId,
        numericValue: Number(row.numericValue),
        unit: row.unit?.trim() || table.expectedUnit || null,
        dimensions: normalizedDimensions,
        dimensionsHash,
        suppressionStatus: row.suppressionStatus || 'NONE',
        suppressionReason: row.suppressionReason || null,
      });
    }

    let insertedCount = 0;
    let updatedCount = 0;

    // In-Memory Execution (Non-production test/offline mode)
    if (this.isInMemoryExecution()) {
      for (const row of validatedRows) {
        let existingIdx = -1;

        if (row.id) {
          existingIdx = MEMORY_OBSERVATIONS.findIndex((o) => o.id === row.id);
        }

        if (existingIdx === -1) {
          existingIdx = MEMORY_OBSERVATIONS.findIndex(
            (o) =>
              o.datasetId === dataset.id &&
              o.tableDefinitionId === table.id &&
              o.period === row.period &&
              (o.barangayId || null) === row.barangayId &&
              (o.indicatorId || null) === row.indicatorId &&
              o.dimensionsHash === row.dimensionsHash
          );
        }

        if (existingIdx !== -1) {
          // Upsert / Update
          MEMORY_OBSERVATIONS[existingIdx] = {
            ...MEMORY_OBSERVATIONS[existingIdx],
            numericValue: row.numericValue,
            unit: row.unit,
            dimensions: row.dimensions,
            dimensionsHash: row.dimensionsHash,
            suppressionStatus: row.suppressionStatus,
            suppressionReason: row.suppressionReason,
            updatedAt: new Date(),
          };
          updatedCount++;
        } else {
          // Insert
          MEMORY_OBSERVATIONS.push({
            id: row.id || uuidv4(),
            datasetId: dataset.id,
            tableDefinitionId: table.id,
            indicatorId: row.indicatorId,
            barangayId: row.barangayId,
            period: row.period,
            numericValue: row.numericValue,
            unit: row.unit,
            dimensions: row.dimensions,
            dimensionsHash: row.dimensionsHash,
            provenanceId: null,
            suppressionStatus: row.suppressionStatus,
            suppressionReason: row.suppressionReason,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          insertedCount++;
        }
      }

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATIONS_BULK_SAVED',
        entityType: 'StatisticalObservationBatch',
        entityId: dataset.id,
        beforeState: null,
        afterState: {
          tableCode: table.tableCode,
          datasetId: dataset.id,
          totalRows: validatedRows.length,
          insertedCount,
          updatedCount,
        },
        req,
      });

      return {
        success: true,
        data: {
          totalProcessed: validatedRows.length,
          insertedCount,
          updatedCount,
          errorCount: 0,
        },
      };
    }

    // PostgreSQL Transactional Execution (Production with Prisma $transaction)
    return await prisma.$transaction(async (tx) => {
      for (const row of validatedRows) {
        let existing = null;

        if (row.id) {
          existing = await tx.statisticalObservation.findUnique({
            where: { id: row.id },
          });
          if (existing) {
            if (existing.tableDefinitionId !== table.id) {
              throw new NotFoundError(`Observation '${row.id}' does not belong to table '${table.tableCode}'`);
            }
            if (existing.datasetId !== dataset.id) {
              throw new NotFoundError(`Observation '${row.id}' does not belong to dataset '${dataset.datasetCode}'`);
            }
          }
        }

        if (!existing) {
          existing = await tx.statisticalObservation.findFirst({
            where: {
              datasetId: dataset.id,
              tableDefinitionId: table.id,
              period: row.period,
              barangayId: row.barangayId,
              indicatorId: row.indicatorId,
              dimensionsHash: row.dimensionsHash,
            },
          });
        }

        if (existing) {
          await tx.statisticalObservation.update({
            where: { id: existing.id },
            data: {
              numericValue: row.numericValue,
              unit: row.unit,
              dimensions: row.dimensions as any,
              dimensionsHash: row.dimensionsHash,
              suppressionStatus: row.suppressionStatus,
              suppressionReason: row.suppressionReason,
            },
          });
          updatedCount++;
        } else {
          await tx.statisticalObservation.create({
            data: {
              id: row.id || undefined,
              datasetId: dataset.id,
              tableDefinitionId: table.id,
              period: row.period,
              barangayId: row.barangayId,
              indicatorId: row.indicatorId,
              numericValue: row.numericValue,
              unit: row.unit,
              dimensions: row.dimensions as any,
              dimensionsHash: row.dimensionsHash,
              suppressionStatus: row.suppressionStatus,
              suppressionReason: row.suppressionReason,
            },
          });
          insertedCount++;
        }
      }

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: 'STATISTICAL_OBSERVATIONS_BULK_SAVED',
        entityType: 'StatisticalObservationBatch',
        entityId: dataset.id,
        beforeState: null,
        afterState: {
          tableCode: table.tableCode,
          datasetId: dataset.id,
          totalRows: validatedRows.length,
          insertedCount,
          updatedCount,
        },
        req,
      });

      return {
        success: true,
        data: {
          totalProcessed: validatedRows.length,
          insertedCount,
          updatedCount,
          errorCount: 0,
        },
      };
    });
  }
}
