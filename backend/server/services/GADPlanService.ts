import { requireReadScope } from '../lib/readScope';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { GADPlanStatus, Role } from '@prisma/client';
import { NotFoundError, OfficeScopeError, ForbiddenError, ValidationError, ConflictError, AppError } from '../lib/errors';
import { AuditService } from './AuditService';
import { GadBudgetValidator } from './GadBudgetValidator';
import { HgdgScoringService } from './HgdgScoringService';
import { Request } from 'express';
import { FALLBACK_GAD_PLANS } from '../lib/fallbackStore';

const MEMORY_GAD_PLANS: any[] = JSON.parse(JSON.stringify(FALLBACK_GAD_PLANS));

function assertGadWriter(actor: { role: Role; officeId: string | null }) {
  if (![Role.ADMIN, Role.SUPER_ADMIN, Role.ENCODER].includes(actor.role as any)) throw new ForbiddenError('GAD write access required.');
  if (actor.role === Role.ENCODER && !actor.officeId) throw new OfficeScopeError('Encoder office assignment required.');
  if (process.env.NODE_ENV === 'production' && !isDatabaseConnected()) throw new AppError('GAD storage temporarily unavailable', 503);
}

function assertEditablePlan(plan: any, actor: { role: Role; officeId: string | null }) {
  assertGadWriter(actor);
  if (actor.role === Role.ENCODER && plan.officeId !== actor.officeId) throw new OfficeScopeError('Encoders cannot modify plans of other offices.');
  if (![GADPlanStatus.DRAFT, GADPlanStatus.REVISED].includes(plan.status)) throw new ForbiddenError('Only DRAFT or REVISED GAD Plans can be edited.');
}

async function lockEditablePlan(tx: any, planId: string, actor: { role: Role; officeId: string | null }) {
  const changed = await tx.gADPlan.updateMany({ where: { id: planId, status: { in: ['DRAFT', 'REVISED'] },
    ...(actor.role === Role.ENCODER ? { officeId: actor.officeId } : {}) }, data: { updatedAt: new Date() } });
  if (changed.count !== 1) throw new ForbiddenError('GAD Plan is locked or outside your office scope.');
}

// â”€â”€â”€ State Machine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Allowed transitions per role. ENCODER may only submit/resubmit.
const ALLOWED_TRANSITIONS: Record<GADPlanStatus, GADPlanStatus[]> = {
  [GADPlanStatus.DRAFT]: [GADPlanStatus.SUBMITTED],
  [GADPlanStatus.SUBMITTED]: [GADPlanStatus.APPROVED, GADPlanStatus.REVISED],
  [GADPlanStatus.REVISED]: [GADPlanStatus.SUBMITTED],
  [GADPlanStatus.APPROVED]: [],
};

function assertValidTransition(current: GADPlanStatus, next: GADPlanStatus): void {
  if (current === next) {
    throw new ValidationError(`GAD Plan is already in ${current} status.`);
  }
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  if (!allowed.includes(next)) {
    throw new ValidationError(`Transition from ${current} to ${next} is not permitted.`);
  }
}

function assertTransitionRole(
  next: GADPlanStatus,
  actorRole: Role,
  actorOfficeId: string | null,
  planOfficeId: string
): void {
  // ENCODER can only submit (DRAFT -> SUBMITTED, REVISED -> SUBMITTED)
  if (actorRole === Role.ENCODER) {
    if (next !== GADPlanStatus.SUBMITTED) {
      throw new ForbiddenError('ENCODER may only submit a GAD Plan, not change its status otherwise.');
    }
    if (!actorOfficeId || actorOfficeId !== planOfficeId) {
      throw new OfficeScopeError('Encoders cannot modify plans of other offices.');
    }
    return;
  }
  // VIEWER cannot perform any transitions
  if (actorRole === Role.VIEWER) {
    throw new ForbiddenError('VIEWER role cannot perform status transitions.');
  }
  // ADMIN / SUPER_ADMIN may do SUBMITTED->APPROVED, SUBMITTED->REVISED
}

// ─── Memory-store helpers ────────────────────────────────────────────────────

function findPlanInMemory(id: string): any | undefined {
  // Direct plan ID match
  let plan = MEMORY_GAD_PLANS.find((p) => p.id === id);
  if (plan) return plan;
  // Item ID → find parent plan
  for (const p of MEMORY_GAD_PLANS) {
    if ((p.items || []).find((i: any) => i.id === id)) return p;
  }
  return undefined;
}

export class GADPlanService {
  public static async getGADPlans(
    params: {
      year?: number;
      officeId?: string;
      office?: string;
      status?: string;
    },
    actorUser?: { id: string; role: Role; officeId: string | null },
    options: { strict?: boolean } = {}
  ) {
    if (options.strict) requireReadScope(actorUser);
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      let filteredPlans = [...MEMORY_GAD_PLANS];
      if (params.year) filteredPlans = filteredPlans.filter((p) => p.fiscalYear === Number(params.year));
      if (params.officeId) filteredPlans = filteredPlans.filter((p) => p.officeId === params.officeId);
      if (params.status) filteredPlans = filteredPlans.filter((p) => p.status === params.status);
      if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
        filteredPlans = filteredPlans.filter((p) => p.officeId === actorUser.officeId);
      }

