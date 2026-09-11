import prisma, { isDatabaseConnected } from '../lib/prisma';
import {
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  StatisticalPublicationStatus,
  Role,
} from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../lib/errors';
import { AuditService } from './AuditService';
import { STATISTICAL_69_TABLE_CATALOG } from './StatisticalCatalogService';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ActorContext {
  id: string;
  email?: string;
  fullName?: string;
  role: Role;
  officeId?: string | null;
}

export interface ListTablesFilter {
  page?: number;
  limit?: number;
  domain?: string;
  isSystemTable?: boolean;
  isArchived?: boolean;
  classification?: StatisticalTableClassification;
  verificationStatus?: StatisticalVerificationStatus;
  search?: string;
}

export interface CreateTableParams {
  tableCode?: string;
  title: string;
  domain: string;
  classification?: StatisticalTableClassification;
  description?: string | null;
  expectedUnit?: string | null;
  rowGrain?: string | null;
  dimensionsSummary?: string | null;
  measureStructure?: string | null;
  sourceFormat?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
  dimensionIds?: string[];
}

export interface UpdateTableParams {
  title?: string;
  domain?: string;
  classification?: StatisticalTableClassification;
  description?: string | null;
  expectedUnit?: string | null;
  rowGrain?: string | null;
  dimensionsSummary?: string | null;
  measureStructure?: string | null;
  sourceFormat?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
  isArchived?: boolean;
}

export interface BindDimensionParams {
  dimensionId: string;
  displayOrder?: number;
  isRequired?: boolean;
  allowedValues?: any;
}

export interface CreateDimensionParams {
  dimensionCode: string;
  name: string;
  description?: string | null;
  dataType?: string;
  vocabularySource?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}

export interface CreateIndicatorParams {
  indicatorCode: string;
  name: string;
  title: string;
  description?: string | null;
  unit?: string | null;
  classification?: StatisticalTableClassification;
  formula?: string | null;
  numeratorDefinition?: string | null;
  denominatorDefinition?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}

export interface UpdateIndicatorParams {
  name?: string;
  title?: string;
  description?: string | null;
  unit?: string | null;
  classification?: StatisticalTableClassification;
  formula?: string | null;
  numeratorDefinition?: string | null;
  denominatorDefinition?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}

// ------------------------------------------------------------------------------
// In-Memory Fallback State for Offline Testing
// ------------------------------------------------------------------------------

let inMemoryTables: any[] = STATISTICAL_69_TABLE_CATALOG.map((item, index) => ({
  id: `00000000-0000-0000-0000-${String(item.tableNumber).padStart(12, '0')}`,
  tableNumber: item.tableNumber,
  tableCode: item.tableCode,
  title: item.title,
  domain: item.domain,
  classification: item.classification,
  description: item.description,
  expectedUnit: item.expectedUnit,
  rowGrain: item.rowGrain,
  dimensionsSummary: item.dimensionsSummary,
  measureStructure: item.measureStructure,
  sourceFormat: item.sourceFormat,
  isSystemTable: true,
  isArchived: false,
  verificationStatus: item.verificationStatus,
  createdAt: new Date('2024-01-01T00:00:00.000Z'),
  updatedAt: new Date('2024-01-01T00:00:00.000Z'),
}));

