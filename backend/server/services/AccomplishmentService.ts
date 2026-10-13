import { AppError } from '../lib/errors';
import { requireReadScope } from '../lib/readScope';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError, OfficeScopeError } from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { FALLBACK_ACCOMPLISHMENTS } from '../lib/fallbackStore';

const MEMORY_ACCOMPLISHMENTS: any[] = JSON.parse(JSON.stringify(FALLBACK_ACCOMPLISHMENTS));

export class AccomplishmentService {
  public static async getAccomplishments(
    params: {
      year?: number;
      quarter?: number;
      programId?: string;
      officeId?: string;
    },
    actorUser?: { id: string; role: Role; officeId: string | null },
    options: { strict?: boolean } = {}
  ) {
    if (options.strict) requireReadScope(actorUser);
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      let filtered = [...MEMORY_ACCOMPLISHMENTS];
      if (params.year) filtered = filtered.filter((a) => a.fiscalYear === Number(params.year));
      if (params.quarter) filtered = filtered.filter((a) => a.quarter === Number(params.quarter));
      return filtered;
    }

    const where: any = {};

    if (params.year) {
      where.fiscalYear = Number(params.year);
    }
    if (params.quarter) {
      where.quarter = Number(params.quarter);
    }
    if (params.programId) {
      where.programId = params.programId;
    }

