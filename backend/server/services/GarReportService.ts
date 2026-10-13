import prisma, { isDatabaseConnected } from '../lib/prisma';
import { FALLBACK_GAD_PLANS, FALLBACK_ACCOMPLISHMENTS } from '../lib/fallbackStore';
import { requireReadScope, ReadActor } from '../lib/readScope';
import { AppError, ValidationError } from '../lib/errors';

export interface GarVarianceItem {
  id: string;
  planId: string;
  fiscalYear: number;
  quarter?: number | null;
  office: string;
  officeName?: string;
  genderIssue: string;
  causeOfIssue?: string | null;
  gadResult: string;
  activity: string;
  performanceIndicator: string;
  targetGroup: string;
  timeline: string;
  plannedBudget: number;
  fundSource: string;
  hgdgScore?: number | null;
  attributedPercentage?: number | null;
  // Accomplishment metrics
  actualBudgetUsed: number;
  budgetVariance: number; // plannedBudget - actualBudgetUsed
  budgetUtilizationRate: number; // (actualBudgetUsed / plannedBudget) * 100
  actualOutput: string;
  actualMale: number;
  actualFemale: number;
  actualTotal: number;
  outputSummary?: string | null;
  remarks?: string | null;
  varianceExplanation?: string | null;
  accomplishmentCount: number;
}

export interface GarVarianceReport {
  fiscalYear: number;
  quarter: number | 'ALL';
  officeId?: string | null;
  summary: {
    totalPlannedBudget: number;
    totalActualBudgetUsed: number;
    totalBudgetVariance: number;
    overallUtilizationRate: number;
    totalMaleBeneficiaries: number;
    totalFemaleBeneficiaries: number;
    totalBeneficiaries: number;
    totalActivities: number;
    activitiesWithAccomplishments: number;
  };
  items: GarVarianceItem[];
}

export class GarReportService {
  /**
   * Generates comprehensive Quarterly GAR Variance Report.
   */
  public static async getQuarterlyGarVariance(params: {
    year?: number;
    quarter?: number | string;
    officeId?: string;
    status?: string;
  }, actorUser?: ReadActor, options: { strict?: boolean } = {}): Promise<GarVarianceReport> {
    const officeScope = options.strict ? requireReadScope(actorUser) : null;
    const fiscalYear = Number(params.year) || new Date().getFullYear();
    const officeFilter = officeScope || params.officeId;
    const statusFilter = params.status;

    let targetQuarter: number | undefined = undefined;
    if (params.quarter !== undefined && params.quarter !== null && (params.quarter as any) !== 'ALL' && params.quarter !== '') {
      const qNum = Number(params.quarter);
      if (![1, 2, 3, 4].includes(qNum)) {
        throw new ValidationError(`Invalid quarter: ${params.quarter}. Quarter must be 1, 2, 3, or 4 (or ALL / omitted for YTD).`);
      }
      targetQuarter = qNum;
    }

    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      return this.getFallbackGarVariance(fiscalYear, targetQuarter, officeFilter, statusFilter);
    }

