import { AuditService } from './AuditService';
import { statisticalDataStatus } from '../lib/statisticalDataStatus';
import {
  StatisticalTableClassification,
  StatisticalPublicationStatus,
  StatisticalVerificationStatus,
} from '@prisma/client';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export interface StatisticalTableCatalogItem {
  tableNumber: number;
  tableCode: string;
  title: string;
  domain: string;
  classification: StatisticalTableClassification;
  description: string;
  expectedUnit: string;
  rowGrain: string;
  dimensionsSummary: string;
  measureStructure: string;
  sourceFormat: string;
  verificationStatus: StatisticalVerificationStatus;
}

import { CBMS_SOURCE_ROWS } from '../data/cbmsSourceRows';
import { reconcileCbmsCatalog } from './reconcileCbmsCatalog';
// Domains/classification are local navigation metadata; the source register only
// establishes tab name, table number, and title. Tabulation schemas remain unverified.
function sourceDomain(n: number): string {
  if (n >= 55) return 'SDG Indicators';
  if ([1, 2, 24, 25, 26, 27].includes(n)) return 'Demographics & Population';
  if ([28, 29, 42, 43, 48].includes(n)) return 'Education & Literacy';
  if (n >= 30 && n <= 46) return 'Labor & Employment';
  if ([21, 23].includes(n)) return 'Health & Nutrition';
  if ([52, 54].includes(n)) return 'Environment & Disaster Preparedness';
  if ([3, 4, 22, 47, 53].includes(n)) return 'Community & Connectivity';
  return 'Living Conditions & Housing';
}

export const STATISTICAL_69_TABLE_CATALOG: StatisticalTableCatalogItem[] = CBMS_SOURCE_ROWS.map(row => ({
  tableNumber: row.tableNumber,
  tableCode: row.tableCode,
  title: row.title,
  domain: sourceDomain(row.tableNumber),
  classification: /^(Proportion|.*Rate)/i.test(row.title)
    ? StatisticalTableClassification.INDICATOR : StatisticalTableClassification.AGGREGATED_STATISTICS,
  description: 'CBMS source tab: ' + row.tabName + '. ' + row.title,
  expectedUnit: 'UNVERIFIED',
  rowGrain: 'UNVERIFIED',
  dimensionsSummary: 'UNVERIFIED',
  measureStructure: 'UNVERIFIED',
  sourceFormat: 'CSV table register; tabulation schema unverified',
  verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
}));