    if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
      where.OR = [
        { program: { officeId: actorUser.officeId } },
        { gadPlanItem: { gadPlan: { officeId: actorUser.officeId } } },
      ];
    } else if (params.officeId) {
      where.OR = [
        { program: { officeId: params.officeId } },
        { gadPlanItem: { gadPlan: { officeId: params.officeId } } },
      ];
    }

    try {
      const accs = await prisma.gADAccomplishment.findMany({
        where,
        include: {
          program: { include: { office: true } },
          gadPlanItem: { include: { gadPlan: { include: { office: true } } } },
          attachments: true,
          createdBy: { select: { id: true, fullName: true } },
        },
        orderBy: [{ fiscalYear: 'desc' }, { quarter: 'desc' }, { createdAt: 'desc' }],
      });

      return accs.map((acc) => ({
        ...acc,
        actualBudgetUsed: Number(acc.actualBudgetUsed),
        actualBeneficiaryMale: acc.actualMale,
        actualBeneficiaryFemale: acc.actualFemale,
        createdByName: acc.createdBy?.fullName || 'System',
        gadPlan: acc.gadPlanItem
          ? {
              id: acc.gadPlanItem.id,
              year: acc.gadPlanItem.gadPlan.fiscalYear,
              office: acc.gadPlanItem.gadPlan.office.code || acc.gadPlanItem.gadPlan.office.name,
              activity: acc.gadPlanItem.activity,
              performanceIndicator: acc.gadPlanItem.performanceIndicator,
              budget: Number(acc.gadPlanItem.budget),
            }
          : acc.program
          ? {
              id: acc.program.id,
              year: acc.program.fiscalYear,
              office: acc.program.office.code || acc.program.office.name,
              activity: acc.program.title,
              performanceIndicator: acc.program.description || 'Target Program',
              budget: Number(acc.program.budgetTarget),
            }
          : null,
      }));
    } catch {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      let filtered = [...MEMORY_ACCOMPLISHMENTS];
      if (params.year) filtered = filtered.filter((a) => a.fiscalYear === Number(params.year));
      if (params.quarter) filtered = filtered.filter((a) => a.quarter === Number(params.quarter));
      return filtered;
    }
  }

  public static async createAccomplishment(
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      const created = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gadPlanItemId: data.gadPlanId || null,
        programId: data.programId || null,
        fiscalYear: parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10),
        quarter: data.quarter ? parseInt(String(data.quarter), 10) : 1,
        actualOutput: data.actualOutput.trim(),
        actualMale: parseInt(String(data.actualMale || data.actualBeneficiaryMale || '0'), 10),
        actualFemale: parseInt(String(data.actualFemale || data.actualBeneficiaryFemale || '0'), 10),
        actualBeneficiaryMale: parseInt(String(data.actualMale || data.actualBeneficiaryMale || '0'), 10),
        actualBeneficiaryFemale: parseInt(String(data.actualFemale || data.actualBeneficiaryFemale || '0'), 10),
        actualBudgetUsed: parseFloat(String(data.actualBudgetUsed || '0')),
        outputSummary: data.outputSummary || null,
        remarks: data.remarks || null,
        varianceExplanation: data.varianceExplanation || null,
        createdById: actorUser.id,
        createdByName: 'Current User',
        attachments: [],
        createdAt: new Date(),
      };
      MEMORY_ACCOMPLISHMENTS.unshift(created);
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_CREATED',
        entityType: 'GADAccomplishment',
        entityId: created.id,
        afterState: created,
        req,
      });
      return created;
    }

    let targetPlanItemId: string | null = null;
    let targetProgramId: string | null = data.programId || null;

    if (data.gadPlanId) {
      const planItem = await prisma.gADPlanItem.findUnique({
        where: { id: String(data.gadPlanId) },
        include: { gadPlan: true },
      });

      if (planItem) {
        if (actorUser.role === Role.ENCODER && planItem.gadPlan.officeId !== actorUser.officeId) {
          throw new OfficeScopeError('Encoders can only encode accomplishments for their own office');
        }
        targetPlanItemId = planItem.id;
        targetProgramId = planItem.programId;
      } else {
        const program = await prisma.program.findUnique({ where: { id: String(data.gadPlanId) } });
        if (program) {
          if (actorUser.role === Role.ENCODER && program.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders can only encode accomplishments for their own office');
          }
          targetProgramId = program.id;
        }
      }
    }

    if (targetProgramId && actorUser.role === Role.ENCODER) {
      const program = await prisma.program.findUnique({ where: { id: targetProgramId } });
      if (program && program.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot attach accomplishments to other offices\' programs');
      }
    }

    const acc = await prisma.$transaction(async (tx) => {
      const created = await tx.gADAccomplishment.create({
        data: {
          gadPlanItemId: targetPlanItemId,
          programId: targetProgramId,
          fiscalYear: parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10),
          quarter: data.quarter ? parseInt(String(data.quarter), 10) : 1,
          actualOutput: data.actualOutput.trim(),
          actualMale: parseInt(String(data.actualMale || data.actualBeneficiaryMale || '0'), 10),
          actualFemale: parseInt(String(data.actualFemale || data.actualBeneficiaryFemale || '0'), 10),
          actualBudgetUsed: parseFloat(String(data.actualBudgetUsed || '0')),
          outputSummary: data.outputSummary || null,
          remarks: data.remarks || null,
          varianceExplanation: data.varianceExplanation || null,
          createdById: actorUser.id,
        },
        include: {
          program: { include: { office: true } },
          gadPlanItem: { include: { gadPlan: { include: { office: true } } } },
          attachments: true,
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_CREATED',
        entityType: 'GADAccomplishment',
        entityId: created.id,
        afterState: { id: created.id, actualOutput: created.actualOutput, actualBudgetUsed: Number(created.actualBudgetUsed) },
        req,
      });

      return created;
    });

    return {
      ...acc,
      actualBudgetUsed: Number(acc.actualBudgetUsed),
      actualBeneficiaryMale: acc.actualMale,
      actualBeneficiaryFemale: acc.actualFemale,
    };
  }

  public static async updateAccomplishment(
    id: string,
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      const idx = MEMORY_ACCOMPLISHMENTS.findIndex((a) => a.id === id);
      if (idx === -1) throw new NotFoundError('Accomplishment');
      MEMORY_ACCOMPLISHMENTS[idx] = { ...MEMORY_ACCOMPLISHMENTS[idx], ...data };
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_UPDATED',
        entityType: 'GADAccomplishment',
        entityId: id,
        req,
      });
      return MEMORY_ACCOMPLISHMENTS[idx];
    }

    const existing = await prisma.gADAccomplishment.findUnique({
      where: { id },
      include: {
        program: true,
        gadPlanItem: { include: { gadPlan: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Accomplishment');
    }

    if (actorUser.role === Role.ENCODER) {
      const officeId = existing.program?.officeId || existing.gadPlanItem?.gadPlan?.officeId;
      if (officeId && officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot modify accomplishments of other offices');
      }
    }

    const updateData: any = {};
    if (data.actualOutput !== undefined) updateData.actualOutput = data.actualOutput.trim();
    if (data.actualMale !== undefined || data.actualBeneficiaryMale !== undefined) {
      updateData.actualMale = parseInt(String(data.actualMale || data.actualBeneficiaryMale), 10);
    }
    if (data.actualFemale !== undefined || data.actualBeneficiaryFemale !== undefined) {
      updateData.actualFemale = parseInt(String(data.actualFemale || data.actualBeneficiaryFemale), 10);
    }
    if (data.actualBudgetUsed !== undefined) {
      updateData.actualBudgetUsed = parseFloat(String(data.actualBudgetUsed));
    }
    if (data.outputSummary !== undefined) updateData.outputSummary = data.outputSummary;
    if (data.remarks !== undefined) updateData.remarks = data.remarks;
    if (data.varianceExplanation !== undefined) updateData.varianceExplanation = data.varianceExplanation;
    if (data.quarter !== undefined) updateData.quarter = parseInt(String(data.quarter), 10);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.gADAccomplishment.update({
        where: { id },
        data: updateData,
        include: {
          program: { include: { office: true } },
          gadPlanItem: { include: { gadPlan: { include: { office: true } } } },
          attachments: true,
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_UPDATED',
        entityType: 'GADAccomplishment',
        entityId: id,
        beforeState: { id: existing.id, actualOutput: existing.actualOutput },
        afterState: { id: result.id, actualOutput: result.actualOutput },
        req,
      });

      return result;
    });

    return {
      ...updated,
      actualBudgetUsed: Number(updated.actualBudgetUsed),
      actualBeneficiaryMale: updated.actualMale,
      actualBeneficiaryFemale: updated.actualFemale,
    };
  }

  public static async deleteAccomplishment(
    id: string,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      const idx = MEMORY_ACCOMPLISHMENTS.findIndex((a) => a.id === id);
      if (idx === -1) throw new NotFoundError('Accomplishment');
      MEMORY_ACCOMPLISHMENTS.splice(idx, 1);
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_DELETED',
        entityType: 'GADAccomplishment',
        entityId: id,
        req,
      });
      return { message: 'Accomplishment record deleted' };
    }

    const existing = await prisma.gADAccomplishment.findUnique({
      where: { id },
      include: {
        program: true,
        gadPlanItem: { include: { gadPlan: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Accomplishment');
    }

    if (actorUser.role === Role.ENCODER) {
      const officeId = existing.program?.officeId || existing.gadPlanItem?.gadPlan?.officeId;
      if (officeId && officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot delete accomplishments of other offices');
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.gADAccomplishment.delete({ where: { id } });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'ACCOMPLISHMENT_DELETED',
        entityType: 'GADAccomplishment',
        entityId: id,
        beforeState: existing,
        req,
      });
    });

    return { message: 'Accomplishment record deleted' };
  }

  /**
   * Public accomplishment feed with zero PII
   */
  public static async getPublicAccomplishments(params?: { year?: number; quarter?: number }) {
    if (!isDatabaseConnected()) {
      let list = FALLBACK_ACCOMPLISHMENTS;
      if (params?.year) {
        list = list.filter((a) => a.fiscalYear === Number(params.year));
      }
      if (params?.quarter) {
        list = list.filter((a) => a.quarter === Number(params.quarter));
      }
      return list;
    }

    try {
      const where: any = {};
      if (params?.year) where.fiscalYear = Number(params.year);
      if (params?.quarter) where.quarter = Number(params.quarter);

      const accomplishments = await prisma.gADAccomplishment.findMany({
        where,
        select: {
          id: true,
          fiscalYear: true,
          quarter: true,
          actualOutput: true,
          actualMale: true,
          actualFemale: true,
          actualBudgetUsed: true,
          outputSummary: true,
          program: {
            select: {
              id: true,
              title: true,
              sector: true,
              office: { select: { code: true, name: true } },
            },
          },
          gadPlanItem: {
            select: {
              id: true,
              activity: true,
              responsibleOffice: true,
            },
          },
        },
        orderBy: [{ fiscalYear: 'desc' }, { quarter: 'desc' }],
      });

      return accomplishments.map((a) => ({
        id: a.id,
        fiscalYear: a.fiscalYear,
        quarter: a.quarter,
        activityTitle: a.gadPlanItem?.activity || a.program?.title || 'GAD Project Activity',
        office: a.program?.office?.name || a.gadPlanItem?.responsibleOffice || 'LGU Talibon',
        actualOutput: a.actualOutput,
        actualBudgetUsed: Number(a.actualBudgetUsed),
        actualMale: a.actualMale,
        actualFemale: a.actualFemale,
        totalBeneficiaries: a.actualMale + a.actualFemale,
        outputSummary: a.outputSummary,
      }));
    } catch {
      let list = FALLBACK_ACCOMPLISHMENTS;
      if (params?.year) {
        list = list.filter((a) => a.fiscalYear === Number(params.year));
      }
      if (params?.quarter) {
        list = list.filter((a) => a.quarter === Number(params.quarter));
      }
      return list;
    }
  }
}