    try {
      // Find all GAD Plans for the fiscal year
      const planWhere: any = { fiscalYear };
      if (officeFilter) {
        planWhere.officeId = officeFilter;
      }
      if (statusFilter) {
        planWhere.status = statusFilter;
      }

      const plans = await prisma.gADPlan.findMany({
        where: planWhere,
        include: {
          office: true,
          items: {
            include: {
              program: true,
              accomplishments: {
                where: targetQuarter ? { quarter: targetQuarter } : undefined,
                include: { attachments: true },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      const reportItems: GarVarianceItem[] = [];

      for (const plan of plans) {
        for (const item of plan.items) {
          const plannedBudget = Number(item.budget) || 0;
          const accs = item.accomplishments || [];

          const actualBudgetUsed = accs.reduce((sum, a) => sum + (Number(a.actualBudgetUsed) || 0), 0);
          const actualMale = accs.reduce((sum, a) => sum + (a.actualMale || 0), 0);
          const actualFemale = accs.reduce((sum, a) => sum + (a.actualFemale || 0), 0);
          const actualTotal = actualMale + actualFemale;

          const budgetVariance = Math.round((plannedBudget - actualBudgetUsed) * 100) / 100;
          const budgetUtilizationRate =
            plannedBudget > 0 ? Math.round(((actualBudgetUsed / plannedBudget) * 100) * 100) / 100 : 0;

          // Consolidate actual outputs, remarks, and variance explanations
          const outputs = accs
            .map((a) => a.actualOutput)
            .filter(Boolean)
            .join('; ');
          const remarks = accs
            .map((a) => a.remarks)
            .filter(Boolean)
            .join('; ');
          const varianceExplanations = accs
            .map((a) => a.varianceExplanation)
            .filter(Boolean)
            .join('; ');

          reportItems.push({
            id: item.id,
            planId: plan.id,
            fiscalYear: plan.fiscalYear,
            quarter: targetQuarter || null,
            office: plan.office.code || plan.office.name,
            officeName: plan.office.name,
            genderIssue: item.genderIssue,
            causeOfIssue: item.causeOfIssue,
            gadResult: item.gadResult,
            activity: item.activity,
            performanceIndicator: item.performanceIndicator,
            targetGroup: item.targetGroup,
            timeline: item.timeline,
            plannedBudget,
            fundSource: item.fundSource,
            hgdgScore: item.hgdgScore ? Number(item.hgdgScore) : null,
            attributedPercentage: item.attributedPercentage ? Number(item.attributedPercentage) : null,
            actualBudgetUsed: Math.round(actualBudgetUsed * 100) / 100,
            budgetVariance,
            budgetUtilizationRate,
            actualOutput: outputs || 'No accomplishment encoded yet',
            actualMale,
            actualFemale,
            actualTotal,
            outputSummary: accs.length > 0 ? accs[0].outputSummary : null,
            remarks: remarks || null,
            varianceExplanation: varianceExplanations || null,
            accomplishmentCount: accs.length,
          });
        }
      }

      // Compute aggregate summary
      const totalPlannedBudget = Math.round(reportItems.reduce((s, i) => s + i.plannedBudget, 0) * 100) / 100;
      const totalActualBudgetUsed = Math.round(reportItems.reduce((s, i) => s + i.actualBudgetUsed, 0) * 100) / 100;
      const totalBudgetVariance = Math.round((totalPlannedBudget - totalActualBudgetUsed) * 100) / 100;
      const overallUtilizationRate =
        totalPlannedBudget > 0 ? Math.round(((totalActualBudgetUsed / totalPlannedBudget) * 100) * 100) / 100 : 0;
      const totalMaleBeneficiaries = reportItems.reduce((s, i) => s + i.actualMale, 0);
      const totalFemaleBeneficiaries = reportItems.reduce((s, i) => s + i.actualFemale, 0);
      const totalBeneficiaries = totalMaleBeneficiaries + totalFemaleBeneficiaries;
      const totalActivities = reportItems.length;
      const activitiesWithAccomplishments = reportItems.filter((i) => i.accomplishmentCount > 0).length;

      return {
        fiscalYear,
        quarter: targetQuarter || 'ALL',
        officeId: officeFilter || null,
        summary: {
          totalPlannedBudget,
          totalActualBudgetUsed,
          totalBudgetVariance,
          overallUtilizationRate,
          totalMaleBeneficiaries,
          totalFemaleBeneficiaries,
          totalBeneficiaries,
          totalActivities,
          activitiesWithAccomplishments,
        },
        items: reportItems,
      };
    } catch (error: any) {
      if (options.strict) throw new AppError('Report source unavailable', 503, 'DATA_UNAVAILABLE');
      if (error instanceof ValidationError || error.name === 'ValidationError') {
        throw error;
      }
      return this.getFallbackGarVariance(fiscalYear, targetQuarter, officeFilter, statusFilter);
    }
  }

  private static getFallbackGarVariance(
    fiscalYear: number,
    targetQuarter?: number,
    officeFilter?: string,
    statusFilter?: string
  ): GarVarianceReport {
    let plans = [...FALLBACK_GAD_PLANS].filter((p) => p.fiscalYear === fiscalYear);
    if (officeFilter) {
      plans = plans.filter((p) => p.officeId === officeFilter || p.office === officeFilter);
    }
    if (statusFilter) {
      plans = plans.filter((p) => p.status === statusFilter);
    }

    const reportItems: GarVarianceItem[] = [];

    for (const plan of plans) {
      const items = plan.items || [];
      for (const item of items) {
        const plannedBudget = Number(item.budget) || 0;
        let accs = [...FALLBACK_ACCOMPLISHMENTS].filter(
          (a: any) => a.gadPlanItemId
            ? a.gadPlanItemId === item.id
            : Boolean(item.programId) && a.programId === item.programId
        );
        if (targetQuarter) {
          accs = accs.filter((a: any) => a.quarter === targetQuarter);
        }

        const actualBudgetUsed = accs.reduce((sum, a: any) => sum + (Number(a.actualBudgetUsed) || 0), 0);
        const actualMale = accs.reduce((sum, a: any) => sum + (a.actualMale || a.actualBeneficiaryMale || 0), 0);
        const actualFemale = accs.reduce((sum, a: any) => sum + (a.actualFemale || a.actualBeneficiaryFemale || 0), 0);
        const actualTotal = actualMale + actualFemale;

        const budgetVariance = Math.round((plannedBudget - actualBudgetUsed) * 100) / 100;
        const budgetUtilizationRate =
          plannedBudget > 0 ? Math.round(((actualBudgetUsed / plannedBudget) * 100) * 100) / 100 : 0;

        reportItems.push({
          id: item.id,
          planId: plan.id,
          fiscalYear: plan.fiscalYear,
          quarter: targetQuarter || null,
          office: plan.office,
          officeName: plan.officeName,
          genderIssue: item.genderIssue || 'GAD Activity',
          causeOfIssue: item.causeOfIssue,
          gadResult: item.gadResult || 'Gender Equality Outcome',
          activity: item.activity || 'Activity',
          performanceIndicator: item.performanceIndicator || 'Accomplished',
          targetGroup: item.targetGroup || 'Beneficiaries',
          timeline: item.timeline || `FY ${plan.fiscalYear}`,
          plannedBudget,
          fundSource: item.fundSource || 'General Fund (5% GAD)',
          hgdgScore: item.hgdgScore || null,
          attributedPercentage: item.attributedPercentage || null,
          actualBudgetUsed,
          budgetVariance,
          budgetUtilizationRate,
          actualOutput: accs.map((a: any) => a.actualOutput).join('; ') || 'Ongoing',
          actualMale,
          actualFemale,
          actualTotal,
          outputSummary: accs.length > 0 ? accs[0].outputSummary : null,
          remarks: accs.map((a: any) => a.remarks).filter(Boolean).join('; ') || null,
          varianceExplanation:
            accs.map((a: any) => a.varianceExplanation).filter(Boolean).join('; ') ||
            (budgetVariance > 0 ? 'Within approved allocation' : null),
          accomplishmentCount: accs.length,
        });
      }
    }

    const totalPlannedBudget = Math.round(reportItems.reduce((s, i) => s + i.plannedBudget, 0) * 100) / 100;
    const totalActualBudgetUsed = Math.round(reportItems.reduce((s, i) => s + i.actualBudgetUsed, 0) * 100) / 100;
    const totalBudgetVariance = Math.round((totalPlannedBudget - totalActualBudgetUsed) * 100) / 100;
    const overallUtilizationRate =
      totalPlannedBudget > 0 ? Math.round(((totalActualBudgetUsed / totalPlannedBudget) * 100) * 100) / 100 : 0;
    const totalMaleBeneficiaries = reportItems.reduce((s, i) => s + i.actualMale, 0);
    const totalFemaleBeneficiaries = reportItems.reduce((s, i) => s + i.actualFemale, 0);
    const totalBeneficiaries = totalMaleBeneficiaries + totalFemaleBeneficiaries;
    const totalActivities = reportItems.length;
    const activitiesWithAccomplishments = reportItems.filter((i) => i.accomplishmentCount > 0).length;

    return {
      fiscalYear,
      quarter: targetQuarter || 'ALL',
      officeId: officeFilter || null,
      summary: {
        totalPlannedBudget,
        totalActualBudgetUsed,
        totalBudgetVariance,
        overallUtilizationRate,
        totalMaleBeneficiaries,
        totalFemaleBeneficiaries,
        totalBeneficiaries,
        totalActivities,
        activitiesWithAccomplishments,
      },
      items: reportItems,
    };
  }
}