// In-Memory Catalog State for development/testing
let inMemoryTableDefinitions = [...STATISTICAL_69_TABLE_CATALOG].map((item) => ({
  ...item,
  id: `stat-def-${item.tableNumber}`,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

let inMemoryDatasets: any[] = [];
let inMemoryIndicators: any[] = [];
let inMemoryDimensions: any[] = [
  {
    id: 'dim-sex',
    dimensionCode: 'DIM_SEX',
    name: 'Sex',
    description: 'Biological sex classification (Male, Female)',
    dataType: 'string',
    vocabularySource: 'PSA / CBMS standard codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-age-group',
    dimensionCode: 'DIM_AGE_GROUP',
    name: 'Age Group',
    description: 'Five-year and statutory age cohorts (0-4, 5-9, 15-24, 60+)',
    dataType: 'string',
    vocabularySource: 'PSA standardized demographic brackets',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-barangay',
    dimensionCode: 'DIM_BARANGAY',
    name: 'Barangay',
    description: '25 official Talibon administrative barangays',
    dataType: 'string(UUID)',
    vocabularySource: 'LGU Talibon Official Registry',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-tenure',
    dimensionCode: 'DIM_TENURE_STATUS',
    name: 'Tenure Status',
    description: 'Housing and land tenure classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section B codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-water-source',
    dimensionCode: 'DIM_WATER_SOURCE',
    name: 'Water Supply Source',
    description: 'Primary drinking and general domestic water source classification',
    dataType: 'string',
    vocabularySource: 'CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'dim-sanitation',
    dimensionCode: 'DIM_TOILET_FACILITY',
    name: 'Sanitation / Toilet Type',
    description: 'Sanitary toilet and sanitation service classification',
    dataType: 'string',
    vocabularySource: 'DOH / CBMS Section C codebook',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

let inMemoryObservations: any[] = [];
let inMemoryProvenances: any[] = [];

export class StatisticalCatalogService {
  /**
   * Deterministically seeds or verifies the 69 statistical table definitions.
   * Safe to execute multiple times (idempotent).
   */
  public static async seedCatalog(): Promise<{ count: number; seeded: number }> {
    if (isDatabaseConnected()) return reconcileCbmsCatalog(prisma, STATISTICAL_69_TABLE_CATALOG);
    return { count: STATISTICAL_69_TABLE_CATALOG.length, seeded: STATISTICAL_69_TABLE_CATALOG.length };
  }
  /**
   * Retrieves registered statistical table definitions with rich filtering & pagination.
   */
  public static async getAllTableDefinitions(params: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>;
  public static async getAllTableDefinitions(params?: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page?: number;
    limit?: number;
  }): Promise<any[]>;
  public static async getAllTableDefinitions(params?: {
    domain?: string;
    classification?: StatisticalTableClassification;
    search?: string;
    verificationStatus?: StatisticalVerificationStatus;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const isPaginated = params?.page !== undefined;
    const page = Math.max(1, params?.page || 1);
    const limit = Math.max(1, Math.min(100, params?.limit || 69));

    if (isDatabaseConnected()) {
      const where: any = {};
      if (params?.domain) {
        where.domain = { contains: params.domain, mode: 'insensitive' };
      }
      if (params?.classification) {
        where.classification = params.classification;
      }
      if (params?.verificationStatus) {
        where.verificationStatus = params.verificationStatus;
      }
      if (params?.search) {
        const searchTerm = params.search.trim();
        where.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { tableCode: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { domain: { contains: searchTerm, mode: 'insensitive' } },
          { expectedUnit: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const total = await prisma.statisticalTableDefinition.count({ where });
      const items = await prisma.statisticalTableDefinition.findMany({
        where,
        orderBy: { tableNumber: 'asc' },
        skip: isPaginated ? (page - 1) * limit : undefined,
        take: isPaginated ? limit : undefined,
        include: {
          _count: { select: { observations: true } },
          indicators: true,
        },
      });

      if (isPaginated) {
        return {
          data: items.map((t) => ({
            ...t,
            ...statisticalDataStatus(t, isDatabaseConnected()),
          })),
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        };
      }
      return items.map((t) => ({
        ...t,
        ...statisticalDataStatus(t, isDatabaseConnected()),
      }));
    }

    let results = inMemoryTableDefinitions.map((t) => ({
      ...t,
      ...statisticalDataStatus(t, isDatabaseConnected()),
    }));
    if (params?.domain) {
      const d = params.domain.toLowerCase();
      results = results.filter((t) => t.domain.toLowerCase().includes(d));
    }
    if (params?.classification) {
      results = results.filter((t) => t.classification === params.classification);
    }
    if (params?.verificationStatus) {
      results = results.filter((t) => t.verificationStatus === params.verificationStatus);
    }
    if (params?.search) {
      const term = params.search.toLowerCase().trim();
      results = results.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.tableCode.toLowerCase().includes(term) ||
          (t.description && t.description.toLowerCase().includes(term)) ||
          t.domain.toLowerCase().includes(term) ||
          (t.expectedUnit && t.expectedUnit.toLowerCase().includes(term))
      );
    }

    const total = results.length;
    if (isPaginated) {
      const startIndex = (page - 1) * limit;
      const paginatedItems = results.slice(startIndex, startIndex + limit);
      return {
        data: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }
    return results;
  }

  /**
   * Retrieves a table definition by table number (1 to 69).
   */
  public static async getTableDefinitionByNumber(tableNumber: number): Promise<any | null> {
    if (isDatabaseConnected()) {
      const table = await prisma.statisticalTableDefinition.findUnique({
        where: { tableNumber },
        include: { indicators: true, _count: { select: { observations: true } } },
      });
      return table ? { ...table, ...statisticalDataStatus(table, true) } : null;
    }
    return inMemoryTableDefinitions.find((t) => t.tableNumber === tableNumber) || null;
  }

  /**
   * Retrieves a table definition by table code (e.g. STAT-TAB-01).
   */
  public static async getTableDefinitionByCode(tableCode: string): Promise<any | null> {
    const normalized = tableCode.trim().toUpperCase();
    if (isDatabaseConnected()) {
      const table = await prisma.statisticalTableDefinition.findUnique({
        where: { tableCode: normalized },
        include: { indicators: true, _count: { select: { observations: true } } },
      });
      return table ? { ...table, ...statisticalDataStatus(table, true) } : null;
    }
    return inMemoryTableDefinitions.find((t) => t.tableCode.toUpperCase() === normalized) || null;
  }

  /**
   * Retrieves a table definition by either code (e.g. STAT-TAB-01) or number (e.g. 1).
   */
  public static async getTableDefinitionByCodeOrNumber(identifier: string | number): Promise<any | null> {
    if (typeof identifier === 'number' || !isNaN(Number(identifier))) {
      const num = typeof identifier === 'number' ? identifier : parseInt(identifier, 10);
      const res = await this.getTableDefinitionByNumber(num);
      if (res) return res;
    }
    return await this.getTableDefinitionByCode(String(identifier));
  }

  /**
   * Returns domain summary metrics for all 9 canonical domains.
   */
  public static async getDomainsSummary(): Promise<any[]> {
    const allTables = isDatabaseConnected()
      ? await prisma.statisticalTableDefinition.findMany({
          orderBy: { tableNumber: 'asc' },
          include: { indicators: true, _count: { select: { observations: true } } },
        })
      : inMemoryTableDefinitions;

    const domainMap: { [key: string]: { domain: string; tableCount: number; tables: any[]; verifiedCount: number; unverifiedCount: number; indicatorCount: number } } = {};

    for (const t of allTables) {
      const domainName = t.domain;
      if (!domainMap[domainName]) {
        domainMap[domainName] = {
          domain: domainName,
          tableCount: 0,
          tables: [],
          verifiedCount: 0,
          unverifiedCount: 0,
          indicatorCount: 0,
        };
      }
      domainMap[domainName].tableCount++;
      domainMap[domainName].tables.push({
        tableNumber: t.tableNumber,
        tableCode: t.tableCode,
        title: t.title,
        classification: t.classification,
        verificationStatus: t.verificationStatus,
      });
      if (t.verificationStatus === StatisticalVerificationStatus.VERIFIED) {
        domainMap[domainName].verifiedCount++;
      } else {
        domainMap[domainName].unverifiedCount++;
      }
      const indicators = (t as any).indicators;
      if (indicators && Array.isArray(indicators)) {
        domainMap[domainName].indicatorCount += indicators.length;
      }
    }

    return Object.values(domainMap);
  }

  /**
   * Registers a Statistical Dataset header (survey publication / dataset metadata).
   */
  public static async createDataset(data: {
    datasetCode: string;
    name: string;
    description?: string;
    sourceAgency?: string;
    reportingYear?: number;
    reportingPeriod?: string;
    surveyRound?: string;
    geographicLevel?: string;
    sourceFileName?: string;
    importedById?: string;
    publicationStatus?: StatisticalPublicationStatus;
  }): Promise<any> {
    const reportingYear = data.reportingYear || new Date().getFullYear();

    if (isDatabaseConnected()) {
      return prisma.$transaction(async tx => {
        const created = await tx.statisticalDataset.create({
          data: {
            datasetCode: data.datasetCode,
            name: data.name,
            description: data.description,
            sourceAgency: data.sourceAgency,
            reportingYear,
            reportingPeriod: data.reportingPeriod,
            surveyRound: data.surveyRound,
            geographicLevel: data.geographicLevel || 'MUNICIPALITY',
            sourceFileName: data.sourceFileName,
            importedById: data.importedById,
            publicationStatus: StatisticalPublicationStatus.DRAFT,
            verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
          },
        });
        await AuditService.logActionTx(tx, { userId: data.importedById, action: 'DATASET_CREATED', entityType: 'StatisticalDataset', entityId: created.id, afterState: created });
        return created;
      });
    }

    const newDataset = {
      id: uuidv4(),
      datasetCode: data.datasetCode,
      name: data.name,
      description: data.description || null,
      sourceAgency: data.sourceAgency || null,
      reportingYear,
      reportingPeriod: data.reportingPeriod || null,
      surveyRound: data.surveyRound || null,
      geographicLevel: data.geographicLevel || 'MUNICIPALITY',
      sourceFileName: data.sourceFileName || null,
      importedById: data.importedById || null,
      isOfficial: false,
      isPublished: false,
      isApproved: false,
      publicationStatus: StatisticalPublicationStatus.DRAFT,
      verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryDatasets.push(newDataset);
    return newDataset;
  }

  /**
   * Registers an Indicator associated with a table definition.
   */
  public static async registerIndicator(data: {
    indicatorCode: string;
    name: string;
    title: string;
    description?: string;
    unit?: string;
    classification?: StatisticalTableClassification;
    formula?: string;
    numeratorDefinition?: string;
    denominatorDefinition?: string;
    tableDefinitionId?: string;
  }): Promise<any> {
    if (isDatabaseConnected()) {
      return prisma.$transaction(async tx => {
        const created = await tx.statisticalIndicator.create({
          data: {
            indicatorCode: data.indicatorCode,
            name: data.name,
            title: data.title,
            description: data.description,
            unit: data.unit,
            classification: data.classification || StatisticalTableClassification.INDICATOR,
            formula: data.formula,
            numeratorDefinition: data.numeratorDefinition,
            denominatorDefinition: data.denominatorDefinition,
            tableDefinitionId: data.tableDefinitionId,
            verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
          },
        });
        await AuditService.logActionTx(tx, { action: 'INDICATOR_CREATED', entityType: 'StatisticalIndicator', entityId: created.id, afterState: created });
        return created;
      });
    }

    const newIndicator = {
      id: uuidv4(),
      indicatorCode: data.indicatorCode,
      name: data.name,
      title: data.title,
      description: data.description || null,
      unit: data.unit || null,
      classification: data.classification || StatisticalTableClassification.INDICATOR,
      formula: data.formula || null,
      numeratorDefinition: data.numeratorDefinition || null,
      denominatorDefinition: data.denominatorDefinition || null,
      tableDefinitionId: data.tableDefinitionId || null,
      verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryIndicators.push(newIndicator);
    return newIndicator;
  }

  /**
   * Retrieves registered analytical dimensions.
   */
  public static async getDimensions(): Promise<any[]> {
    if (isDatabaseConnected()) {
      return await prisma.statisticalDimension.findMany({
        orderBy: { dimensionCode: 'asc' },
      });
    }
    return inMemoryDimensions;
  }

  /**
   * Creates a single statistical observation fact.
   */
  public static async createObservation(data: {
    datasetId: string;
    tableDefinitionId: string;
    indicatorId?: string;
    barangayId?: string;
    period: string;
    numericValue: number | string;
    unit?: string;
    dimensions?: any;
    provenanceId?: string;
    suppressionStatus?: string;
    suppressionReason?: string;
  }): Promise<any> {
    if (isDatabaseConnected()) {
      return prisma.$transaction(async tx => {
        const created = await tx.statisticalObservation.create({
          data: {
            datasetId: data.datasetId,
            tableDefinitionId: data.tableDefinitionId,
            indicatorId: data.indicatorId,
            barangayId: data.barangayId,
            period: data.period,
            numericValue: data.numericValue as any,
            unit: data.unit,
            dimensions: data.dimensions,
            provenanceId: data.provenanceId,
            suppressionStatus: data.suppressionStatus || 'NONE',
            suppressionReason: data.suppressionReason,
          },
        });
        await AuditService.logActionTx(tx, { action: 'OBSERVATION_CREATED', entityType: 'StatisticalObservation', entityId: created.id, afterState: created });
        return created;
      });
    }

    const newObs = {
      id: uuidv4(),
      datasetId: data.datasetId,
      tableDefinitionId: data.tableDefinitionId,
      indicatorId: data.indicatorId || null,
      barangayId: data.barangayId || null,
      period: data.period,
      numericValue: data.numericValue,
      unit: data.unit || null,
      dimensions: data.dimensions || null,
      provenanceId: data.provenanceId || null,
      suppressionStatus: data.suppressionStatus || 'NONE',
      suppressionReason: data.suppressionReason || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryObservations.push(newObs);
    return newObs;
  }

  /**
   * Resets in-memory test observation and dataset state.
   */
  public static resetInMemoryTestState(): void {
    inMemoryDatasets = [];
    inMemoryIndicators = [];
    inMemoryObservations = [];
    inMemoryProvenances = [];
  }
}