      const itemsFlat = filteredPlans.flatMap((plan) =>
        (plan.items || []).map((item: any) => ({
          ...item,
          planId: plan.id,
          year: plan.fiscalYear,
          fiscalYear: plan.fiscalYear,
          office: plan.office,
          officeId: plan.officeId,
          officeName: plan.officeName,
          status: plan.status,
          accomplishments: item.accomplishments || [],
        }))
      );

      return {
        plans: filteredPlans,
        items: itemsFlat,
      };
    }

    const where: any = {};

    if (params.year) {
      where.fiscalYear = Number(params.year);
    }

    if (params.officeId) {
      where.officeId = params.officeId;
    } else if (params.office) {
      where.office = {
        OR: [{ code: params.office }, { name: params.office }, { id: params.office }],
      };
    }

    if (params.status) {
      where.status = params.status as GADPlanStatus;
    }

    if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
      where.officeId = actorUser.officeId;
    }

    try {
      const plans = await prisma.gADPlan.findMany({
        where,
        include: {
          office: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          items: {
            include: {
              program: { select: { id: true, title: true } },
              accomplishments: { include: { attachments: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
      });

      // Flatten into item-level view for standard GPB consumption while retaining plan metadata
      const itemsFlat = plans.flatMap((plan) => {
        if (plan.items.length === 0) {
          return [
            {
              id: plan.id,
              planId: plan.id,
              year: plan.fiscalYear,
              fiscalYear: plan.fiscalYear,
              office: plan.office.code || plan.office.name,
              officeId: plan.officeId,
              officeName: plan.office.name,
              genderIssue: '',
              causeOfIssue: '',
              gadResult: '',
              activity: 'No activity items recorded',
              performanceIndicator: '',
              targetGroup: '',
              timeline: `FY ${plan.fiscalYear}`,
              responsibleOffice: plan.office.code || plan.office.name,
              budget: Number(plan.gadBudget),
              fundSource: '',
              status: plan.status,
              accomplishments: [],
              createdAt: plan.createdAt,
              updatedAt: plan.updatedAt,
            },
          ];
        }

        return plan.items.map((item) => ({
          id: item.id,
          planId: plan.id,
          year: plan.fiscalYear,
          fiscalYear: plan.fiscalYear,
          office: plan.office.code || plan.office.name,
          officeId: plan.officeId,
          officeName: plan.office.name,
          genderIssue: item.genderIssue,
          causeOfIssue: item.causeOfIssue || '',
          gadResult: item.gadResult,
          activity: item.activity,
          performanceIndicator: item.performanceIndicator,
          targetGroup: item.targetGroup,
          timeline: item.timeline,
          responsibleOffice: item.responsibleOffice,
          budget: Number(item.budget),
          fundSource: item.fundSource,
          hgdgScore: item.hgdgScore ? Number(item.hgdgScore) : null,
          attributedPercentage: item.attributedPercentage ? Number(item.attributedPercentage) : null,
          status: plan.status,
          programId: item.programId,
          programTitle: item.program?.title || null,
          accomplishments: item.accomplishments.map((acc) => ({
            ...acc,
            actualBudgetUsed: Number(acc.actualBudgetUsed),
          })),
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        }));
      });

      return {
        plans: plans.map((p) => ({
          ...p,
          totalBudget: Number(p.totalBudget),
          gadBudget: Number(p.gadBudget),
          mandatoryGADPercentage: Number(p.mandatoryGADPercentage),
        })),
        items: itemsFlat,
      };
    } catch {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      let filtered = [...MEMORY_GAD_PLANS];
      if (params.year) filtered = filtered.filter((p) => p.fiscalYear === Number(params.year));
      if (params.officeId) filtered = filtered.filter((p) => p.officeId === params.officeId);
      if (params.status) filtered = filtered.filter((p) => p.status === params.status);
      if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
        filtered = filtered.filter((p) => p.officeId === actorUser.officeId);
      }
      return {
        plans: filtered,
        items: filtered.flatMap((p) => p.items || []),
      };
    }
  }

  public static async getGADPlanById(id: string) {
    if (!isDatabaseConnected()) {
      const plan = MEMORY_GAD_PLANS.find((p) => p.id === id);
      if (plan) return plan;
      for (const p of MEMORY_GAD_PLANS) {
        const item = (p.items || []).find((i: any) => i.id === id);
        if (item) {
          return {
            ...item,
            planId: p.id,
            year: p.fiscalYear,
            fiscalYear: p.fiscalYear,
            office: p.office,
            status: p.status,
          };
        }
      }
      throw new NotFoundError('GAD Plan or Item');
    }

    try {
      // Check if ID is a plan ID or plan item ID
      const plan = await prisma.gADPlan.findUnique({
        where: { id },
        include: {
          office: true,
          createdBy: true,
          items: {
            include: {
              program: true,
              accomplishments: { include: { attachments: true } },
            },
          },
        },
      });

      if (plan) {
        return {
          ...plan,
          totalBudget: Number(plan.totalBudget),
          gadBudget: Number(plan.gadBudget),
          mandatoryGADPercentage: Number(plan.mandatoryGADPercentage),
        };
      }

      const item = await prisma.gADPlanItem.findUnique({
        where: { id },
        include: {
          gadPlan: { include: { office: true } },
          program: true,
          accomplishments: true,
        },
      });

      if (!item) {
        throw new NotFoundError('GAD Plan or Item');
      }

      return {
        id: item.id,
        planId: item.gadPlanId,
        year: item.gadPlan.fiscalYear,
        fiscalYear: item.gadPlan.fiscalYear,
        office: item.gadPlan.office.code || item.gadPlan.office.name,
        genderIssue: item.genderIssue,
        causeOfIssue: item.causeOfIssue,
        gadResult: item.gadResult,
        activity: item.activity,
        performanceIndicator: item.performanceIndicator,
        targetGroup: item.targetGroup,
        timeline: item.timeline,
        responsibleOffice: item.responsibleOffice,
        budget: Number(item.budget),
        fundSource: item.fundSource,
        hgdgScore: item.hgdgScore ? Number(item.hgdgScore) : null,
        attributedPercentage: item.attributedPercentage ? Number(item.attributedPercentage) : null,
        status: item.gadPlan.status,
        programId: item.programId,
        accomplishments: item.accomplishments,
      };
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      const plan = MEMORY_GAD_PLANS.find((p) => p.id === id);
      if (plan) return plan;
      for (const p of MEMORY_GAD_PLANS) {
        const item = (p.items || []).find((i: any) => i.id === id);
        if (item) {
          return {
            ...item,
            planId: p.id,
            year: p.fiscalYear,
            fiscalYear: p.fiscalYear,
            office: p.office,
            status: p.status,
          };
        }
      }
      throw new NotFoundError('GAD Plan or Item');
    }
  }

  public static async createGADPlan(
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    assertGadWriter(actorUser);
    if (data.status && data.status !== GADPlanStatus.DRAFT) throw new ValidationError('New GAD Plans must start in DRAFT.');
    let effectiveOfficeId = data.officeId;

    if (actorUser.role === Role.ENCODER) {
      effectiveOfficeId = actorUser.officeId;
    }

    const fYear = parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10);
    const itemBudget = parseFloat(String(data.budget || '0'));

    if (!isDatabaseConnected()) {
      let activePlan = MEMORY_GAD_PLANS.find((p) => p.officeId === effectiveOfficeId && p.fiscalYear === fYear);
      if (activePlan) assertEditablePlan(activePlan, actorUser);
      if (!activePlan) {
        activePlan = {
          id: `plan-${Date.now()}`,
          fiscalYear: fYear,
          officeId: effectiveOfficeId || 'off-mswdo',
          office: effectiveOfficeId || 'MSWDO',
          officeName: 'Municipal Social Welfare and Development Office',
          totalBudget: data.totalBudget ? parseFloat(String(data.totalBudget)) : itemBudget * 20,
          gadBudget: itemBudget,
          status: data.status || 'DRAFT',
          items: [],
        };
        MEMORY_GAD_PLANS.unshift(activePlan);
      } else if (itemBudget > 0) {
        activePlan.gadBudget += itemBudget;
      }

      const createdItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        gadPlanId: activePlan.id,
        planId: activePlan.id,
        genderIssue: data.genderIssue || 'Not Specified',
        causeOfIssue: data.causeOfIssue || null,
        gadResult: data.gadResult || 'Gender Equality Objective',
        activity: data.activity || 'GAD Activity',
        performanceIndicator: data.performanceIndicator || 'Target metrics accomplished',
        targetGroup: data.targetGroup || 'General beneficiaries',
        timeline: data.timeline || `FY ${fYear}`,
        responsibleOffice: data.responsibleOffice || activePlan.office,
        budget: itemBudget,
        fundSource: data.fundSource || 'General Fund (5% GAD)',
        status: activePlan.status,
        year: fYear,
        fiscalYear: fYear,
        office: activePlan.office,
        officeId: activePlan.officeId,
      };

      activePlan.items.push(createdItem);

      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'GAD_PLAN_ITEM_CREATED',
        entityType: 'GADPlanItem',
        entityId: createdItem.id,
        afterState: createdItem,
        req,
      });

      return createdItem;
    }

    if (!effectiveOfficeId && data.office) {
      const foundOffice = await prisma.office.findFirst({
        where: { OR: [{ code: data.office }, { name: data.office }] },
      });
      if (foundOffice) effectiveOfficeId = foundOffice.id;
    }

    if (!effectiveOfficeId) {
      const defaultOffice = await prisma.office.findFirst();
      effectiveOfficeId = defaultOffice?.id;
    }

    // Create or update plan and item in transaction
    const { plan, item } = await prisma.$transaction(async (tx) => {
      let activePlan = await tx.gADPlan.findFirst({
        where: { officeId: effectiveOfficeId!, fiscalYear: fYear },
        include: { office: true },
      });

      if (activePlan) await lockEditablePlan(tx, activePlan.id, actorUser);
      if (!activePlan) {
        activePlan = await tx.gADPlan.create({
          data: {
            officeId: effectiveOfficeId!,
            fiscalYear: fYear,
            gadBudget: itemBudget,
            totalBudget: data.totalBudget ? parseFloat(String(data.totalBudget)) : itemBudget * 20,
            mandatoryGADPercentage: 5.0,
            status: (data.status as GADPlanStatus) || GADPlanStatus.DRAFT,
            createdById: actorUser.id,
          },
          include: { office: true },
        });
      } else if (itemBudget > 0) {
        activePlan = await tx.gADPlan.update({
          where: { id: activePlan.id },
          data: { gadBudget: { increment: itemBudget } },
          include: { office: true },
        });
      }

      const createdItem = await tx.gADPlanItem.create({
        data: {
          gadPlanId: activePlan.id,
          programId: data.programId || null,
          genderIssue: data.genderIssue || 'Not Specified',
          causeOfIssue: data.causeOfIssue || null,
          gadResult: data.gadResult || 'Gender Equality Objective',
          activity: data.activity || 'GAD Activity',
          performanceIndicator: data.performanceIndicator || 'Target metrics accomplished',
          targetGroup: data.targetGroup || 'General beneficiaries',
          timeline: data.timeline || `FY ${fYear}`,
          responsibleOffice: data.responsibleOffice || activePlan.office.code || activePlan.office.name,
          budget: itemBudget,
          fundSource: data.fundSource || 'General Fund (5% GAD)',
          hgdgScore: data.hgdgScore ? parseFloat(String(data.hgdgScore)) : null,
          attributedPercentage: data.attributedPercentage ? parseFloat(String(data.attributedPercentage)) : null,
        },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'GAD_PLAN_ITEM_CREATED',
        entityType: 'GADPlanItem',
        entityId: createdItem.id,
        afterState: { id: createdItem.id, planId: activePlan.id, activity: createdItem.activity, budget: Number(createdItem.budget) },
        req,
      });

      return { plan: activePlan, item: createdItem };
    });

    return {
      id: item.id,
      planId: plan.id,
      year: plan.fiscalYear,
      fiscalYear: plan.fiscalYear,
      office: plan.office.code || plan.office.name,
      genderIssue: item.genderIssue,
      causeOfIssue: item.causeOfIssue,
      gadResult: item.gadResult,
      activity: item.activity,
      performanceIndicator: item.performanceIndicator,
      targetGroup: item.targetGroup,
      timeline: item.timeline,
      responsibleOffice: item.responsibleOffice,
      budget: Number(item.budget),
      fundSource: item.fundSource,
      status: plan.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  public static async updateGADPlan(
    id: string,
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    assertGadWriter(actorUser);
    // Status changes go through the shared workflow.
    if (data.status !== undefined) {
      throw new ForbiddenError('Use the GAD Plan workflow endpoint to change status.');
    }

    if (!isDatabaseConnected()) {
      for (const p of MEMORY_GAD_PLANS) {
        if (p.id === id) {
          assertEditablePlan(p, actorUser);
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
          }
          // ENCODER cannot edit while plan is in SUBMITTED state
          if (actorUser.role === Role.ENCODER && p.status === GADPlanStatus.SUBMITTED) {
            throw new ForbiddenError('ENCODER cannot modify a GAD Plan that is currently under review (SUBMITTED).');
          }
          if (data.status && (actorUser.role === Role.ADMIN || actorUser.role === Role.SUPER_ADMIN)) {
            p.status = data.status;
          }
          await AuditService.logActionTx(null, {
            userId: actorUser.id,
            action: 'GAD_PLAN_UPDATED',
            entityType: 'GADPlan',
            entityId: id,
            req,
          });
          return p;
        }
        const itemIdx = (p.items || []).findIndex((i: any) => i.id === id);
        if (itemIdx !== -1) {
          assertEditablePlan(p, actorUser);
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
          }
          // ENCODER cannot edit items while plan is SUBMITTED
          if (actorUser.role === Role.ENCODER && p.status === GADPlanStatus.SUBMITTED) {
            throw new ForbiddenError('ENCODER cannot modify items of a GAD Plan that is currently under review (SUBMITTED).');
          }
          p.items[itemIdx] = { ...p.items[itemIdx], ...data };
          if (data.status && (actorUser.role === Role.ADMIN || actorUser.role === Role.SUPER_ADMIN)) {
            p.status = data.status;
          }
          await AuditService.logActionTx(null, {
            userId: actorUser.id,
            action: 'GAD_PLAN_ITEM_UPDATED',
            entityType: 'GADPlanItem',
            entityId: id,
            req,
          });
          return p.items[itemIdx];
        }
      }
      throw new NotFoundError('GAD Plan or Item');
    }

    // Check if ID refers to a GADPlanItem or a GADPlan
    const existingItem = await prisma.gADPlanItem.findUnique({
      where: { id },
      include: { gadPlan: { include: { office: true } } },
    });

    if (existingItem) {
      assertEditablePlan(existingItem.gadPlan, actorUser);
      if (actorUser.role === Role.ENCODER && existingItem.gadPlan.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
      }

      const updateData: any = {};
      if (data.genderIssue !== undefined) updateData.genderIssue = data.genderIssue;
      if (data.causeOfIssue !== undefined) updateData.causeOfIssue = data.causeOfIssue;
      if (data.gadResult !== undefined) updateData.gadResult = data.gadResult;
      if (data.activity !== undefined) updateData.activity = data.activity;
      if (data.performanceIndicator !== undefined) updateData.performanceIndicator = data.performanceIndicator;
      if (data.targetGroup !== undefined) updateData.targetGroup = data.targetGroup;
      if (data.timeline !== undefined) updateData.timeline = data.timeline;
      if (data.responsibleOffice !== undefined) updateData.responsibleOffice = data.responsibleOffice;
      if (data.budget !== undefined) updateData.budget = parseFloat(String(data.budget));
      if (data.fundSource !== undefined) updateData.fundSource = data.fundSource;
      if (data.programId !== undefined) updateData.programId = data.programId;
      if (data.hgdgScore !== undefined) updateData.hgdgScore = data.hgdgScore ? parseFloat(String(data.hgdgScore)) : null;
      if (data.attributedPercentage !== undefined) {
        updateData.attributedPercentage = data.attributedPercentage ? parseFloat(String(data.attributedPercentage)) : null;
      }

      const updated = await prisma.$transaction(async (tx) => {
        await lockEditablePlan(tx, existingItem.gadPlanId, actorUser);
        const itemRes = await tx.gADPlanItem.update({
          where: { id },
          data: updateData,
          include: { gadPlan: { include: { office: true } } },
        });

        if (data.status && actorUser.role === Role.ADMIN) {
          await tx.gADPlan.update({
            where: { id: itemRes.gadPlanId },
            data: { status: data.status as GADPlanStatus },
          });
        }

        await AuditService.logActionTx(tx, {
          userId: actorUser.id,
          action: 'GAD_PLAN_ITEM_UPDATED',
          entityType: 'GADPlanItem',
          entityId: itemRes.id,
          beforeState: { id: existingItem.id, activity: existingItem.activity },
          afterState: { id: itemRes.id, activity: itemRes.activity },
          req,
        });

        return itemRes;
      });

      return {
        id: updated.id,
        planId: updated.gadPlanId,
        year: updated.gadPlan.fiscalYear,
        fiscalYear: updated.gadPlan.fiscalYear,
        office: updated.gadPlan.office.code || updated.gadPlan.office.name,
        genderIssue: updated.genderIssue,
        causeOfIssue: updated.causeOfIssue,
        gadResult: updated.gadResult,
        activity: updated.activity,
        performanceIndicator: updated.performanceIndicator,
        targetGroup: updated.targetGroup,
        timeline: updated.timeline,
        responsibleOffice: updated.responsibleOffice,
        budget: Number(updated.budget),
        fundSource: updated.fundSource,
        status: data.status || updated.gadPlan.status,
      };
    }

    // Otherwise, check if ID refers to GADPlan header
    const existingPlan = await prisma.gADPlan.findUnique({
      where: { id },
      include: { office: true },
    });

    if (!existingPlan) {
      throw new NotFoundError('GAD Plan or Item');
    }

    if (actorUser.role === Role.ENCODER && existingPlan.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
    }

    assertEditablePlan(existingPlan, actorUser);
    const planData: any = {};
    if (data.status) {
      if (
        data.status === GADPlanStatus.APPROVED &&
        actorUser.role !== Role.ADMIN &&
        actorUser.role !== Role.SUPER_ADMIN
      ) {
        throw new ForbiddenError('Only administrators can approve GAD Plans');
      }
      planData.status = data.status as GADPlanStatus;
    }
    if (data.totalBudget !== undefined) planData.totalBudget = parseFloat(String(data.totalBudget));
    if (data.gadBudget !== undefined) planData.gadBudget = parseFloat(String(data.gadBudget));

    const updatedPlan = await prisma.$transaction(async (tx) => {
      await lockEditablePlan(tx, existingPlan.id, actorUser);
      const planRes = await tx.gADPlan.update({
        where: { id },
        data: planData,
        include: { office: true },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'GAD_PLAN_STATUS_UPDATED',
        entityType: 'GADPlan',
        entityId: id,
        beforeState: { status: existingPlan.status },
        afterState: { status: planRes.status },
        req,
      });

      return planRes;
    });

    return {
      ...updatedPlan,
      totalBudget: Number(updatedPlan.totalBudget),
      gadBudget: Number(updatedPlan.gadBudget),
      mandatoryGADPercentage: Number(updatedPlan.mandatoryGADPercentage),
    };
  }

  public static async updatePlanStatus(
    id: string, status: GADPlanStatus,
    actorUser: { id: string; role: Role; officeId: string | null }, req?: Request
  ) {
    return this.transitionPlan(id, status, actorUser, req?.body?.remarks, false, undefined, req);
  }

  private static async transitionPlan(
    id: string, status: GADPlanStatus,
    actor: { id: string; role: Role; officeId: string | null },
    remarks?: string, forceApproval = false, overrideReason?: string, req?: Request
  ) {
    if (actor.role === Role.VIEWER) throw new ForbiddenError('VIEWER cannot change GAD Plan status.');
    if (actor.role === Role.ENCODER && status !== GADPlanStatus.SUBMITTED) {
      throw new ForbiddenError('ENCODER may only submit a GAD Plan.');
    }
    if (typeof forceApproval !== 'boolean') throw new ValidationError('forceApproval must be boolean.');
    for (const text of [remarks, overrideReason]) {
      if (text !== undefined && (typeof text !== 'string' || text.length > 2000)) throw new ValidationError('Workflow remarks must be text up to 2000 characters.');
    }
    const validatePlan = (plan: any) => {
      assertTransitionRole(status, actor.role, actor.officeId, plan.officeId);
      assertValidTransition(plan.status, status);
      if (status === GADPlanStatus.REVISED && !remarks?.trim()) throw new ValidationError('Revision remarks are required.');
      if (status === GADPlanStatus.APPROVED) {
        const validation = GadBudgetValidator.validate({
          fiscalYear: plan.fiscalYear, totalBudget: Number(plan.totalBudget ?? 0),
          explicitGadBudget: Number(plan.gadBudget ?? 0), officeId: plan.officeId,
        });
        if (!validation.isCompliant) {
          if (!forceApproval) throw new ValidationError(validation.errors[0] || 'Statutory GAD budget deficit.');
          if (!overrideReason?.trim()) throw new ValidationError('Deficit override approval requires an explicit justification reason.');
        }
      }
    };
    const after = { status, remarks: remarks?.trim() || null, forceApproval, overrideReason: overrideReason?.trim() || null };
    if (!isDatabaseConnected()) {
      if (process.env.NODE_ENV === 'production') throw new AppError('GAD storage temporarily unavailable', 503);
      const plan = findPlanInMemory(id);
      if (!plan) throw new NotFoundError('GAD Plan');
      validatePlan(plan);
      const beforeState = { status: plan.status };
      plan.status = status;
      if (status === GADPlanStatus.REVISED) plan.revisionRemarks = remarks;
      if (status === GADPlanStatus.SUBMITTED && remarks) plan.submissionRemarks = remarks;
      if (forceApproval) plan.overrideReason = overrideReason;
      await AuditService.logActionTx(null, { userId: actor.id, action: 'GAD_PLAN_STATUS_CHANGED', entityType: 'GADPlan',
        entityId: plan.id, beforeState, afterState: after, req });
      return plan;
    }
    try {
      return await prisma.$transaction(async tx => {
        const item = await tx.gADPlanItem.findUnique({ where: { id }, select: { gadPlanId: true } });
        const planId = item?.gadPlanId || id;
        const plan = await tx.gADPlan.findUnique({ where: { id: planId } });
        if (!plan) throw new NotFoundError('GAD Plan');
        validatePlan(plan);
        const changed = await tx.gADPlan.updateMany({
          where: { id: planId, status: plan.status, updatedAt: plan.updatedAt }, data: { status },
        });
        if (changed.count !== 1) throw new ConflictError('GAD Plan changed. Refresh before changing status.');
        // Audit failure must roll back the approval, including its override reason.
        await tx.auditLog.create({ data: { userId: actor.id, action: 'GAD_PLAN_STATUS_CHANGED',
          entityType: 'GADPlan', entityId: planId, beforeState: { status: plan.status }, afterState: after } });
        return tx.gADPlan.findUniqueOrThrow({ where: { id: planId } });
      }, { isolationLevel: 'Serializable' });
    } catch (error: any) {
      if (error?.code === 'P2034') throw new ConflictError('GAD Plan changed. Refresh before changing status.');
      throw error;
    }
  }

  public static async deleteGADPlan(
    id: string,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    assertGadWriter(actorUser);
    if (!isDatabaseConnected()) {
      for (let i = 0; i < MEMORY_GAD_PLANS.length; i++) {
        const p = MEMORY_GAD_PLANS[i];
        if (p.id === id) {
          assertEditablePlan(p, actorUser);
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot delete plans of other offices');
          }
          MEMORY_GAD_PLANS.splice(i, 1);
          await AuditService.logActionTx(null, {
            userId: actorUser.id,
            action: 'GAD_PLAN_DELETED',
            entityType: 'GADPlan',
            entityId: id,
            req,
          });
          return { message: 'Annual GAD Plan deleted' };
        }
        const itemIdx = (p.items || []).findIndex((it: any) => it.id === id);
        if (itemIdx !== -1) {
          assertEditablePlan(p, actorUser);
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot delete items belonging to other offices');
          }
          p.items.splice(itemIdx, 1);
          await AuditService.logActionTx(null, {
            userId: actorUser.id,
            action: 'GAD_PLAN_ITEM_DELETED',
            entityType: 'GADPlanItem',
            entityId: id,
            req,
          });
          return { message: 'GAD Plan line item deleted' };
        }
      }
      return { message: 'GAD Plan item deleted' };
    }

    // Check if it's an item
    const item = await prisma.gADPlanItem.findUnique({
      where: { id },
      include: { gadPlan: true },
    });

    if (item) {
      assertEditablePlan(item.gadPlan, actorUser);
      if (actorUser.role === Role.ENCODER && item.gadPlan.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot delete items belonging to other offices');
      }

      await prisma.$transaction(async (tx) => {
        await lockEditablePlan(tx, item.gadPlanId, actorUser);
        await tx.gADPlanItem.delete({ where: { id } });

        await AuditService.logActionTx(tx, {
          userId: actorUser.id,
          action: 'GAD_PLAN_ITEM_DELETED',
          entityType: 'GADPlanItem',
          entityId: id,
          req,
        });
      });

      return { message: 'GAD Plan line item deleted' };
    }

    const plan = await prisma.gADPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundError('GAD Plan');
    }

    if (actorUser.role === Role.ENCODER && plan.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders cannot delete plans of other offices');
    }

    assertEditablePlan(plan, actorUser);
    await prisma.$transaction(async (tx) => {
      await lockEditablePlan(tx, plan.id, actorUser);
      await tx.gADPlan.delete({ where: { id } });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'GAD_PLAN_DELETED',
        entityType: 'GADPlan',
        entityId: id,
        req,
      });
    });

    return { message: 'Annual GAD Plan deleted' };
  }

  // â”€â”€â”€ Test-infrastructure helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  /** Reset in-memory store to pristine seed data (used by unit tests). */
  public static resetMemoryStore(): void {
    MEMORY_GAD_PLANS.length = 0;
    const fresh = JSON.parse(JSON.stringify(FALLBACK_GAD_PLANS));
    for (const p of fresh) MEMORY_GAD_PLANS.push(p);
  }


  /**
   * Create a line item on an existing plan.
   */
  public static async createGADPlanItem(
    planId: string,
    data: {
      genderIssue?: string;
      gadResult?: string;
      activity?: string;
      budget?: number;
      hgdgScore?: number | null;
      [key: string]: any;
    },
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ): Promise<any> {
    assertGadWriter(actorUser);
    if (!isDatabaseConnected()) {
      const plan = findPlanInMemory(planId);
      if (!plan) throw new NotFoundError('GAD Plan');
      if (actorUser.role === Role.ENCODER && plan.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot add items to plans of other offices.');
      }
      assertEditablePlan(plan, actorUser);
      // Auto-compute attributedPercentage from hgdgScore
      let attributedPercentage: number | null = data.attributedPercentage ?? null;
      if (data.hgdgScore != null) {
        const tier = HgdgScoringService.getAttributionTier(Number(data.hgdgScore));
        attributedPercentage = tier.attributionPercentage;
      }
      const item: any = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        gadPlanId: planId,
        planId,
        genderIssue: data.genderIssue ?? 'Not Specified',
        causeOfIssue: data.causeOfIssue ?? null,
        gadResult: data.gadResult ?? 'GAD Result',
        activity: data.activity ?? 'GAD Activity',
        performanceIndicator: data.performanceIndicator ?? 'Target accomplished',
        targetGroup: data.targetGroup ?? 'General beneficiaries',
        timeline: data.timeline ?? `FY ${plan.fiscalYear}`,
        responsibleOffice: data.responsibleOffice ?? plan.office,
        budget: Number(data.budget ?? 0),
        fundSource: data.fundSource ?? 'General Fund (5% GAD)',
        hgdgScore: data.hgdgScore ?? null,
        attributedPercentage,
        accomplishments: [],
        createdAt: new Date().toISOString(),
      };
      if (!plan.items) plan.items = [];
      plan.items.push(item);
      return item;
    }

    const plan = await prisma.gADPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundError('GAD Plan');
    if (actorUser.role === Role.ENCODER && plan.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders cannot add items to plans of other offices.');
    }

    assertEditablePlan(plan, actorUser);
    let attributedPercentage: number | null = null;
    if (data.hgdgScore != null) {
      const tier = HgdgScoringService.getAttributionTier(Number(data.hgdgScore));
      attributedPercentage = tier.attributionPercentage;
    }

    const item = await prisma.$transaction(async tx => {
      await lockEditablePlan(tx, planId, actorUser);
      const created = await tx.gADPlanItem.create({
        data: {
          gadPlanId: planId,
          genderIssue: data.genderIssue ?? 'Not Specified',
          causeOfIssue: data.causeOfIssue ?? null,
          gadResult: data.gadResult ?? 'GAD Result',
          activity: data.activity ?? 'GAD Activity',
          performanceIndicator: data.performanceIndicator ?? 'Target accomplished',
          targetGroup: data.targetGroup ?? 'General beneficiaries',
          timeline: data.timeline ?? `FY ${plan.fiscalYear}`,
          responsibleOffice: data.responsibleOffice ?? '',
          budget: Number(data.budget ?? 0),
          fundSource: data.fundSource ?? 'General Fund (5% GAD)',
          hgdgScore: data.hgdgScore != null ? Number(data.hgdgScore) : null,
          attributedPercentage,
        },
      });
      await AuditService.logActionTx(tx, {
        userId: actorUser.id, action: 'GAD_PLAN_ITEM_CREATED', entityType: 'GADPlanItem',
        entityId: created.id, afterState: created, req,
      });
      return created;
    });
    return { ...item, hgdgScore: item.hgdgScore ? Number(item.hgdgScore) : null, attributedPercentage };
  }

  /**
   * ENCODER or ADMIN submits a plan (DRAFT/REVISED â†’ SUBMITTED).
   */
  public static async submitPlan(planId: string, actorUser: { id: string; role: Role; officeId: string | null }, remarks?: string, req?: Request): Promise<any> {
    return this.transitionPlan(planId, GADPlanStatus.SUBMITTED, actorUser, remarks, false, undefined, req);
  }

  public static async revisePlan(planId: string, actorUser: { id: string; role: Role; officeId: string | null }, revisionRemarks: string, req?: Request): Promise<any> {
    return this.transitionPlan(planId, GADPlanStatus.REVISED, actorUser, revisionRemarks, false, undefined, req);
  }

  public static async approvePlan(planId: string, actorUser: { id: string; role: Role; officeId: string | null }, forceApproval = false, overrideReason?: string, req?: Request): Promise<any> {
    return this.transitionPlan(planId, GADPlanStatus.APPROVED, actorUser, undefined, forceApproval, overrideReason, req);
  }

  /**
   * Public GAD Plan query: Returns only APPROVED plans with public line items
   */
  public static async getPublicGADPlans(params?: { year?: number; officeId?: string }) {
    if (!isDatabaseConnected()) {
      let list = FALLBACK_GAD_PLANS;
      if (params?.year) {
        list = list.filter((p) => p.fiscalYear === Number(params.year));
      }
      if (params?.officeId) {
        list = list.filter((p) => p.officeId === params.officeId || p.office.toLowerCase() === params.officeId.toLowerCase());
      }
      return list;
    }

    try {
      const where: any = {
        status: GADPlanStatus.APPROVED,
      };

      if (params?.year) {
        where.fiscalYear = Number(params.year);
      }
      if (params?.officeId) {
        where.officeId = params.officeId;
      }

      const plans = await prisma.gADPlan.findMany({
        where,
        include: {
          office: { select: { code: true, name: true } },
          items: {
            select: {
              id: true,
              genderIssue: true,
              gadResult: true,
              activity: true,
              performanceIndicator: true,
              targetGroup: true,
              timeline: true,
              responsibleOffice: true,
              budget: true,
              fundSource: true,
            },
          },
        },
        orderBy: [{ fiscalYear: 'desc' }],
      });

      return plans.map((p) => ({
        id: p.id,
        fiscalYear: p.fiscalYear,
        office: p.office.code || p.office.name,
        officeName: p.office.name,
        totalBudget: Number(p.totalBudget),
        gadBudget: Number(p.gadBudget),
        status: p.status,
        items: p.items.map((item) => ({
          ...item,
          budget: Number(item.budget),
        })),
      }));
    } catch {
      let list = FALLBACK_GAD_PLANS;
      if (params?.year) {
        list = list.filter((p) => p.fiscalYear === Number(params.year));
      }
      if (params?.officeId) {
        list = list.filter((p) => p.officeId === params.officeId || p.office.toLowerCase() === params.officeId.toLowerCase());
      }
      return list;
    }
  }
}
