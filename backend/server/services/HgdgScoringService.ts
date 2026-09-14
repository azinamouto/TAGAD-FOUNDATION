/**
 * HGDG (Harmonized Gender and Development Guidelines) Scoring Service
 *
 * CRITICAL PCW / NEDA SPECIFICATION & BOUNDARY:
 * Authoritative PCW Box Checklists (e.g., Boxes 9–28) vary by sector and development phase.
 * This service implements a configuration-driven scoring engine that evaluates numeric
 * scores against standard Harmonized GAD Guidelines attribution tiers without fabricating
 * unverified statutory checklists.
 *
 * Standard Attribution Tiers (NEDA / PCW Harmonized GAD Guidelines):
 * - 0.00 – 3.99: GAD is invisible in the project (0% attribution)
 * - 4.00 – 7.99: Promising GAD prospects (conditional attribution: 25%)
 * - 8.00 – 14.99: Gender-sensitive (50% attribution)
 * - 15.00 – 19.99: Gender-responsive (75% attribution)
 * - 20.00: Fully gender-responsive (100% attribution)
 */

export interface HgdgAttributionResult {
  score: number;
  hgdgScore?: number;
  attributionPercentage: number;
  tier: 'INVISIBLE' | 'PROMISING' | 'GENDER_SENSITIVE' | 'GENDER_RESPONSIVE' | 'FULLY_RESPONSIVE';
  tierLabel: string;
  description: string;
  attributedBudget?: number;
}

export interface HgdgChecklistItem {
  id: string;
  category: string;
  element: string;
  maxScore: number;
  weight?: number;
}

export interface HgdgRubricConfig {
  id: string;
  name: string;
  sector: string;
  isOfficialStatutoryChecklist: boolean; // Flag to prevent misrepresenting configurable templates
  disclaimer: string;
  items: HgdgChecklistItem[];
}

export class HgdgScoringService {
  /**
   * Validate that an HGDG score is within the statutory 0.00 – 20.00 range.
   */
  public static validateScore(score: number): { valid: boolean; error?: string } {
    if (typeof score !== 'number' || isNaN(score)) {
      return { valid: false, error: 'HGDG score must be a valid number.' };
    }
    if (score < 0 || score > 20) {
      return { valid: false, error: `HGDG score must be between 0.00 and 20.00. Provided: ${score}` };
    }
    return { valid: true };
  }

  /**
   * Determine attribution percentage and tier based on official NEDA/PCW scale.
   */
  public static getAttributionTier(score: number): HgdgAttributionResult {
    const validation = this.validateScore(score);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Standard NEDA / PCW Harmonized Guidelines Attribution Scale
    if (score < 4.0) {
      return {
        score,
        attributionPercentage: 0,
        tier: 'INVISIBLE',
        tierLabel: 'GAD is Invisible',
        description: 'Project has negligible gender integration; 0% budget attribution eligible.',
      };
    } else if (score < 8.0) {
      return {
        score,
        attributionPercentage: 25,
        tier: 'PROMISING',
        tierLabel: 'Promising GAD Prospects',
        description: 'Project includes basic gender components; conditionally eligible for 25% budget attribution.',
      };
    } else if (score < 15.0) {
      return {
        score,
        attributionPercentage: 50,
        tier: 'GENDER_SENSITIVE',
        tierLabel: 'Gender-Sensitive',
        description: 'Project satisfies substantial gender-responsiveness criteria; 50% budget attribution eligible.',
      };
    } else if (score < 20.0) {
      return {
        score,
        attributionPercentage: 75,
        tier: 'GENDER_RESPONSIVE',
        tierLabel: 'Gender-Responsive',
        description: 'Project exhibits comprehensive gender mainstreaming; 75% budget attribution eligible.',
      };
    } else {
      return {
        score,
        attributionPercentage: 100,
        tier: 'FULLY_RESPONSIVE',
        tierLabel: 'Fully Gender-Responsive',
        description: 'Project achieves perfect 20/20 HGDG compliance; 100% budget attribution eligible.',
      };
    }
  }

