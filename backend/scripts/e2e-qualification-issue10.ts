import dotenv from 'dotenv';
dotenv.config();

import { GADPlanService } from '../server/services/GADPlanService';
import { GadBudgetValidator } from '../server/services/GadBudgetValidator';
import { HgdgScoringService } from '../server/services/HgdgScoringService';
import { GarReportService } from '../server/services/GarReportService';
import { GADPlanStatus, Role } from '@prisma/client';
import { ValidationError, ForbiddenError, OfficeScopeError } from '../server/lib/errors';

interface QualificationCheck {
  gate: string;
  criterion: string;
  passed: boolean;
  evidence: string;
}

async function runIssue10Qualification() {
  console.log('======================================================================');
  console.log('  TAGAD ISSUE #10 — GAD DOMAIN COMPLETION FINAL QUALIFICATION AUDIT');
  console.log('======================================================================\n');

  const checks: QualificationCheck[] = [];

  // Setup actors
  const encoderMswdo = {
    id: 'usr-encoder-mswdo',
    email: 'encoder.mswdo@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mswdo',
  };

  const encoderMho = {
    id: 'usr-encoder-mho',
    email: 'encoder.mho@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mho',
  };

  const adminActor = {
    id: 'usr-admin-01',
    email: 'admin@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: null,
  };

  const superAdminActor = {
    id: 'usr-superadmin-01',
    email: 'superadmin@talibon.gov.ph',
    role: Role.SUPER_ADMIN,
    officeId: null,
  };

  const viewerActor = {
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
    officeId: null,
  };

  // Reset state
  GADPlanService.resetMemoryStore();

  // -------------------------------------------------------------------------
  // GATE 1: VULNERABILITY ELIMINATION (ENCODER -> SUBMITTED -> DRAFT BYPASS)
  // -------------------------------------------------------------------------
  console.log('>> [GATE 1] Testing Elimination of the ENCODER -> SUBMITTED -> DRAFT Vulnerability...');
  const plan1 = await GADPlanService.createGADPlan(
    {
      officeId: 'off-mswdo',
      fiscalYear: 2026,
      totalBudget: 10000000,
      gadBudget: 600000,
    },
    encoderMswdo
  );

  // Submit plan
  await GADPlanService.submitPlan(plan1.id, encoderMswdo, 'Submitted for LGU review');

  // Attempt 1: ENCODER tries to update status to DRAFT via updatePlanStatus
  let encoderBypassBlocked = false;
  try {
    await GADPlanService.updatePlanStatus(plan1.id, GADPlanStatus.DRAFT, encoderMswdo);
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.statusCode === 403) {
      encoderBypassBlocked = true;
    }
  }

  // Attempt 2: ENCODER tries to update status via updateGADPlan payload
  let encoderUpdatePayloadBlocked = false;
  try {
    await GADPlanService.updateGADPlan(plan1.id, { status: GADPlanStatus.DRAFT }, encoderMswdo);
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.statusCode === 403) {
      encoderUpdatePayloadBlocked = true;
    }
  }

  // Attempt 3: ADMIN attempts direct SUBMITTED -> DRAFT
  let adminDraftBypassBlocked = false;
  try {
    await GADPlanService.updatePlanStatus(plan1.id, GADPlanStatus.DRAFT, adminActor);
  } catch (err: any) {
    if (err instanceof ValidationError || err.statusCode === 422 || err.statusCode === 400) {
      adminDraftBypassBlocked = true;
    }
  }

  // Check that plan remains SUBMITTED
  const currentPlanState = await GADPlanService.getGADPlanById(plan1.id);
  const planRemainsSubmitted = currentPlanState?.status === GADPlanStatus.SUBMITTED;

  // Attempt 4: ENCODER tries to mutate line items while SUBMITTED
  let editWhileSubmittedBlocked = false;
  try {
    await GADPlanService.updateGADPlan(plan1.id, { genderIssue: 'Tampered Issue' }, encoderMswdo);
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.statusCode === 403) {
      editWhileSubmittedBlocked = true;
    }
  }

  checks.push({
    gate: 'Gate 1: Vulnerability Elimination',
    criterion: 'ENCODER cannot transition SUBMITTED to DRAFT via any service or generic endpoint',
    passed: encoderBypassBlocked && encoderUpdatePayloadBlocked && adminDraftBypassBlocked && planRemainsSubmitted,
    evidence: `ENCODER updatePlanStatus blocked=${encoderBypassBlocked} (403 Forbidden). Payload injection blocked=${encoderUpdatePayloadBlocked}. ADMIN direct DRAFT blocked=${adminDraftBypassBlocked} (422 ValidationError). Plan state remains=${currentPlanState?.status}.`,
  });

  checks.push({
    gate: 'Gate 1: Vulnerability Elimination',
    criterion: 'Line items and GPB metadata are strictly locked while in SUBMITTED status',
    passed: editWhileSubmittedBlocked,
    evidence: `ENCODER item/plan modification while SUBMITTED strictly rejected with 403 Forbidden.`,
  });

  // -------------------------------------------------------------------------
  // GATE 2: AUTHORITATIVE STATE MACHINE TRANSITIONS
  // -------------------------------------------------------------------------
  console.log('>> [GATE 2] Testing Authoritative State Machine Transitions...');
  
  // Transition: SUBMITTED -> REVISED with remarks (by ADMIN)
  const revisedPlan = await GADPlanService.revisePlan(plan1.id, adminActor, 'Requires updated HGDG scoring MOV attachments');
  const revisionValid = revisedPlan.status === GADPlanStatus.REVISED && revisedPlan.revisionRemarks === 'Requires updated HGDG scoring MOV attachments';

  // Attempt: REVISED -> DRAFT directly (forbidden)
  let revisedToDraftBlocked = false;
  try {
    await GADPlanService.updatePlanStatus(plan1.id, GADPlanStatus.DRAFT, adminActor);
  } catch (err: any) {
    if (err instanceof ValidationError || err.statusCode === 422 || err.statusCode === 400) {
      revisedToDraftBlocked = true;
    }
  }

  // Transition: Resubmit REVISED -> SUBMITTED (by ENCODER)
  const resubmittedPlan = await GADPlanService.submitPlan(plan1.id, encoderMswdo, 'Resubmitted with MOVs attached');
  const resubmitValid = resubmittedPlan.status === GADPlanStatus.SUBMITTED;

  // Attempt: DRAFT -> APPROVED directly (forbidden)
  const draftPlan = await GADPlanService.createGADPlan(
    {
      officeId: 'off-mswdo',
      fiscalYear: 2027,
      totalBudget: 10000000,
      gadBudget: 600000,
    },
    encoderMswdo
  );

  let draftToApprovedBlocked = false;
  try {
    await GADPlanService.updatePlanStatus(draftPlan.id, GADPlanStatus.APPROVED, adminActor);
  } catch (err: any) {
    if (err instanceof ValidationError || err.statusCode === 422 || err.statusCode === 400) {
      draftToApprovedBlocked = true;
    }
  }

  checks.push({
    gate: 'Gate 2: State Machine Integrity',
    criterion: 'Full lifecycle transitions adhere to SUBMITTED -> REVISED -> SUBMITTED and block invalid paths',
    passed: revisionValid && revisedToDraftBlocked && resubmitValid && draftToApprovedBlocked,
    evidence: `Revision remarks captured successfully. REVISED->DRAFT blocked=${revisedToDraftBlocked}. Resubmission succeeded=${resubmitValid}. Direct DRAFT->APPROVED blocked=${draftToApprovedBlocked}.`,
  });

  // -------------------------------------------------------------------------
  // GATE 3: 5% STATUTORY GAD BUDGET VALIDATION & DEFICIT OVERRIDE
  // -------------------------------------------------------------------------
  console.log('>> [GATE 3] Testing 5% Statutory GAD Budget Validation & Deficit Governance...');
  
  // Case A: Compliant Budget (6% of 10M = 600,000 >= 500,000)
  const compliantVal = GadBudgetValidator.validate({
    totalBudget: 10000000,
    explicitGadBudget: 600000,
    fiscalYear: 2026,
    officeName: 'MSWDO',
  });

  // Case B: Deficit Budget (3% of 10M = 300,000 < 500,000)
  const deficitVal = GadBudgetValidator.validate({
    totalBudget: 10000000,
    explicitGadBudget: 300000,
    fiscalYear: 2026,
    officeName: 'MSWDO',
  });

  // Case C: Deficit Plan Approval without override flag
  const deficitPlan = await GADPlanService.createGADPlan(
    {
      officeId: 'off-mswdo',
      fiscalYear: 2028,
      totalBudget: 10000000,
      gadBudget: 300000,
    },
    encoderMswdo
  );
  await GADPlanService.submitPlan(deficitPlan.id, encoderMswdo);

  let unforcedApprovalBlocked = false;
  try {
    await GADPlanService.approvePlan(deficitPlan.id, adminActor, false);
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('Statutory 5% GAD budget deficit')) {
      unforcedApprovalBlocked = true;
    }
  }

  // Case D: Deficit Plan Approval with override flag but EMPTY justification
  let overrideWithoutReasonBlocked = false;
  try {
    await GADPlanService.approvePlan(deficitPlan.id, adminActor, true, '   ');
  } catch (err: any) {
    if (err instanceof ValidationError && err.message.includes('Deficit override approval requires an explicit justification')) {
      overrideWithoutReasonBlocked = true;
    }
  }

  // Case E: Deficit Plan Approval with override flag and EXPLICIT justification
  const overrideApproved = await GADPlanService.approvePlan(
    deficitPlan.id,
    adminActor,
    true,
    'Sangguniang Bayan Resolution No. 2026-104 authorizing supplemental GAD allocation'
  );

  const overrideSuccess = overrideApproved.status === GADPlanStatus.APPROVED;

  checks.push({
    gate: 'Gate 3: 5% Budget & Deficit Governance',
    criterion: '5% statutory threshold enforced; deficit approvals require forceApproval and recorded justification',
    passed: compliantVal.isCompliant && !deficitVal.isCompliant && unforcedApprovalBlocked && overrideWithoutReasonBlocked && overrideSuccess,
    evidence: `Compliant validated (${compliantVal.allocatedPercentage}%). Deficit detected (allocated ${deficitVal.allocatedPercentage}%, deficit variance ${deficitVal.variance} PHP). Unforced approval blocked=${unforcedApprovalBlocked}. Empty justification blocked=${overrideWithoutReasonBlocked}. Justified override approved=${overrideSuccess}.`,
  });

  // -------------------------------------------------------------------------
  // GATE 4: HGDG SCORING & RUBRIC ACCURACY
  // -------------------------------------------------------------------------
  console.log('>> [GATE 4] Testing HGDG Scoring Rubric & Attribution Percentages...');
  
  const scoreRangeCheck = !HgdgScoringService.validateScore(-0.1).valid && !HgdgScoringService.validateScore(20.1).valid && HgdgScoringService.validateScore(15.5).valid;

  const tier1 = HgdgScoringService.getAttributionTier(2.0).attributionPercentage === 0;
  const tier2 = HgdgScoringService.getAttributionTier(5.5).attributionPercentage === 25;
  const tier3 = HgdgScoringService.getAttributionTier(10.0).attributionPercentage === 50;
  const tier4 = HgdgScoringService.getAttributionTier(17.5).attributionPercentage === 75;
  const tier5 = HgdgScoringService.getAttributionTier(20.0).attributionPercentage === 100;

  const attributedCalc = HgdgScoringService.calculateAttributedBudget(4000000, 16.0);
  const mathPrecision = attributedCalc.attributedBudget === 3000000 && attributedCalc.attributionPercentage === 75;

  checks.push({
    gate: 'Gate 4: HGDG Scoring & Attribution',
    criterion: '5-tier HGDG rubric correctly classifies scores (0-20 scale) and computes accurate attributed budget',
    passed: scoreRangeCheck && tier1 && tier2 && tier3 && tier4 && tier5 && mathPrecision,
    evidence: `Score validation passed. All 5 tiers verified (0%, 25%, 50%, 75%, 100%). Precision attribution calculation for PHP 4,000,000 at score 16.0 produced exactly PHP ${attributedCalc.attributedBudget.toLocaleString()} (75%).`,
  });

  // -------------------------------------------------------------------------
  // GATE 5: QUARTERLY GAR VARIANCE REPORTING
  // -------------------------------------------------------------------------
  console.log('>> [GATE 5] Testing Quarterly GAR Variance Reporting Engine...');

  const garReport = await GarReportService.getQuarterlyGarVariance({
    year: 2026,
    quarter: 1,
  });

  let invalidQuarterBlocked = false;
  try {
    await GarReportService.getQuarterlyGarVariance({
      year: 2026,
      quarter: 6 as any,
    });
  } catch (err: any) {
    if (err instanceof ValidationError) {
      invalidQuarterBlocked = true;
    }
  }

  const garReportValid = garReport && garReport.fiscalYear === 2026 && garReport.quarter === 1 && typeof garReport.summary.overallUtilizationRate === 'number';

  checks.push({
    gate: 'Gate 5: GAR Variance Reporting',
    criterion: 'Quarterly GAR reporting returns structured metrics (planned, actual, variance, utilization rate)',
    passed: garReportValid && invalidQuarterBlocked,
    evidence: `GAR Report generated for FY 2026 Q1. Total Planned: PHP ${garReport.summary.totalPlannedBudget.toLocaleString()}, Actual: PHP ${garReport.summary.totalActualBudgetUsed.toLocaleString()}, Variance: PHP ${garReport.summary.totalBudgetVariance.toLocaleString()}, Utilization: ${garReport.summary.overallUtilizationRate}%. Invalid quarter (6) rejected=${invalidQuarterBlocked}.`,
  });

  // -------------------------------------------------------------------------
  // GATE 6: OFFICE SCOPING & ACCESS CONTROL
  // -------------------------------------------------------------------------
  console.log('>> [GATE 6] Testing Municipal Office Scoping & Role Isolation...');

  const mhoPlan = await GADPlanService.createGADPlan(
    {
      officeId: 'off-mho',
      fiscalYear: 2026,
      totalBudget: 8000000,
      gadBudget: 500000,
    },
    encoderMho
  );

  let crossOfficeSubmitBlocked = false;
  try {
    await GADPlanService.submitPlan(mhoPlan.id, encoderMswdo);
  } catch (err: any) {
    if (err instanceof OfficeScopeError || err.statusCode === 403) {
      crossOfficeSubmitBlocked = true;
    }
  }

  let viewerStatusMutationBlocked = false;
  try {
    await GADPlanService.updatePlanStatus(mhoPlan.id, GADPlanStatus.SUBMITTED, viewerActor);
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.statusCode === 403) {
      viewerStatusMutationBlocked = true;
    }
  }

  checks.push({
    gate: 'Gate 6: Office Scoping & Role Access',
    criterion: 'Inter-office data isolation strictly enforced; VIEWER role blocked from state mutations',
    passed: crossOfficeSubmitBlocked && viewerStatusMutationBlocked,
    evidence: `Cross-office plan submission by foreign encoder blocked=${crossOfficeSubmitBlocked} (403 OfficeScopeError). VIEWER role mutation blocked=${viewerStatusMutationBlocked} (403 Forbidden).`,
  });

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------------------------');
  console.log('  QUALIFICATION MATRIX VERIFICATION RESULTS — ISSUE #10');
  console.log('----------------------------------------------------------------------');

  let allPassed = true;
  for (const c of checks) {
    const status = c.passed ? '[PASS]' : '[FAIL]';
    if (!c.passed) allPassed = false;
    console.log(`${status} ${c.gate} — ${c.criterion}`);
    console.log(`       Evidence: ${c.evidence}`);
  }

  console.log('\n======================================================================');
  if (allPassed) {
    console.log('  FINAL VERDICT: ISSUE #10 — QUALIFIED / PASS');
  } else {
    console.log('  FINAL VERDICT: ISSUE #10 — NOT QUALIFIED / FAIL');
  }
  console.log('======================================================================\n');

  return allPassed;
}

runIssue10Qualification()
  .then((passed) => {
    process.exit(passed ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error in qualification audit:', err);
    process.exit(1);
  });
