import prisma, { isDatabaseConnected } from '../lib/prisma';
import {
  StatisticalPublicationStatus,
  StatisticalVerificationStatus,
  Role,
} from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  OfficeScopeError,
  ValidationError,
  ConflictError,
  AppError,
} from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ActorContext {
  id: string;
  email?: string;
  fullName?: string;
  role: Role;
  officeId?: string | null;
}

export interface CreateDatasetParams {
  datasetCode: string;
  name: string;
  description?: string | null;
  sourceAgency?: string | null;
  reportingYear?: number | null;
  reportingPeriod?: string | null;
  surveyRound?: string | null;
  geographicLevel?: string;
  sourceFileName?: string | null;
}

export interface TransitionMetadata {
  reason?: string;
  notes?: string;
  signOffBy?: string;
  movDocumentUrl?: string | null;
}

export interface ListDatasetsFilter {
  page?: number;
  limit?: number;
  status?: StatisticalPublicationStatus;
  year?: number;
  sourceAgency?: string;
  search?: string;
}

export interface TransitionResult {
  dataset: any;
  transition: {
    from: StatisticalPublicationStatus;
    to: StatisticalPublicationStatus;
    action: string;
    executedBy: string;
    timestamp: Date;
    reason?: string;
  };
}

// In-Memory Seed State for Offline Development and Automated Unit Testing
const INITIAL_FALLBACK_DATASETS = [
  {
    id: 'd1111111-1111-1111-1111-111111111111',
    datasetCode: 'CBMS-2024-DEMOG-01',
    name: '2024 Talibon CBMS Demographic & Household Summary Matrix',
    description: 'Official baseline household summary counts disaggregated by sex and barangay.',
    sourceAgency: 'PSA / Municipal Planning and Development Coordinator (MPDC)',
    reportingYear: 2024,
    reportingPeriod: 'ANNUAL',
    surveyRound: 'Round 1',
    geographicLevel: 'MUNICIPALITY',
    sourceFileName: 'talibon_cbms_2024_demographics.csv',
    ingestionBatchId: null,
    importedById: '00000000-0000-0000-0000-000000000001',
    isOfficial: true,
    isPublished: true,
    publicationStatus: StatisticalPublicationStatus.PUBLISHED,
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-01-15T08:00:00.000Z'),
    updatedAt: new Date('2024-02-01T10:00:00.000Z'),
    importedBy: {
      id: '00000000-0000-0000-0000-000000000001',
      fullName: 'System Administrator',
      email: 'admin@talibon.gov.ph',
      role: Role.SUPER_ADMIN,
      officeId: null,
      office: null,
    },
    observationsCount: 25,
  },
  {
    id: 'd2222222-2222-2222-2222-222222222222',
    datasetCode: 'CBMS-2024-HOUSING-01',
    name: '2024 Housing & Living Conditions Assessment',
    description: 'Tenure status and construction material distributions for municipal households.',
    sourceAgency: 'MPDC',
    reportingYear: 2024,
    reportingPeriod: 'ANNUAL',
    surveyRound: 'Round 1',
    geographicLevel: 'MUNICIPALITY',
    sourceFileName: 'talibon_cbms_2024_housing.csv',
    ingestionBatchId: null,
    importedById: '00000000-0000-0000-0000-000000000002',
    isOfficial: true,
    isPublished: false,
    publicationStatus: StatisticalPublicationStatus.OFFICIAL,
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
    createdAt: new Date('2024-02-10T09:00:00.000Z'),
    updatedAt: new Date('2024-02-20T14:30:00.000Z'),
    importedBy: {
      id: '00000000-0000-0000-0000-000000000002',
      fullName: 'MPDC Planning Officer',
      email: 'planner@talibon.gov.ph',
      role: Role.ADMIN,
      officeId: 'office-mpdc-uuid',
      office: { id: 'office-mpdc-uuid', code: 'MPDC', name: 'Municipal Planning & Development Office' },
    },
    observationsCount: 50,
  },
  {
    id: 'd3333333-3333-3333-3333-333333333333',
    datasetCode: 'MSWDO-2024-SOLO-PARENT-01',
    name: '2024 Registered Solo Parents Demographic Profile',
    description: 'Registered solo parents under RA 11861 disaggregated by sex across barangays.',
    sourceAgency: 'MSWDO',
    reportingYear: 2024,
    reportingPeriod: 'SEMESTER_1',
    surveyRound: 'H1',
    geographicLevel: 'MUNICIPALITY',
    sourceFileName: 'mswdo_solo_parents_2024.csv',
    ingestionBatchId: null,
    importedById: '00000000-0000-0000-0000-000000000003',
    isOfficial: false,
    isPublished: false,
    publicationStatus: StatisticalPublicationStatus.DRAFT,
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
    createdAt: new Date('2024-03-01T11:00:00.000Z'),
    updatedAt: new Date('2024-03-01T11:00:00.000Z'),
    importedBy: {
      id: '00000000-0000-0000-0000-000000000003',
      fullName: 'MSWDO Encoder',
      email: 'encoder_mswdo@talibon.gov.ph',
      role: Role.ENCODER,
      officeId: 'office-mswdo-uuid',
      office: { id: 'office-mswdo-uuid', code: 'MSWDO', name: 'Municipal Social Welfare & Development Office' },
    },
    observationsCount: 25,
  },
];

