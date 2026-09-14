/**
 * 5% GAD Budget Validator Service
 *
 * Enforces statutory GAD Budget allocation rules under:
 * - Republic Act No. 9710 (Magna Carta of Women)
 * - DILG-PCW-DBM-NEDA Joint Memorandum Circular (JMC)
 *
 * Mandate:
 * Local Government Units and national agencies must allocate a MINIMUM of 5%
 * of their total annual budget appropriations to Gender and Development (GAD).
 */

export interface BudgetValidationSummary {
  fiscalYear: number;
  officeId?: string | null;
  officeName?: string | null;
  totalBudget: number;
  mandatoryPercentage: number;
  requiredGadBudget: number;
  allocatedGadBudget: number;
  directBudget: number;
  attributedBudget: number;
  allocatedPercentage: number;
  variance: number; // positive = surplus, negative = deficit
  isCompliant: boolean;
  status: 'COMPLIANT' | 'DEFICIT' | 'UNCONFIGURED';
  errors: string[];
  warnings: string[];
}

export class GadBudgetValidator {
  /**
   * Evaluates compliance against the statutory 5% GAD budget requirement.
   */
  public static validate(params: {
    fiscalYear: number;
    totalBudget: number;
    mandatoryPercentage?: number;
    items?: Array<{
      budget: number;
      hgdgScore?: number | null;
      attributedPercentage?: number | null;
      fundSource?: string;
    }>;
    explicitGadBudget?: number;
    officeId?: string | null;
    officeName?: string | null;
  }): BudgetValidationSummary {
    const totalBudget = Math.max(0, Number(params.totalBudget) || 0);
    const mandatoryPercentage = Number(params.mandatoryPercentage) > 0 ? Number(params.mandatoryPercentage) : 5.0;
    const requiredGadBudget = Math.round((totalBudget * (mandatoryPercentage / 100)) * 100) / 100;

    let directBudget = 0;
    let attributedBudget = 0;
    let totalItemsBudget = 0;

    if (params.items && params.items.length > 0) {
      for (const item of params.items) {
        const itemBudget = Math.max(0, Number(item.budget) || 0);
        totalItemsBudget += itemBudget;

        if (item.attributedPercentage !== null && item.attributedPercentage !== undefined && Number(item.attributedPercentage) >= 0) {
          // Attributed item (e.g. via HGDG)
          const pct = Math.min(100, Math.max(0, Number(item.attributedPercentage)));
          attributedBudget += Math.round((itemBudget * (pct / 100)) * 100) / 100;
        } else {
          // Direct GAD activity
          directBudget += itemBudget;
        }
      }
    }

    // Use items sum if items exist; otherwise fallback to explicit plan-level gadBudget
    const allocatedGadBudget =
      params.items && params.items.length > 0
        ? Math.round((directBudget + attributedBudget) * 100) / 100
        : Math.max(0, Number(params.explicitGadBudget) || 0);

    const allocatedPercentage =
      totalBudget > 0 ? Math.round(((allocatedGadBudget / totalBudget) * 100) * 100) / 100 : 0;
    const variance = Math.round((allocatedGadBudget - requiredGadBudget) * 100) / 100;

    const errors: string[] = [];
    const warnings: string[] = [];

    let status: 'COMPLIANT' | 'DEFICIT' | 'UNCONFIGURED' = 'COMPLIANT';

    if (totalBudget <= 0) {
      status = 'UNCONFIGURED';
      warnings.push(
        `Total municipal annual budget is not yet configured for FY ${params.fiscalYear}. Mandatory 5% calculation requires a positive total budget appropriation.`
      );
    } else if (allocatedGadBudget < requiredGadBudget) {
      status = 'DEFICIT';
      const deficitAmount = Math.abs(variance).toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      });
      const requiredStr = requiredGadBudget.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      });
      const allocatedStr = allocatedGadBudget.toLocaleString('en-PH', {
        style: 'currency',
        currency: 'PHP',
      });

      errors.push(
        `Statutory 5% GAD budget deficit: Currently allocated ${allocatedStr} (${allocatedPercentage}%), which is below the mandatory minimum ${mandatoryPercentage}% requirement of ${requiredStr}. Shortfall: ${deficitAmount}.`
      );
    } else {
      status = 'COMPLIANT';
    }

    if (params.items && params.items.length === 0 && allocatedGadBudget <= 0) {
      warnings.push('Plan has no line items formulated yet.');
    }

    const isCompliant = status === 'COMPLIANT';

    return {
      fiscalYear: params.fiscalYear,
      officeId: params.officeId || null,
      officeName: params.officeName || null,
      totalBudget,
      mandatoryPercentage,
      requiredGadBudget,
      allocatedGadBudget,
      directBudget,
      attributedBudget,
      allocatedPercentage,
      variance,
      isCompliant,
      status,
      errors,
      warnings,
    };
  }
}