let inMemoryDimensions: any[] = [
  {
    id: 'd0000000-0000-4000-8000-000000000001',
    dimensionCode: 'DIM_SEX',
    name: 'Sex Disaggregation',
    description: 'Biological sex classification (Male, Female, Both Sexes)',
    dataType: 'string',
    vocabularySource: 'PSA Standard Classification (Male, Female)',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000002',
    dimensionCode: 'DIM_AGE_GROUP',
    name: 'Age Bracket',
    description: 'Five-year and functional demographic age cohorts',
    dataType: 'string',
    vocabularySource: 'PSA standardized demographic brackets',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000003',
    dimensionCode: 'DIM_BARANGAY',
    name: 'Barangay',
    description: '25 official Talibon administrative barangays',
    dataType: 'string(UUID)',
    vocabularySource: 'LGU Talibon Official Registry',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000004',
    dimensionCode: 'DIM_TENURE_STATUS',
    name: 'Tenure Status',
    description: 'Housing and land tenure classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section B codebook',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000005',
    dimensionCode: 'DIM_WATER_SOURCE',
    name: 'Water Supply Source',
    description: 'Primary drinking and general domestic water source classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
  {
    id: 'd0000000-0000-4000-8000-000000000006',
    dimensionCode: 'DIM_TOILET_FACILITY',
    name: 'Sanitation / Toilet Type',
    description: 'Sanitary toilet and sanitation service classification',
    dataType: 'string',
    vocabularySource: 'DOH / CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
  },
];

let inMemoryDimensionBindings: any[] = [];
let inMemoryIndicators: any[] = [];

// ------------------------------------------------------------------------------
// TableBuilderService Implementation
// ------------------------------------------------------------------------------

export class TableBuilderService {
  /**
   * Resets in-memory state for isolated test runs.
   */
  public static resetInMemoryState(): void {
    inMemoryTables = STATISTICAL_69_TABLE_CATALOG.map((item) => ({
      id: `00000000-0000-0000-0000-${String(item.tableNumber).padStart(12, '0')}`,
      tableNumber: item.tableNumber,
      tableCode: item.tableCode,
      title: item.title,
      domain: item.domain,
      classification: item.classification,
      description: item.description,
      expectedUnit: item.expectedUnit,
      rowGrain: item.rowGrain,
      dimensionsSummary: item.dimensionsSummary,
      measureStructure: item.measureStructure,
      sourceFormat: item.sourceFormat,
      isSystemTable: true,
      isArchived: false,
      verificationStatus: item.verificationStatus,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    }));
    inMemoryDimensionBindings = [];
    inMemoryIndicators = [];
  }

  /**
   * Lists tables with search, filtering, and summary counts.
   */
  public static async listTables(
    filter: ListTablesFilter = {},
    actor?: ActorContext
  ) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.max(1, Math.min(100, filter.limit || 20));
    const skip = (page - 1) * limit;

    if (isDatabaseConnected()) {
      const where: any = {};

      if (filter.domain) {
        where.domain = { contains: filter.domain, mode: 'insensitive' };
      }
      if (filter.isSystemTable !== undefined) {
        where.isSystemTable = filter.isSystemTable;
      }
      if (filter.isArchived !== undefined) {
        where.isArchived = filter.isArchived;
      }
      if (filter.classification) {
        where.classification = filter.classification;
      }
      if (filter.verificationStatus) {
        where.verificationStatus = filter.verificationStatus;
      }
      if (filter.search) {
        const search = filter.search.trim();
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { tableCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
          { expectedUnit: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [total, items] = await Promise.all([
        prisma.statisticalTableDefinition.count({ where }),
        prisma.statisticalTableDefinition.findMany({
          where,
          skip,
          take: limit,
          orderBy: { tableNumber: 'asc' },
          include: {
            dimensionBindings: {
              include: {
                dimension: true,
              },
              orderBy: { displayOrder: 'asc' },
            },
            indicators: true,
          },
        }),
      ]);

      const formatted = items.map((t) => ({
        id: t.id,
        tableNumber: t.tableNumber,
        tableCode: t.tableCode,
        title: t.title,
        domain: t.domain,
        classification: t.classification,
        description: t.description,
        expectedUnit: t.expectedUnit,
        rowGrain: t.rowGrain,
        dimensionsSummary: t.dimensionsSummary,
        measureStructure: t.measureStructure,
        sourceFormat: t.sourceFormat,
        isSystemTable: t.isSystemTable,
        isArchived: t.isArchived,
        verificationStatus: t.verificationStatus,
        hasRealData: t.verificationStatus === StatisticalVerificationStatus.VERIFIED,
        dataStatus: t.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
        dimensionCount: t.dimensionBindings.length,
        indicatorCount: t.indicators.length,
        dimensionBindings: t.dimensionBindings,
        indicators: t.indicators,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      return {
        tables: formatted,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // In-memory filter logic
    let filtered = [...inMemoryTables];

    if (filter.domain) {
      const d = filter.domain.toLowerCase();
      filtered = filtered.filter((t) => t.domain.toLowerCase().includes(d));
    }
    if (filter.isSystemTable !== undefined) {
      filtered = filtered.filter((t) => t.isSystemTable === filter.isSystemTable);
    }
    if (filter.isArchived !== undefined) {
      filtered = filtered.filter((t) => t.isArchived === filter.isArchived);
    }
    if (filter.classification) {
      filtered = filtered.filter((t) => t.classification === filter.classification);
    }
    if (filter.verificationStatus) {
      filtered = filtered.filter((t) => t.verificationStatus === filter.verificationStatus);
    }
    if (filter.search) {
      const term = filter.search.toLowerCase().trim();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.tableCode.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          t.domain.toLowerCase().includes(term) ||
          (t.expectedUnit && t.expectedUnit.toLowerCase().includes(term))
      );
    }

    const total = filtered.length;
    const items = filtered.slice(skip, skip + limit).map((t) => {
      const boundDims = inMemoryDimensionBindings
        .filter((b) => b.tableDefinitionId === t.id)
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map((b) => ({
          ...b,
          dimension: inMemoryDimensions.find((d) => d.id === b.dimensionId) || null,
        }));
      const indicators = inMemoryIndicators.filter((i) => i.tableDefinitionId === t.id);

      return {
        ...t,
        hasRealData: t.verificationStatus === StatisticalVerificationStatus.VERIFIED,
        dataStatus: t.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
        dimensionCount: boundDims.length,
        indicatorCount: indicators.length,
        dimensionBindings: boundDims,
        indicators,
      };
    });

    return {
      tables: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single table definition with bound dimensions and indicators.
   */
  public static async getTableById(id: string, actor?: ActorContext) {
    if (isDatabaseConnected()) {
      // Polymorphic search: by id (UUID), tableCode, or tableNumber if integer
      const isNum = /^\d+$/.test(id);
      const whereClause = isNum
        ? { tableNumber: parseInt(id, 10) }
        : id.includes('-') && id.length === 36
        ? { id }
        : { tableCode: id.toUpperCase() };

      const table = await prisma.statisticalTableDefinition.findFirst({
        where: whereClause,
        include: {
          dimensionBindings: {
            include: {
              dimension: true,
            },
            orderBy: { displayOrder: 'asc' },
          },
          indicators: {
            orderBy: { indicatorCode: 'asc' },
          },
        },
      });

      if (!table) {
        throw new NotFoundError(`Statistical Table '${id}'`);
      }

      return {
        ...table,
        hasRealData: table.verificationStatus === StatisticalVerificationStatus.VERIFIED,
        dataStatus: table.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
      };
    }

    const isNum = /^\d+$/.test(id);
    const table = inMemoryTables.find((t) =>
      isNum
        ? t.tableNumber === parseInt(id, 10)
        : t.id === id || t.tableCode.toUpperCase() === id.toUpperCase()
    );

    if (!table) {
      throw new NotFoundError(`Statistical Table '${id}'`);
    }

    const boundDims = inMemoryDimensionBindings
      .filter((b) => b.tableDefinitionId === table.id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((b) => ({
        ...b,
        dimension: inMemoryDimensions.find((d) => d.id === b.dimensionId) || null,
      }));
    const indicators = inMemoryIndicators
      .filter((i) => i.tableDefinitionId === table.id)
      .sort((a, b) => a.indicatorCode.localeCompare(b.indicatorCode));

    return {
      ...table,
      hasRealData: table.verificationStatus === StatisticalVerificationStatus.VERIFIED,
      dataStatus: table.verificationStatus === StatisticalVerificationStatus.VERIFIED ? 'REAL DATA' : 'UNVERIFIED',
      dimensionBindings: boundDims,
      indicators,
    };
  }

  /**
   * Creates a custom table definition with optional initial dimensions.
   */
  public static async createTable(
    params: CreateTableParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may create table definitions');
    }

    const title = params.title.trim();
    const domain = params.domain.trim();
    if (!title) throw new ValidationError('Table title is required');
    if (!domain) throw new ValidationError('Domain is required');

    // Auto-generate or validate custom table code
    let tableCode = params.tableCode ? params.tableCode.trim().toUpperCase() : '';
    let tableNumber = 100;

    if (isDatabaseConnected()) {
      const highestTable = await prisma.statisticalTableDefinition.findFirst({
        orderBy: { tableNumber: 'desc' },
      });
      if (highestTable && highestTable.tableNumber >= 100) {
        tableNumber = highestTable.tableNumber + 1;
      } else if (highestTable && highestTable.tableNumber < 100) {
        tableNumber = 100;
      }

      if (!tableCode) {
        const customCount = await prisma.statisticalTableDefinition.count({
          where: { isSystemTable: false },
        });
        tableCode = `STAT-CUST-${String(customCount + 1).padStart(2, '0')}`;
      }

      const existingCode = await prisma.statisticalTableDefinition.findFirst({
        where: {
          OR: [{ tableCode }, { tableNumber }],
        },
      });

      if (existingCode) {
        if (existingCode.tableCode === tableCode) {
          throw new ConflictError(`Table code '${tableCode}' is already registered`);
        }
        if (existingCode.tableNumber === tableNumber) {
          tableNumber = existingCode.tableNumber + 1;
        }
      }

      // Execute transaction for table and dimension bindings
      const newTable = await prisma.$transaction(async (tx) => {
        const created = await tx.statisticalTableDefinition.create({
          data: {
            tableNumber,
            tableCode,
            title,
            domain,
            classification: params.classification || StatisticalTableClassification.AGGREGATED_STATISTICS,
            description: params.description || null,
            expectedUnit: params.expectedUnit || null,
            rowGrain: params.rowGrain || 'BARANGAY',
            dimensionsSummary: params.dimensionsSummary || null,
            measureStructure: params.measureStructure || null,
            sourceFormat: params.sourceFormat || null,
            isSystemTable: false,
            isArchived: false,
            verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
          },
        });

        if (params.dimensionIds && Array.isArray(params.dimensionIds) && params.dimensionIds.length > 0) {
          for (let i = 0; i < params.dimensionIds.length; i++) {
            const dimId = params.dimensionIds[i];
            const dim = await tx.statisticalDimension.findUnique({ where: { id: dimId } });
            if (dim) {
              await tx.tableDimensionBinding.create({
                data: {
                  tableDefinitionId: created.id,
                  dimensionId: dimId,
                  displayOrder: i,
                  isRequired: true,
                },
              });
            }
          }
        }

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DEFINITION_CREATED',
          entityType: 'StatisticalTableDefinition',
          entityId: created.id,
          afterState: created,
          req,
        });

        return created;
      });

      return await this.getTableById(newTable.id, actor);
    }

    // In-memory transaction simulation
    const highestNum = inMemoryTables.reduce((max, t) => (t.tableNumber > max ? t.tableNumber : max), 0);
    tableNumber = highestNum >= 100 ? highestNum + 1 : 100;

    if (!tableCode) {
      const customCount = inMemoryTables.filter((t) => !t.isSystemTable).length;
      tableCode = `STAT-CUST-${String(customCount + 1).padStart(2, '0')}`;
    }

    if (inMemoryTables.some((t) => t.tableCode.toUpperCase() === tableCode.toUpperCase())) {
      throw new ConflictError(`Table code '${tableCode}' is already registered`);
    }

    const createdTable = {
      id: uuidv4(),
      tableNumber,
      tableCode,
      title,
      domain,
      classification: params.classification || StatisticalTableClassification.AGGREGATED_STATISTICS,
      description: params.description || null,
      expectedUnit: params.expectedUnit || null,
      rowGrain: params.rowGrain || 'BARANGAY',
      dimensionsSummary: params.dimensionsSummary || null,
      measureStructure: params.measureStructure || null,
      sourceFormat: params.sourceFormat || null,
      isSystemTable: false,
      isArchived: false,
      verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryTables.push(createdTable);

    if (params.dimensionIds && Array.isArray(params.dimensionIds)) {
      params.dimensionIds.forEach((dimId, idx) => {
        if (inMemoryDimensions.some((d) => d.id === dimId)) {
          inMemoryDimensionBindings.push({
            id: uuidv4(),
            tableDefinitionId: createdTable.id,
            dimensionId: dimId,
            displayOrder: idx,
            isRequired: true,
            allowedValues: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      });
    }

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DEFINITION_CREATED',
      entityType: 'StatisticalTableDefinition',
      entityId: createdTable.id,
      afterState: createdTable,
      req,
    });

    return await this.getTableById(createdTable.id, actor);
  }

  /**
   * Updates an existing table definition with strict system-table protection.
   */
  public static async updateTable(
    id: string,
    params: UpdateTableParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may update table definitions');
    }

    const table = await this.getTableById(id, actor);
    if (!table) {
      throw new NotFoundError(`Statistical Table '${id}'`);
    }

    // Protect system table identity: tableNumber and tableCode can never be changed
    const updateData: any = {};
    if (params.title !== undefined) updateData.title = params.title.trim();
    if (params.domain !== undefined) updateData.domain = params.domain.trim();
    if (params.classification !== undefined) updateData.classification = params.classification;
    if (params.description !== undefined) updateData.description = params.description;
    if (params.expectedUnit !== undefined) updateData.expectedUnit = params.expectedUnit;
    if (params.rowGrain !== undefined) updateData.rowGrain = params.rowGrain;
    if (params.dimensionsSummary !== undefined) updateData.dimensionsSummary = params.dimensionsSummary;
    if (params.measureStructure !== undefined) updateData.measureStructure = params.measureStructure;
    if (params.sourceFormat !== undefined) updateData.sourceFormat = params.sourceFormat;
    if (params.verificationStatus !== undefined) updateData.verificationStatus = params.verificationStatus;
    if (params.isArchived !== undefined) updateData.isArchived = params.isArchived;

    if (isDatabaseConnected()) {
      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.statisticalTableDefinition.update({
          where: { id: table.id },
          data: updateData,
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DEFINITION_UPDATED',
          entityType: 'StatisticalTableDefinition',
          entityId: table.id,
          beforeState: table,
          afterState: res,
          req,
        });

        return res;
      });

      return await this.getTableById(updated.id, actor);
    }

    // In-memory update
    const targetIdx = inMemoryTables.findIndex((t) => t.id === table.id);
    if (targetIdx === -1) throw new NotFoundError(`Statistical Table '${id}'`);

    const before = { ...inMemoryTables[targetIdx] };
    const after = {
      ...before,
      ...updateData,
      updatedAt: new Date(),
    };
    inMemoryTables[targetIdx] = after;

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DEFINITION_UPDATED',
      entityType: 'StatisticalTableDefinition',
      entityId: table.id,
      beforeState: before,
      afterState: after,
      req,
    });

    return await this.getTableById(table.id, actor);
  }

  /**
   * Archives or deletes a table definition based on governance policies.
   */
  public static async deleteOrArchiveTable(
    id: string,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may delete or archive tables');
    }

    const table = await this.getTableById(id, actor);
    if (!table) {
      throw new NotFoundError(`Statistical Table '${id}'`);
    }

    // System tables cannot be deleted
    if (table.isSystemTable) {
      throw new ForbiddenError('System tables (STAT-TAB-01 to STAT-TAB-69) cannot be deleted.');
    }

    if (isDatabaseConnected()) {
      // Check if referenced by statistical observations
      const observationCount = await prisma.statisticalObservation.count({
        where: { tableDefinitionId: table.id },
      });

      if (observationCount > 0) {
        // Table contains data -> Archive instead of hard delete
        const archived = await prisma.$transaction(async (tx) => {
          const res = await tx.statisticalTableDefinition.update({
            where: { id: table.id },
            data: { isArchived: true },
          });

          await AuditService.logActionTx(tx, {
            userId: actor.id,
            action: 'TABLE_DEFINITION_ARCHIVED',
            entityType: 'StatisticalTableDefinition',
            entityId: table.id,
            beforeState: table,
            afterState: res,
            req,
          });

          return res;
        });

        return {
          archived: true,
          deleted: false,
          message: `Table contains ${observationCount} statistical observations and has been archived instead of deleted.`,
          table: archived,
        };
      }

      // Unreferenced custom table -> Hard delete transaction
      await prisma.$transaction(async (tx) => {
        // Clean up dimension bindings
        await tx.tableDimensionBinding.deleteMany({
          where: { tableDefinitionId: table.id },
        });

        // Clean up indicators associated with this table
        await tx.statisticalIndicator.deleteMany({
          where: { tableDefinitionId: table.id },
        });

        // Delete table definition
        await tx.statisticalTableDefinition.delete({
          where: { id: table.id },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DEFINITION_DELETED',
          entityType: 'StatisticalTableDefinition',
          entityId: table.id,
          beforeState: table,
          req,
        });
      });

      return {
        archived: false,
        deleted: true,
        message: `Custom table '${table.tableCode}' was successfully deleted.`,
      };
    }

    // In-memory simulation
    const tableIndex = inMemoryTables.findIndex((t) => t.id === table.id);
    if (tableIndex === -1) throw new NotFoundError(`Statistical Table '${id}'`);

    // Remove bindings & indicators
    inMemoryDimensionBindings = inMemoryDimensionBindings.filter((b) => b.tableDefinitionId !== table.id);
    inMemoryIndicators = inMemoryIndicators.filter((i) => i.tableDefinitionId !== table.id);
    inMemoryTables.splice(tableIndex, 1);

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DEFINITION_DELETED',
      entityType: 'StatisticalTableDefinition',
      entityId: table.id,
      beforeState: table,
      req,
    });

    return {
      archived: false,
      deleted: true,
      message: `Custom table '${table.tableCode}' was successfully deleted.`,
    };
  }

  /**
   * Binds a dimension to a table definition.
   */
  public static async bindDimension(
    tableId: string,
    params: BindDimensionParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may bind dimensions');
    }

    const table = await this.getTableById(tableId, actor);
    if (!table) throw new NotFoundError(`Statistical Table '${tableId}'`);

    const dimension = await this.getDimensionById(params.dimensionId);
    if (!dimension) throw new NotFoundError(`Statistical Dimension '${params.dimensionId}'`);

    if (isDatabaseConnected()) {
      const existing = await prisma.tableDimensionBinding.findUnique({
        where: {
          tableDefinitionId_dimensionId: {
            tableDefinitionId: table.id,
            dimensionId: dimension.id,
          },
        },
      });

      if (existing) {
        throw new ConflictError(`Dimension '${dimension.dimensionCode}' is already bound to this table.`);
      }

      let displayOrder = params.displayOrder;
      if (displayOrder === undefined) {
        const lastBinding = await prisma.tableDimensionBinding.findFirst({
          where: { tableDefinitionId: table.id },
          orderBy: { displayOrder: 'desc' },
        });
        displayOrder = lastBinding ? lastBinding.displayOrder + 1 : 0;
      }

      const binding = await prisma.$transaction(async (tx) => {
        const created = await tx.tableDimensionBinding.create({
          data: {
            tableDefinitionId: table.id,
            dimensionId: dimension.id,
            displayOrder,
            isRequired: params.isRequired !== undefined ? params.isRequired : true,
            allowedValues: params.allowedValues || null,
          },
          include: {
            dimension: true,
          },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DIMENSION_BOUND',
          entityType: 'TableDimensionBinding',
          entityId: created.id,
          afterState: created,
          req,
        });

        return created;
      });

      return binding;
    }

    // In-memory binding
    const existing = inMemoryDimensionBindings.find(
      (b) => b.tableDefinitionId === table.id && b.dimensionId === dimension.id
    );
    if (existing) {
      throw new ConflictError(`Dimension '${dimension.dimensionCode}' is already bound to this table.`);
    }

    let displayOrder = params.displayOrder;
    if (displayOrder === undefined) {
      const tableBindings = inMemoryDimensionBindings.filter((b) => b.tableDefinitionId === table.id);
      displayOrder = tableBindings.length > 0
        ? Math.max(...tableBindings.map((b) => b.displayOrder)) + 1
        : 0;
    }

    const newBinding = {
      id: uuidv4(),
      tableDefinitionId: table.id,
      dimensionId: dimension.id,
      displayOrder,
      isRequired: params.isRequired !== undefined ? params.isRequired : true,
      allowedValues: params.allowedValues || null,
      dimension,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryDimensionBindings.push(newBinding);

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DIMENSION_BOUND',
      entityType: 'TableDimensionBinding',
      entityId: newBinding.id,
      afterState: newBinding,
      req,
    });

    return newBinding;
  }

  /**
   * Unbinds a dimension from a table definition.
   */
  public static async unbindDimension(
    tableId: string,
    dimensionId: string,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may unbind dimensions');
    }

    const table = await this.getTableById(tableId, actor);
    if (!table) throw new NotFoundError(`Statistical Table '${tableId}'`);

    const dimension = await this.getDimensionById(dimensionId);
    if (!dimension) throw new NotFoundError(`Statistical Dimension '${dimensionId}'`);

    if (isDatabaseConnected()) {
      const officialObservation = await prisma.statisticalObservation.findFirst({
        where: {
          tableDefinitionId: table.id,
          dataset: {
            OR: [
              { publicationStatus: StatisticalPublicationStatus.OFFICIAL },
              { publicationStatus: StatisticalPublicationStatus.PUBLISHED },
              { isOfficial: true },
            ],
          },
        },
      });

      if (officialObservation) {
        throw new ForbiddenError(
          'Once a dataset is OFFICIAL or PUBLISHED, a dimension cannot be removed from its table structure.'
        );
      }

      const binding = await prisma.tableDimensionBinding.findUnique({
        where: {
          tableDefinitionId_dimensionId: {
            tableDefinitionId: table.id,
            dimensionId: dimension.id,
          },
        },
      });

      if (!binding) {
        throw new NotFoundError('Dimension binding not found on this table');
      }

      // Check if observations exist for this table
      const obsCount = await prisma.statisticalObservation.count({
        where: { tableDefinitionId: table.id },
      });

      if (obsCount > 0) {
        throw new ConflictError(
          'Cannot unbind dimension from a table with existing statistical observations.'
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.tableDimensionBinding.delete({
          where: { id: binding.id },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DIMENSION_UNBOUND',
          entityType: 'TableDimensionBinding',
          entityId: binding.id,
          beforeState: binding,
          req,
        });
      });

      return { success: true, message: 'Dimension unbound successfully' };
    }

    // In-memory unbind
    const index = inMemoryDimensionBindings.findIndex(
      (b) => b.tableDefinitionId === table.id && b.dimensionId === dimension.id
    );
    if (index === -1) {
      throw new NotFoundError('Dimension binding not found on this table');
    }

    const removed = inMemoryDimensionBindings.splice(index, 1)[0];

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DIMENSION_UNBOUND',
      entityType: 'TableDimensionBinding',
      entityId: removed.id,
      beforeState: removed,
      req,
    });

    return { success: true, message: 'Dimension unbound successfully' };
  }

  /**
   * Reorders dimensions for a table definition.
   */
  public static async reorderDimensions(
    tableId: string,
    dimensions: Array<{ dimensionId: string; displayOrder: number }>,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may reorder dimensions');
    }

    const table = await this.getTableById(tableId, actor);
    if (!table) throw new NotFoundError(`Statistical Table '${tableId}'`);

    const dimIds = dimensions.map((d) => d.dimensionId);
    const uniqueIds = new Set(dimIds);
    if (uniqueIds.size !== dimIds.length) {
      throw new ValidationError('Duplicate dimension IDs in reorder request');
    }

    if (isDatabaseConnected()) {
      const currentBindings = await prisma.tableDimensionBinding.findMany({
        where: { tableDefinitionId: table.id },
      });

      for (const item of dimensions) {
        const found = currentBindings.find((b) => b.dimensionId === item.dimensionId);
        if (!found) {
          throw new NotFoundError(`Dimension '${item.dimensionId}' is not bound to this table.`);
        }
      }

      await prisma.$transaction(async (tx) => {
        for (const item of dimensions) {
          await tx.tableDimensionBinding.update({
            where: {
              tableDefinitionId_dimensionId: {
                tableDefinitionId: table.id,
                dimensionId: item.dimensionId,
              },
            },
            data: { displayOrder: item.displayOrder },
          });
        }

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'TABLE_DIMENSION_REORDERED',
          entityType: 'StatisticalTableDefinition',
          entityId: table.id,
          afterState: dimensions,
          req,
        });
      });

      return await this.getTableById(table.id, actor);
    }

    // In-memory reordering
    for (const item of dimensions) {
      const b = inMemoryDimensionBindings.find(
        (b) => b.tableDefinitionId === table.id && b.dimensionId === item.dimensionId
      );
      if (!b) {
        throw new NotFoundError(`Dimension '${item.dimensionId}' is not bound to this table.`);
      }
      b.displayOrder = item.displayOrder;
      b.updatedAt = new Date();
    }

    await AuditService.logAction({
      userId: actor.id,
      action: 'TABLE_DIMENSION_REORDERED',
      entityType: 'StatisticalTableDefinition',
      entityId: table.id,
      afterState: dimensions,
      req,
    });

    return await this.getTableById(table.id, actor);
  }

  /**
   * Retrieves single dimension by ID or Code.
   */
  public static async getDimensionById(idOrCode: string) {
    if (isDatabaseConnected()) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrCode);
      const whereClause = isUuid ? { id: idOrCode } : { dimensionCode: idOrCode.toUpperCase() };

      return await prisma.statisticalDimension.findFirst({
        where: whereClause,
      });
    }

    return (
      inMemoryDimensions.find(
        (d) => d.id === idOrCode || d.dimensionCode.toUpperCase() === idOrCode.toUpperCase()
      ) || null
    );
  }

  /**
   * Creates a new dimension inline.
   */
  public static async createDimension(
    params: CreateDimensionParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may create dimensions');
    }

    const dimensionCode = params.dimensionCode.trim().toUpperCase();
    const name = params.name.trim();

    if (!dimensionCode) throw new ValidationError('Dimension code is required');
    if (!name) throw new ValidationError('Dimension name is required');

    if (isDatabaseConnected()) {
      const existing = await prisma.statisticalDimension.findUnique({
        where: { dimensionCode },
      });

      if (existing) {
        throw new ConflictError(`Dimension with code '${dimensionCode}' already exists.`);
      }

      const created = await prisma.$transaction(async (tx) => {
        const dim = await tx.statisticalDimension.create({
          data: {
            dimensionCode,
            name,
            description: params.description || null,
            dataType: params.dataType || 'string',
            vocabularySource: params.vocabularySource || null,
            verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
          },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'STATISTICAL_DIMENSION_CREATED',
          entityType: 'StatisticalDimension',
          entityId: dim.id,
          afterState: dim,
          req,
        });

        return dim;
      });

      return created;
    }

    // In-memory create
    if (inMemoryDimensions.some((d) => d.dimensionCode.toUpperCase() === dimensionCode)) {
      throw new ConflictError(`Dimension with code '${dimensionCode}' already exists.`);
    }

    const createdDim = {
      id: uuidv4(),
      dimensionCode,
      name,
      description: params.description || null,
      dataType: params.dataType || 'string',
      vocabularySource: params.vocabularySource || null,
      verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryDimensions.push(createdDim);

    await AuditService.logAction({
      userId: actor.id,
      action: 'STATISTICAL_DIMENSION_CREATED',
      entityType: 'StatisticalDimension',
      entityId: createdDim.id,
      afterState: createdDim,
      req,
    });

    return createdDim;
  }

  /**
   * Retrieves the dimension dictionary with search and filtering.
   */
  public static async getDimensionDictionary(query: {
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
  } = {}) {
    if (isDatabaseConnected()) {
      const where: any = {};
      if (query.verificationStatus) {
        where.verificationStatus = query.verificationStatus;
      }
      if (query.search) {
        const search = query.search.trim();
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { dimensionCode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      return await prisma.statisticalDimension.findMany({
        where,
        orderBy: { name: 'asc' },
      });
    }

    let results = [...inMemoryDimensions];
    if (query.verificationStatus) {
      results = results.filter((d) => d.verificationStatus === query.verificationStatus);
    }
    if (query.search) {
      const term = query.search.toLowerCase().trim();
      results = results.filter(
        (d) =>
          d.name.toLowerCase().includes(term) ||
          d.dimensionCode.toLowerCase().includes(term) ||
          (d.description && d.description.toLowerCase().includes(term))
      );
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Creates an indicator attached to a table.
   */
  public static async createIndicator(
    tableId: string,
    params: CreateIndicatorParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may create indicators');
    }

    const table = await this.getTableById(tableId, actor);
    if (!table) throw new NotFoundError(`Statistical Table '${tableId}'`);

    const indicatorCode = params.indicatorCode.trim().toUpperCase();
    const name = params.name.trim();
    const title = params.title.trim();

    if (!indicatorCode) throw new ValidationError('Indicator code is required');
    if (!name) throw new ValidationError('Indicator name is required');
    if (!title) throw new ValidationError('Indicator title is required');

    if (isDatabaseConnected()) {
      const existing = await prisma.statisticalIndicator.findUnique({
        where: { indicatorCode },
      });
      if (existing) {
        throw new ConflictError(`Indicator with code '${indicatorCode}' already exists.`);
      }

      const created = await prisma.$transaction(async (tx) => {
        const ind = await tx.statisticalIndicator.create({
          data: {
            tableDefinitionId: table.id,
            indicatorCode,
            name,
            title,
            description: params.description || null,
            unit: params.unit || null,
            classification: params.classification || StatisticalTableClassification.INDICATOR,
            formula: params.formula || null,
            numeratorDefinition: params.numeratorDefinition || null,
            denominatorDefinition: params.denominatorDefinition || null,
            verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
          },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'INDICATOR_DEFINITION_CREATED',
          entityType: 'StatisticalIndicator',
          entityId: ind.id,
          afterState: ind,
          req,
        });

        return ind;
      });

      return created;
    }

    // In-memory create
    if (inMemoryIndicators.some((i) => i.indicatorCode.toUpperCase() === indicatorCode)) {
      throw new ConflictError(`Indicator with code '${indicatorCode}' already exists.`);
    }

    const newInd = {
      id: uuidv4(),
      tableDefinitionId: table.id,
      indicatorCode,
      name,
      title,
      description: params.description || null,
      unit: params.unit || null,
      classification: params.classification || StatisticalTableClassification.INDICATOR,
      formula: params.formula || null,
      numeratorDefinition: params.numeratorDefinition || null,
      denominatorDefinition: params.denominatorDefinition || null,
      verificationStatus: params.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryIndicators.push(newInd);

    await AuditService.logAction({
      userId: actor.id,
      action: 'INDICATOR_DEFINITION_CREATED',
      entityType: 'StatisticalIndicator',
      entityId: newInd.id,
      afterState: newInd,
      req,
    });

    return newInd;
  }

  /**
   * Updates an indicator definition.
   */
  public static async updateIndicator(
    indicatorId: string,
    params: UpdateIndicatorParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may update indicators');
    }

    if (isDatabaseConnected()) {
      const ind = await prisma.statisticalIndicator.findUnique({
        where: { id: indicatorId },
      });
      if (!ind) throw new NotFoundError(`Statistical Indicator '${indicatorId}'`);

      const updateData: any = {};
      if (params.name !== undefined) updateData.name = params.name.trim();
      if (params.title !== undefined) updateData.title = params.title.trim();
      if (params.description !== undefined) updateData.description = params.description;
      if (params.unit !== undefined) updateData.unit = params.unit;
      if (params.classification !== undefined) updateData.classification = params.classification;
      if (params.formula !== undefined) updateData.formula = params.formula;
      if (params.numeratorDefinition !== undefined) updateData.numeratorDefinition = params.numeratorDefinition;
      if (params.denominatorDefinition !== undefined) updateData.denominatorDefinition = params.denominatorDefinition;
      if (params.verificationStatus !== undefined) updateData.verificationStatus = params.verificationStatus;

      const updated = await prisma.$transaction(async (tx) => {
        const res = await tx.statisticalIndicator.update({
          where: { id: indicatorId },
          data: updateData,
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'INDICATOR_DEFINITION_UPDATED',
          entityType: 'StatisticalIndicator',
          entityId: indicatorId,
          beforeState: ind,
          afterState: res,
          req,
        });

        return res;
      });

      return updated;
    }

    // In-memory update
    const indIndex = inMemoryIndicators.findIndex((i) => i.id === indicatorId);
    if (indIndex === -1) throw new NotFoundError(`Statistical Indicator '${indicatorId}'`);

    const before = { ...inMemoryIndicators[indIndex] };
    const after = {
      ...before,
      ...params,
      updatedAt: new Date(),
    };
    inMemoryIndicators[indIndex] = after;

    await AuditService.logAction({
      userId: actor.id,
      action: 'INDICATOR_DEFINITION_UPDATED',
      entityType: 'StatisticalIndicator',
      entityId: indicatorId,
      beforeState: before,
      afterState: after,
      req,
    });

    return after;
  }

  /**
   * Deletes an indicator definition if unreferenced.
   */
  public static async deleteIndicator(
    indicatorId: string,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role !== Role.SUPER_ADMIN && actor.role !== Role.ADMIN) {
      throw new ForbiddenError('Only ADMIN or SUPER_ADMIN may delete indicators');
    }

    if (isDatabaseConnected()) {
      const ind = await prisma.statisticalIndicator.findUnique({
        where: { id: indicatorId },
      });
      if (!ind) throw new NotFoundError(`Statistical Indicator '${indicatorId}'`);

      const observationCount = await prisma.statisticalObservation.count({
        where: { indicatorId },
      });

      if (observationCount > 0) {
        throw new ConflictError(
          `Cannot delete indicator '${ind.indicatorCode}' referenced by ${observationCount} statistical observations.`
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.statisticalIndicator.delete({
          where: { id: indicatorId },
        });

        await AuditService.logActionTx(tx, {
          userId: actor.id,
          action: 'INDICATOR_DEFINITION_DELETED',
          entityType: 'StatisticalIndicator',
          entityId: indicatorId,
          beforeState: ind,
          req,
        });
      });

      return { success: true, message: `Indicator '${ind.indicatorCode}' deleted successfully.` };
    }

    // In-memory delete
    const indIndex = inMemoryIndicators.findIndex((i) => i.id === indicatorId);
    if (indIndex === -1) throw new NotFoundError(`Statistical Indicator '${indicatorId}'`);

    const removed = inMemoryIndicators.splice(indIndex, 1)[0];

    await AuditService.logAction({
      userId: actor.id,
      action: 'INDICATOR_DEFINITION_DELETED',
      entityType: 'StatisticalIndicator',
      entityId: indicatorId,
      beforeState: removed,
      req,
    });

    return { success: true, message: `Indicator '${removed.indicatorCode}' deleted successfully.` };
  }
}