let MEMORY_DATASETS: any[] = JSON.parse(JSON.stringify(INITIAL_FALLBACK_DATASETS));

export class StatisticalDatasetService {
  /**
   * Resets in-memory datasets to baseline state (useful for automated testing).
   */
  public static resetInMemoryDatasets(): void {
    MEMORY_DATASETS = JSON.parse(JSON.stringify(INITIAL_FALLBACK_DATASETS));
  }

  /**
   * Authoritative Dataset Lifecycle State Transition Validator.
   * Enforces mathematical state machine integrity, RBAC, and governance preconditions.
   */
  public static canTransition(
    currentStatus: StatisticalPublicationStatus,
    targetStatus: StatisticalPublicationStatus,
    actor: ActorContext,
    dataset?: any,
    metadata?: TransitionMetadata
  ): { allowed: boolean; reason?: string; httpStatus?: number } {
    // 1. Identity Check: Target state must differ from current state
    if (currentStatus === targetStatus) {
      return {
        allowed: false,
        reason: `Dataset is already in ${currentStatus} status`,
        httpStatus: 400,
      };
    }

    // 2. Terminal State Check: WITHDRAWN is terminal and immutable
    if (currentStatus === StatisticalPublicationStatus.WITHDRAWN) {
      return {
        allowed: false,
        reason: 'Terminal State Violation: Withdrawn datasets cannot be transitioned to any other lifecycle state',
        httpStatus: 400,
      };
    }

    // 3. State Machine Transition Graph Matrix
    const ALLOWED_TRANSITIONS: Record<StatisticalPublicationStatus, StatisticalPublicationStatus[]> = {
      [StatisticalPublicationStatus.DRAFT]: [
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.WITHDRAWN,
      ],
      [StatisticalPublicationStatus.VALIDATED]: [
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.WITHDRAWN,
      ],
      [StatisticalPublicationStatus.OFFICIAL]: [
        StatisticalPublicationStatus.PUBLISHED,
        StatisticalPublicationStatus.WITHDRAWN,
      ],
      [StatisticalPublicationStatus.PUBLISHED]: [
        StatisticalPublicationStatus.WITHDRAWN,
      ],
      [StatisticalPublicationStatus.WITHDRAWN]: [],
    };

    const validTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!validTargets.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `Illegal state transition from ${currentStatus} to ${targetStatus}. Valid target states from ${currentStatus} are: [${validTargets.join(', ')}]`,
        httpStatus: 400,
      };
    }

    // 4. Role-Based Access Control (RBAC) Verification
    if (actor.role === Role.VIEWER) {
      return {
        allowed: false,
        reason: 'Access Denied: Viewers have read-only access and cannot perform lifecycle transitions',
        httpStatus: 403,
      };
    }

    if (actor.role === Role.ENCODER) {
      return {
        allowed: false,
        reason: 'Access Denied: Encoders are not authorized to perform governance transitions',
        httpStatus: 403,
      };
    }

    // Target-specific Role Rules:
    switch (targetStatus) {
      case StatisticalPublicationStatus.VALIDATED:
        if (actor.role !== Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
          return {
            allowed: false,
            reason: 'Validation requires ADMIN or SUPER_ADMIN role authority',
            httpStatus: 403,
          };
        }
        break;

      case StatisticalPublicationStatus.OFFICIAL:
        if (actor.role !== Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
          return {
            allowed: false,
            reason: 'Officialization requires departmental review authority (ADMIN or SUPER_ADMIN)',
            httpStatus: 403,
          };
        }
        break;

      case StatisticalPublicationStatus.PUBLISHED:
        if (actor.role !== Role.SUPER_ADMIN) {
          return {
            allowed: false,
            reason: 'Public release requires executive sign-off authority (SUPER_ADMIN role required)',
            httpStatus: 403,
          };
        }
        break;

      case StatisticalPublicationStatus.WITHDRAWN:
        if (actor.role !== Role.ADMIN && actor.role !== Role.SUPER_ADMIN) {
          return {
            allowed: false,
            reason: 'Dataset revocation requires administrative authority (ADMIN or SUPER_ADMIN)',
            httpStatus: 403,
          };
        }
        if (!metadata?.reason || metadata.reason.trim().length < 3) {
          return {
            allowed: false,
            reason: 'A documented revocation reason of at least 3 characters is mandatory to withdraw a dataset',
            httpStatus: 422,
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Retrieves a paginated and filtered list of datasets respecting office isolation.
   */
  public static async listDatasets(
    filter: ListDatasetsFilter,
    actor?: ActorContext
  ) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? Math.min(filter.limit, 100) : 20;

    if (!isDatabaseConnected()) {
      let filtered = [...MEMORY_DATASETS];

      // Office isolation for ENCODER
      if (actor && actor.role === Role.ENCODER) {
        filtered = filtered.filter(
          (d) =>
            d.publicationStatus === StatisticalPublicationStatus.PUBLISHED ||
            (actor.officeId && d.importedBy?.officeId === actor.officeId) ||
            d.importedById === actor.id
        );
      }

      if (filter.status) {
        filtered = filtered.filter((d) => d.publicationStatus === filter.status);
      }
      if (filter.year) {
        filtered = filtered.filter((d) => d.reportingYear === filter.year);
      }
      if (filter.sourceAgency) {
        filtered = filtered.filter((d) =>
          d.sourceAgency?.toLowerCase().includes(filter.sourceAgency!.toLowerCase())
        );
      }
      if (filter.search) {
        const query = filter.search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.datasetCode.toLowerCase().includes(query) ||
            d.name.toLowerCase().includes(query) ||
            (d.description && d.description.toLowerCase().includes(query))
        );
      }

      // Sort descending by creation
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);

      return {
        datasets: paginated,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    const where: any = {};

    // Apply status filter
    if (filter.status) {
      where.publicationStatus = filter.status;
    }

    // Apply year filter
    if (filter.year) {
      where.reportingYear = filter.year;
    }

    // Apply agency filter
    if (filter.sourceAgency) {
      where.sourceAgency = { contains: filter.sourceAgency, mode: 'insensitive' };
    }

    // Apply text search
    if (filter.search) {
      where.OR = [
        { datasetCode: { contains: filter.search, mode: 'insensitive' } },
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Enforce office isolation on query for ENCODER
    if (actor && actor.role === Role.ENCODER) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { publicationStatus: StatisticalPublicationStatus.PUBLISHED },
            ...(actor.officeId ? [{ importedBy: { officeId: actor.officeId } }] : []),
            { importedById: actor.id },
          ],
        },
      ];
    }

    const [total, datasets] = await Promise.all([
      prisma.statisticalDataset.count({ where }),
      prisma.statisticalDataset.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          importedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              office: { select: { id: true, code: true, name: true } },
            },
          },
          _count: {
            select: { observations: true },
          },
        },
      }),
    ]);

    const formatted = datasets.map((d) => ({
      ...d,
      observationsCount: d._count.observations,
    }));

    return {
      datasets: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves a single statistical dataset by ID, verifying office scoping.
   */
  public static async getDatasetById(id: string, actor?: ActorContext) {
    let dataset: any = null;

    if (!isDatabaseConnected()) {
      dataset = MEMORY_DATASETS.find((d) => d.id === id);
    } else {
      dataset = await prisma.statisticalDataset.findUnique({
        where: { id },
        include: {
          importedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              office: { select: { id: true, code: true, name: true } },
            },
          },
          _count: {
            select: { observations: true },
          },
        },
      });
      if (dataset) {
        dataset = {
          ...dataset,
          observationsCount: dataset._count?.observations || 0,
        };
      }
    }

    if (!dataset) {
      throw new NotFoundError('Statistical Dataset');
    }

    // Enforce office isolation: If not published and actor is an encoder from a different office, reject
    if (
      actor &&
      actor.role === Role.ENCODER &&
      dataset.publicationStatus !== StatisticalPublicationStatus.PUBLISHED
    ) {
      const datasetOfficeId = dataset.importedBy?.officeId || dataset.importedBy?.office?.id;
      if (dataset.importedById !== actor.id && !(datasetOfficeId && actor.officeId && datasetOfficeId === actor.officeId)) {
        throw new OfficeScopeError(
          `Access Denied: Dataset belongs to office (${dataset.importedBy?.office?.name || datasetOfficeId}). Your assigned office scope is ${actor.officeId}.`
        );
      }
    }

    return dataset;
  }

  /**
   * Creates a new statistical dataset header.
   * Enforces that all new datasets strictly begin as DRAFT.
   */
  public static async createDataset(
    data: CreateDatasetParams,
    actor: ActorContext,
    req?: Request
  ) {
    if (actor.role === Role.VIEWER) {
      throw new ForbiddenError('Viewers have read-only access and cannot create datasets');
    }

    // Check code uniqueness
    if (!isDatabaseConnected()) {
      const existing = MEMORY_DATASETS.find(
        (d) => d.datasetCode.toLowerCase() === data.datasetCode.toLowerCase()
      );
      if (existing) {
        throw new ConflictError(`Dataset with code '${data.datasetCode}' already exists`);
      }

      const newDataset = {
        id: uuidv4(),
        datasetCode: data.datasetCode,
        name: data.name,
        description: data.description || null,
        sourceAgency: data.sourceAgency || null,
        reportingYear: data.reportingYear || null,
        reportingPeriod: data.reportingPeriod || null,
        surveyRound: data.surveyRound || null,
        geographicLevel: data.geographicLevel || 'MUNICIPALITY',
        sourceFileName: data.sourceFileName || null,
        ingestionBatchId: null,
        importedById: actor.id,
        isOfficial: false,
        isPublished: false,
        publicationStatus: StatisticalPublicationStatus.DRAFT,
        verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
        createdAt: new Date(),
        updatedAt: new Date(),
        importedBy: {
          id: actor.id,
          fullName: actor.fullName || 'System User',
          email: actor.email || 'user@talibon.gov.ph',
          role: actor.role,
          officeId: actor.officeId || null,
          office: actor.officeId ? { id: actor.officeId, code: 'OFFICE', name: 'Assigned Office' } : null,
        },
        observationsCount: 0,
      };

      MEMORY_DATASETS.unshift(newDataset);

      // Audit Log
      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'STATISTICAL_DATASET_CREATED',
        entityType: 'StatisticalDataset',
        entityId: newDataset.id,
        beforeState: null,
        afterState: {
          datasetCode: newDataset.datasetCode,
          name: newDataset.name,
          publicationStatus: StatisticalPublicationStatus.DRAFT,
        },
        req,
      });

      return newDataset;
    }

    // Database path
    const existing = await prisma.statisticalDataset.findUnique({
      where: { datasetCode: data.datasetCode },
    });
    if (existing) {
      throw new ConflictError(`Dataset with code '${data.datasetCode}' already exists`);
    }

    const created = await prisma.$transaction(async (tx) => {
      const dataset = await tx.statisticalDataset.create({
        data: {
          datasetCode: data.datasetCode,
          name: data.name,
          description: data.description,
          sourceAgency: data.sourceAgency,
          reportingYear: data.reportingYear,
          reportingPeriod: data.reportingPeriod,
          surveyRound: data.surveyRound,
          geographicLevel: data.geographicLevel || 'MUNICIPALITY',
          sourceFileName: data.sourceFileName,
          importedById: actor.id,
          isOfficial: false,
          isPublished: false,
          publicationStatus: StatisticalPublicationStatus.DRAFT,
          verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
        },
        include: {
          importedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              office: { select: { id: true, code: true, name: true } },
            },
          },
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: 'STATISTICAL_DATASET_CREATED',
        entityType: 'StatisticalDataset',
        entityId: dataset.id,
        beforeState: null,
        afterState: {
          datasetCode: dataset.datasetCode,
          name: dataset.name,
          publicationStatus: StatisticalPublicationStatus.DRAFT,
        },
        req,
      });

      return dataset;
    });

    return {
      ...created,
      observationsCount: 0,
    };
  }

  /**
   * Executes an atomic dataset lifecycle state transition with audit logging.
   */
  public static async transitionStatus(
    datasetId: string,
    targetStatus: StatisticalPublicationStatus,
    actor: ActorContext,
    metadata?: TransitionMetadata,
    req?: Request
  ): Promise<TransitionResult> {
    const dataset = await this.getDatasetById(datasetId, actor);

    // Validate Transition
    const validation = this.canTransition(
      dataset.publicationStatus,
      targetStatus,
      actor,
      dataset,
      metadata
    );

    if (!validation.allowed) {
      throw new AppError(
        validation.reason || 'Invalid state transition requested',
        validation.httpStatus || 400,
        validation.httpStatus === 403 ? 'FORBIDDEN' : 'INVALID_TRANSITION'
      );
    }

    const previousStatus = dataset.publicationStatus;
    const auditAction = this.getAuditActionForStatus(targetStatus);

    const isOfficial =
      targetStatus === StatisticalPublicationStatus.OFFICIAL ||
      targetStatus === StatisticalPublicationStatus.PUBLISHED;

    const isPublished = targetStatus === StatisticalPublicationStatus.PUBLISHED;

    const verificationStatus =
      targetStatus === StatisticalPublicationStatus.WITHDRAWN
        ? StatisticalVerificationStatus.UNVERIFIED
        : targetStatus === StatisticalPublicationStatus.DRAFT
        ? StatisticalVerificationStatus.UNVERIFIED
        : StatisticalVerificationStatus.VERIFIED;

    if (!isDatabaseConnected()) {
      // In-Memory Transition
      const index = MEMORY_DATASETS.findIndex((d) => d.id === datasetId);
      if (index !== -1) {
        MEMORY_DATASETS[index] = {
          ...MEMORY_DATASETS[index],
          publicationStatus: targetStatus,
          isOfficial,
          isPublished,
          verificationStatus,
          updatedAt: new Date(),
        };
      }

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: auditAction,
        entityType: 'StatisticalDataset',
        entityId: datasetId,
        beforeState: {
          publicationStatus: previousStatus,
          isOfficial: dataset.isOfficial,
          isPublished: dataset.isPublished,
          verificationStatus: dataset.verificationStatus,
        },
        afterState: {
          publicationStatus: targetStatus,
          isOfficial,
          isPublished,
          verificationStatus,
          reason: metadata?.reason,
          notes: metadata?.notes,
          signOffBy: metadata?.signOffBy,
          movDocumentUrl: metadata?.movDocumentUrl,
        },
        req,
      });

      return {
        dataset: MEMORY_DATASETS[index],
        transition: {
          from: previousStatus,
          to: targetStatus,
          action: auditAction,
          executedBy: actor.fullName || actor.email || actor.id,
          timestamp: new Date(),
          reason: metadata?.reason,
        },
      };
    }

    // PostgreSQL Transactional Execution
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.statisticalDataset.update({
        where: { id: datasetId },
        data: {
          publicationStatus: targetStatus,
          isOfficial,
          isPublished,
          verificationStatus,
        },
        include: {
          importedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              office: { select: { id: true, code: true, name: true } },
            },
          },
          _count: {
            select: { observations: true },
          },
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actor.id,
        action: auditAction,
        entityType: 'StatisticalDataset',
        entityId: datasetId,
        beforeState: {
          publicationStatus: previousStatus,
          isOfficial: dataset.isOfficial,
          isPublished: dataset.isPublished,
          verificationStatus: dataset.verificationStatus,
        },
        afterState: {
          publicationStatus: targetStatus,
          isOfficial,
          isPublished,
          verificationStatus,
          reason: metadata?.reason,
          notes: metadata?.notes,
          signOffBy: metadata?.signOffBy,
          movDocumentUrl: metadata?.movDocumentUrl,
        },
        req,
      });

      return result;
    });

    return {
      dataset: {
        ...updated,
        observationsCount: updated._count.observations,
      },
      transition: {
        from: previousStatus,
        to: targetStatus,
        action: auditAction,
        executedBy: actor.fullName || actor.email || actor.id,
        timestamp: new Date(),
        reason: metadata?.reason,
      },
    };
  }

  /**
   * Convenience method to withdraw a dataset with mandatory revocation reason.
   */
  public static async withdrawDataset(
    datasetId: string,
    reason: string,
    actor: ActorContext,
    notes?: string,
    req?: Request
  ): Promise<TransitionResult> {
    return await this.transitionStatus(
      datasetId,
      StatisticalPublicationStatus.WITHDRAWN,
      actor,
      { reason, notes },
      req
    );
  }

  /**
   * Retrieves chronological lifecycle audit history for a dataset.
   */
  public static async getDatasetHistory(datasetId: string, actor: ActorContext) {
    // Check permission to view dataset first
    const dataset = await this.getDatasetById(datasetId, actor);

    const auditData = await AuditService.getLogs({
      entityType: 'StatisticalDataset',
      entityId: datasetId,
      limit: 100,
    });


    return {
      dataset: {
        id: dataset.id,
        datasetCode: dataset.datasetCode,
        name: dataset.name,
        currentStatus: dataset.publicationStatus,
        isOfficial: dataset.isOfficial,
        isPublished: dataset.isPublished,
      },
      history: auditData.logs.map((log: any) => ({
        id: log.id,
        action: log.action,
        timestamp: log.createdAt,
        actor: log.user ? { id: log.user.id, name: log.user.fullName, role: log.user.role } : null,
        beforeState: log.beforeState,
        afterState: log.afterState,
        reason: log.afterState?.reason || null,
        notes: log.afterState?.notes || null,
      })),
    };
  }

  /**
   * Maps publication status to authoritative audit action name.
   */
  private static getAuditActionForStatus(status: StatisticalPublicationStatus): string {
    switch (status) {
      case StatisticalPublicationStatus.VALIDATED:
        return 'STATISTICAL_DATASET_VALIDATED';
      case StatisticalPublicationStatus.OFFICIAL:
        return 'STATISTICAL_DATASET_OFFICIALIZED';
      case StatisticalPublicationStatus.PUBLISHED:
        return 'STATISTICAL_DATASET_PUBLISHED';
      case StatisticalPublicationStatus.WITHDRAWN:
        return 'STATISTICAL_DATASET_WITHDRAWN';
      case StatisticalPublicationStatus.DRAFT:
      default:
        return 'STATISTICAL_DATASET_STATUS_UPDATED';
    }
  }
}