  /**
   * Calculate attributed GAD budget given an item's total cost and HGDG score.
   */
  public static calculateAttributedBudget(
    totalCost: number,
    score: number
  ): HgdgAttributionResult & { totalCost: number; attributedBudget: number } {
    const tier = this.getAttributionTier(score);
    const validCost = Math.max(0, Number(totalCost) || 0);
    const attributedBudget = Math.round((validCost * (tier.attributionPercentage / 100)) * 100) / 100;

    return {
      ...tier,
      hgdgScore: tier.score,
      totalCost: validCost,
      attributedBudget,
    };
  }

  /**
   * Evaluates scores from a configuration-driven checklist.
   */
  public static scoreChecklist(
    answers: Record<string, number>,
    rubricConfig?: HgdgRubricConfig
  ): {
    totalScore: number;
    attribution: HgdgAttributionResult;
    itemScores: Record<string, number>;
    isConfigurableBaseline: boolean;
    disclaimer: string;
  } {
    const config = rubricConfig || this.getDefaultConfigurableRubric();
    let accumulated = 0;
    const itemScores: Record<string, number> = {};

    for (const item of config.items) {
      const raw = answers[item.id] !== undefined ? Number(answers[item.id]) : 0;
      const clamped = Math.max(0, Math.min(item.maxScore, raw));
      itemScores[item.id] = clamped;
      accumulated += clamped;
    }

    const totalScore = Math.min(20, Math.max(0, Math.round(accumulated * 100) / 100));
    const attribution = this.getAttributionTier(totalScore);

    return {
      totalScore,
      attribution,
      itemScores,
      isConfigurableBaseline: !config.isOfficialStatutoryChecklist,
      disclaimer: config.disclaimer,
    };
  }

  /**
   * Baseline configurable checklist (Generic Project Identification & Design).
   * Note: Explicitly marked as a configurable template to avoid fabricating PCW statutory criteria.
   */
  public static getDefaultConfigurableRubric(): HgdgRubricConfig {
    return {
      id: 'hgdg-generic-design-pimme',
      name: 'Generic GAD Checklist (Baseline Template)',
      sector: 'General / Multi-Sectoral LGU Programs',
      isOfficialStatutoryChecklist: false,
      disclaimer:
        'Notice: This checklist serves as a configurable baseline rubric modeled on the Harmonized GAD Guidelines framework. Municipal field assessors should calibrate against sector-specific PCW Box Checklists (e.g. Boxes 9–28) as prescribed by the Philippine Commission on Women.',
      items: [
        { id: 'element-1', category: 'Gender Analysis', element: 'Involvement of women and men in project identification', maxScore: 2.0 },
        { id: 'element-2', category: 'Gender Analysis', element: 'Collection and analysis of sex-disaggregated data', maxScore: 2.0 },
        { id: 'element-3', category: 'Gender Analysis', element: 'Identification of gender issues and causes in the sector', maxScore: 2.0 },
        { id: 'element-4', category: 'Project Design', element: 'Clear gender equality and women empowerment objectives', maxScore: 2.0 },
        { id: 'element-5', category: 'Project Design', element: 'Gender-responsive activities matching identified issues', maxScore: 2.0 },
        { id: 'element-6', category: 'Project Design', element: 'Equal access to project resources and participation', maxScore: 2.0 },
        { id: 'element-7', category: 'Indicators', element: 'Gender-sensitive performance indicators and targets', maxScore: 2.0 },
        { id: 'element-8', category: 'Monitoring', element: 'Sex-disaggregated monitoring and evaluation mechanisms', maxScore: 2.0 },
        { id: 'element-9', category: 'Resources', element: 'Adequate dedicated budget allocation for gender activities', maxScore: 2.0 },
        { id: 'element-10', category: 'Capacity', element: 'Capacity building and gender sensitivity measures', maxScore: 2.0 },
      ],
    };
  }
}
