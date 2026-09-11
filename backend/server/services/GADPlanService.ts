import prisma, { isDatabaseConnected } from '../lib/prisma';
import { GADPlanStatus, Role } from '@prisma/client';
import { NotFoundError, OfficeScopeError, ForbiddenError } from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { FALLBACK_GAD_PLANS } from '../lib/fallbackStore';

const MEMORY_GAD_PLANS: any[] = JSON.parse(JSON.stringify(FALLBACK_GAD_PLANS));

export class GADPlanService {
  public static async getGADPlans(
    params: {
      year?: number;
      officeId?: string;
      office?: string;
      status?: string;
    },
    actorUser?: { id: string; role: Role; officeId: string | null }
  ) {
    if (!isDatabaseConnected()) {
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
              genderIssue: 'General Allocation',
              causeOfIssue: '',
              gadResult: 'Annual GAD Plan Allocation',
              activity: 'GAD Direct and Attributed Activities',
              performanceIndicator: '100% GAD compliance',
              targetGroup: 'General Population',
              timeline: `FY ${plan.fiscalYear}`,
              responsibleOffice: plan.office.code || plan.office.name,
              budget: Number(plan.gadBudget),
              fundSource: 'General Fund (5% GAD)',
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
    let effectiveOfficeId = data.officeId;

    if (actorUser.role === Role.ENCODER) {
      effectiveOfficeId = actorUser.officeId;
    }

    const fYear = parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10);
    const itemBudget = parseFloat(String(data.budget || '0'));

    if (!isDatabaseConnected()) {
      let activePlan = MEMORY_GAD_PLANS.find((p) => p.officeId === effectiveOfficeId && p.fiscalYear === fYear);
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
    if (!isDatabaseConnected()) {
      for (const p of MEMORY_GAD_PLANS) {
        if (p.id === id) {
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
          }
          if (data.status) p.status = data.status;
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
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot modify GAD plans of other offices');
          }
          p.items[itemIdx] = { ...p.items[itemIdx], ...data };
          if (data.status && actorUser.role === Role.ADMIN) {
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
    id: string,
    status: GADPlanStatus,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (
      status === GADPlanStatus.APPROVED &&
      actorUser.role !== Role.ADMIN &&
      actorUser.role !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenError('Only administrators can approve GAD Plans');
    }

    if (!isDatabaseConnected()) {
      for (const p of MEMORY_GAD_PLANS) {
        if (p.id === id) {
          if (actorUser.role === Role.ENCODER && p.officeId !== actorUser.officeId) {
            throw new OfficeScopeError('Encoders cannot modify plans of other offices');
          }
          p.status = status;
          await AuditService.logActionTx(null, {
            userId: actorUser.id,
            action: 'GAD_PLAN_STATUS_CHANGED',
            entityType: 'GADPlan',
            entityId: id,
            beforeState: { status: 'DRAFT' },
            afterState: { status },
            req,
          });
          return p;
        }
      }
      // Or default first plan
      if (MEMORY_GAD_PLANS.length > 0) {
        MEMORY_GAD_PLANS[0].status = status;
        await AuditService.logActionTx(null, {
          userId: actorUser.id,
          action: 'GAD_PLAN_STATUS_CHANGED',
          entityType: 'GADPlan',
          entityId: MEMORY_GAD_PLANS[0].id,
          beforeState: { status: 'DRAFT' },
          afterState: { status },
          req,
        });
        return MEMORY_GAD_PLANS[0];
      }
    }

    // Resolve if ID is item or plan
    const item = await prisma.gADPlanItem.findUnique({
      where: { id },
      select: { gadPlanId: true },
    });

    const targetPlanId = item ? item.gadPlanId : id;

    const existing = await prisma.gADPlan.findUnique({ where: { id: targetPlanId } });
    if (!existing) {
      throw new NotFoundError('GAD Plan');
    }

    if (actorUser.role === Role.ENCODER && existing.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders cannot modify plans of other offices');
    }

    const updated = await prisma.$transaction(async (tx) => {
      const p = await tx.gADPlan.update({
        where: { id: targetPlanId },
        data: { status },
        include: { office: true },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'GAD_PLAN_STATUS_CHANGED',
        entityType: 'GADPlan',
        entityId: targetPlanId,
        beforeState: { status: existing.status },
        afterState: { status: p.status },
        req,
      });

      return p;
    });

    return updated;
  }

  public static async deleteGADPlan(
    id: string,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      for (let i = 0; i < MEMORY_GAD_PLANS.length; i++) {
        const p = MEMORY_GAD_PLANS[i];
        if (p.id === id) {
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
      if (actorUser.role === Role.ENCODER && item.gadPlan.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot delete items belonging to other offices');
      }

      await prisma.$transaction(async (tx) => {
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

    await prisma.$transaction(async (tx) => {
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
