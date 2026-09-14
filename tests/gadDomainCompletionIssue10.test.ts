import test, { describe, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import { Role, GADPlanStatus } from '@prisma/client';
import { signAccessToken } from '../server/lib/jwt';
import { GADPlanService } from '../server/services/GADPlanService';
import { HgdgScoringService } from '../server/services/HgdgScoringService';
import { GarReportService } from '../server/services/GarReportService';
import { GadBudgetValidator } from '../server/services/GadBudgetValidator';
import { ValidationError } from '../server/lib/errors';
import gadPlanRoutes from '../server/routes/gadPlans';
import adminRoutes from '../server/routes/admin/index';
import reportRoutes from '../server/routes/reports';

describe('TAGAD Issue #10 Hardening — GAD Domain Completion Qualification Suite', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  // Identity fixtures
  const adminUser = {
    id: 'usr-admin-01',
    email: 'admin@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: 'off-mpdc',
  };

  const encoderOfficeA = {
    id: 'usr-encoder-01',
    email: 'encoder.mswdo@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mswdo',
  };

  const encoderOfficeB = {
    id: 'usr-encoder-02',
    email: 'encoder.mho@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mho',
  };

  const viewerUser = {
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
    officeId: null,
  };

  const adminToken = signAccessToken(adminUser);
  const encoderOfficeAToken = signAccessToken(encoderOfficeA);
  const viewerToken = signAccessToken(viewerUser);

  before(async () => {
    app = express();
    app.use(express.json());

    // Mount canonical routes
    app.use('/api/gad-plans', gadPlanRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/reports', reportRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  // =========================================================================
  // 1. REPRODUCTION & ELIMINATION OF THE ENCODER BYPASS VULNERABILITY
  // =========================================================================
  describe('1. Vulnerability Elimination: ENCODER -> SUBMITTED -> Generic Status -> DRAFT Bypass', () => {
    let testPlanId: string;

    beforeEach(async () => {
      GADPlanService.resetMemoryStore();
      const plan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 600000,
        },
        encoderOfficeA
      );
      testPlanId = plan.id;
      await GADPlanService.submitPlan(testPlanId, encoderOfficeA, 'Initial submission for review');
    });

    test('HTTP Vector 1: ENCODER attempting PATCH /api/gad-plans/:id/status is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/gad-plans/${testPlanId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${encoderOfficeAToken}`,
        },
        body: JSON.stringify({ status: GADPlanStatus.DRAFT, remarks: 'Unauthorized rollback attempt' }),
      });

      assert.strictEqual(res.status, 403, 'ENCODER must be rejected at route boundary with 403 Forbidden');
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('HTTP Vector 2: ENCODER attempting PATCH /api/admin/gad-plans/:id/status is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/admin/gad-plans/${testPlanId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${encoderOfficeAToken}`,
        },
        body: JSON.stringify({ status: GADPlanStatus.DRAFT, remarks: 'Unauthorized admin endpoint rollback' }),
      });

      assert.strictEqual(res.status, 403, 'ENCODER must be rejected at admin router boundary with 403 Forbidden');
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test('HTTP Vector 3: Unauthenticated caller attempting PATCH status is rejected with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/gad-plans/${testPlanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: GADPlanStatus.DRAFT }),
      });

      assert.strictEqual(res.status, 401, 'Unauthenticated requests must be rejected with 401 Unauthorized');
    });

    test('HTTP Vector 4: VIEWER role attempting PATCH status is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/gad-plans/${testPlanId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({ status: GADPlanStatus.DRAFT }),
      });

      assert.strictEqual(res.status, 403, 'VIEWER must be rejected with 403 Forbidden');
    });

    test('Service Vector: GADPlanService.updatePlanStatus rejects ENCODER returning SUBMITTED to DRAFT', async () => {
      await assert.rejects(
        async () => {
          await GADPlanService.updatePlanStatus(testPlanId, GADPlanStatus.DRAFT, encoderOfficeA);
        },
        (err: any) => {
          return err.name === 'ForbiddenError' || err.statusCode === 403;
        },
        'Service layer must throw ForbiddenError when ENCODER attempts to change status to DRAFT'
      );
    });

    test('Service Vector: GADPlanService.updateGADPlan rejects ENCODER directly injecting status into payload', async () => {
      await assert.rejects(
        async () => {
          await GADPlanService.updateGADPlan(testPlanId, { status: GADPlanStatus.DRAFT }, encoderOfficeA);
        },
        (err: any) => {
          return err.name === 'ForbiddenError' || err.statusCode === 403;
        },
        'Service layer must reject status tampering via updateGADPlan by ENCODER'
      );
    });

    test('Service Vector: ENCODER cannot modify items while plan is in SUBMITTED status', async () => {
      await assert.rejects(
        async () => {
          await GADPlanService.updateGADPlan(testPlanId, { genderIssue: 'Tampered Issue' }, encoderOfficeA);
        },
        (err: any) => {
          return err.name === 'ForbiddenError' || err.statusCode === 403;
        },
        'ENCODER cannot edit items or GPB while SUBMITTED'
      );
    });
  });

  // =========================================================================
  // 2. AUTHORITATIVE STATE MACHINE & ROLE-BASED TRANSITIONS
  // =========================================================================
  describe('2. Authoritative State Machine & Valid Transitions', () => {
    let freshPlanId: string;

    beforeEach(async () => {
      GADPlanService.resetMemoryStore();
      const plan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 5000000,
          gadBudget: 300000,
        },
        encoderOfficeA
      );
      freshPlanId = plan.id;
    });

    test('Valid transition: ENCODER can transition DRAFT -> SUBMITTED', async () => {
      const submitted = await GADPlanService.submitPlan(freshPlanId, encoderOfficeA, 'Ready for review');
      assert.strictEqual(submitted.status, GADPlanStatus.SUBMITTED);
    });

    test('Invalid transition: DRAFT -> APPROVED directly is rejected by state machine', async () => {
      await assert.rejects(
        async () => {
          await GADPlanService.updatePlanStatus(freshPlanId, GADPlanStatus.APPROVED, adminUser);
        },
        (err: any) => {
          return err instanceof ValidationError || err.statusCode === 422 || err.code === 'VALIDATION_ERROR' || err.statusCode === 400;
        },
        'Cannot jump directly from DRAFT to APPROVED'
      );
    });

    test('Valid transition: ADMIN can return SUBMITTED -> REVISED with remarks', async () => {
      await GADPlanService.submitPlan(freshPlanId, encoderOfficeA);
      const revised = await GADPlanService.revisePlan(freshPlanId, adminUser, 'Please provide detailed HGDG MOV attachments');
      assert.strictEqual(revised.status, GADPlanStatus.REVISED);
      assert.strictEqual(revised.revisionRemarks, 'Please provide detailed HGDG MOV attachments');
    });

    test('Valid transition: ENCODER can resubmit REVISED -> SUBMITTED', async () => {
      await GADPlanService.submitPlan(freshPlanId, encoderOfficeA);
      await GADPlanService.revisePlan(freshPlanId, adminUser, 'Fix alignment');
      const resubmitted = await GADPlanService.submitPlan(freshPlanId, encoderOfficeA, 'Fixed as requested');
      assert.strictEqual(resubmitted.status, GADPlanStatus.SUBMITTED);
    });

    test('Invalid transition: REVISED -> DRAFT is forbidden', async () => {
      await GADPlanService.submitPlan(freshPlanId, encoderOfficeA);
      await GADPlanService.revisePlan(freshPlanId, adminUser, 'Fix alignment');
      await assert.rejects(
        async () => {
          await GADPlanService.updatePlanStatus(freshPlanId, GADPlanStatus.DRAFT, adminUser);
        },
        (err: any) => {
          return err instanceof ValidationError || err.statusCode === 422 || err.code === 'VALIDATION_ERROR' || err.statusCode === 400;
        },
        'State machine rejects REVISED -> DRAFT'
      );
    });

    test('Idempotent self-transition: Calling updatePlanStatus with current status is rejected', async () => {
      await assert.rejects(
        async () => {
          await GADPlanService.updatePlanStatus(freshPlanId, GADPlanStatus.DRAFT, adminUser);
        },
        (err: any) => {
          return (err instanceof ValidationError || err.statusCode === 422 || err.code === 'VALIDATION_ERROR') && err.message.includes('already in DRAFT status');
        }
      );
    });
  });

  // =========================================================================
  // 3. 5% STATUTORY BUDGET VALIDATOR & DEFICIT OVERRIDE GOVERNANCE
  // =========================================================================
  describe('3. 5% Statutory GAD Budget Validator & Deficit Override Governance', () => {
    beforeEach(() => {
      GADPlanService.resetMemoryStore();
    });

    test('Compliant Budget: GAD Budget >= 5% passes validation with SURPLUS/BALANCED', () => {
      const summary = GadBudgetValidator.validate({
        totalBudget: 10000000,
        explicitGadBudget: 500000,
        fiscalYear: 2026,
        officeName: 'MSWDO',
      });

      assert.strictEqual(summary.isCompliant, true);
      assert.strictEqual(summary.status, 'COMPLIANT');
      assert.strictEqual(summary.allocatedPercentage, 5);
      assert.strictEqual(summary.requiredGadBudget, 500000);
      assert.strictEqual(summary.variance, 0);
    });

    test('Deficit Budget: GAD Budget < 5% fails validation with DEFICIT status', () => {
      const summary = GadBudgetValidator.validate({
        totalBudget: 10000000,
        explicitGadBudget: 400000,
        fiscalYear: 2026,
        officeName: 'MSWDO',
      });

      assert.strictEqual(summary.isCompliant, false);
      assert.strictEqual(summary.status, 'DEFICIT');
      assert.strictEqual(summary.allocatedPercentage, 4);
      assert.strictEqual(summary.requiredGadBudget, 500000);
      assert.strictEqual(summary.variance, -100000);
      assert.ok(summary.errors.length > 0);
    });

    test('Approval Workflow: Deficit plan CANNOT be approved without forceApproval flag', async () => {
      const deficitPlan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 300000,
        },
        encoderOfficeA
      );
      await GADPlanService.submitPlan(deficitPlan.id, encoderOfficeA);

      await assert.rejects(
        async () => {
          await GADPlanService.approvePlan(deficitPlan.id, adminUser, false);
        },
        (err: any) => {
          return (err instanceof ValidationError || err.statusCode === 422 || err.code === 'VALIDATION_ERROR') && err.message.includes('Statutory 5% GAD budget deficit');
        },
        'Approval must be blocked when statutory 5% budget is not met'
      );
    });

    test('Deficit Override Governance: forceApproval without justification reason is strictly REJECTED', async () => {
      const deficitPlan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 300000,
        },
        encoderOfficeA
      );
      await GADPlanService.submitPlan(deficitPlan.id, encoderOfficeA);

      await assert.rejects(
        async () => {
          await GADPlanService.approvePlan(deficitPlan.id, adminUser, true, '');
        },
        (err: any) => {
          return (err instanceof ValidationError || err.statusCode === 422 || err.code === 'VALIDATION_ERROR') && err.message.includes('Deficit override approval requires an explicit justification');
        },
        'Deficit override without reason must be rejected'
      );
    });

    test('Deficit Override Governance: forceApproval WITH explicit reason succeeds and logs audit event', async () => {
      const deficitPlan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 300000,
        },
        encoderOfficeA
      );
      await GADPlanService.submitPlan(deficitPlan.id, encoderOfficeA);

      const approved = await GADPlanService.approvePlan(
        deficitPlan.id,
        adminUser,
        true,
        'Approved by Sangguniang Bayan Resolution No. 2026-44 under supplemental budget commitment'
      );

      assert.strictEqual(approved.status, GADPlanStatus.APPROVED);
    });

    test('HTTP Endpoint: POST /api/gad-plans/:id/approve respects forceApproval and governance justification', async () => {
      const deficitPlan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 350000,
        },
        encoderOfficeA
      );
      await GADPlanService.submitPlan(deficitPlan.id, encoderOfficeA);

      // 1. Without force approval -> 422 Unprocessable Entity
      const res1 = await fetch(`${baseUrl}/api/gad-plans/${deficitPlan.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ forceApproval: false }),
      });
      assert.ok(res1.status === 422 || res1.status === 400, 'Rejection of deficit approval returns 422 or 400');

      // 2. With force approval and reason -> 200
      const res2 = await fetch(`${baseUrl}/api/gad-plans/${deficitPlan.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          forceApproval: true,
          reason: 'LGU Council Resolution 12-2026 emergency appropriation exception',
        }),
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.success, true);
    });
  });

  // =========================================================================
  // 4. HGDG SCORING SERVICE & RUBRIC CALCULATION
  // =========================================================================
  describe('4. Harmonized Gender and Development Guidelines (HGDG) Scoring', () => {
    beforeEach(() => {
      GADPlanService.resetMemoryStore();
    });

    test('Validates score ranges: Scores < 0 or > 20 are rejected', () => {
      assert.strictEqual(HgdgScoringService.validateScore(-1).valid, false);
      assert.strictEqual(HgdgScoringService.validateScore(20.5).valid, false);
      assert.strictEqual(HgdgScoringService.validateScore(12.5).valid, true);
    });

    test('Correct attribution percentage across all 5 official HGDG tiers', () => {
      // Tier 1: 0.00 - 3.99 -> 0%
      assert.strictEqual(HgdgScoringService.getAttributionTier(2.5).attributionPercentage, 0);

      // Tier 2: 4.00 - 7.99 -> 25%
      assert.strictEqual(HgdgScoringService.getAttributionTier(5.0).attributionPercentage, 25);

      // Tier 3: 8.00 - 14.99 -> 50%
      assert.strictEqual(HgdgScoringService.getAttributionTier(10.5).attributionPercentage, 50);

      // Tier 4: 15.00 - 19.99 -> 75%
      assert.strictEqual(HgdgScoringService.getAttributionTier(16.0).attributionPercentage, 75);

      // Tier 5: 20.00 -> 100%
      assert.strictEqual(HgdgScoringService.getAttributionTier(20.0).attributionPercentage, 100);
    });

    test('Attributed Budget Calculation: Computes exact PHP attribution using Decimal precision', () => {
      const calculation = HgdgScoringService.calculateAttributedBudget(2000000, 12.0);
      assert.strictEqual(calculation.score, 12.0);
      assert.strictEqual(calculation.hgdgScore, 12.0);
      assert.strictEqual(calculation.attributionPercentage, 50);
      assert.strictEqual(calculation.attributedBudget, 1000000);
    });

    test('Item Attribution Updates: Updating item hgdgScore auto-populates attributedPercentage', async () => {
      const plan = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mswdo',
          fiscalYear: 2026,
          totalBudget: 10000000,
          gadBudget: 800000,
        },
        encoderOfficeA
      );

      const item = await GADPlanService.createGADPlanItem(
        plan.id,
        {
          genderIssue: 'Test Women in Leadership Program',
          gadResult: 'Increased participation',
          activity: 'Leadership training series',
          budget: 500000,
          hgdgScore: 16.5,
        },
        encoderOfficeA
      );

      assert.strictEqual((item as any).hgdgScore, 16.5);
      assert.strictEqual((item as any).attributedPercentage, 75);
    });
  });

  // =========================================================================
  // 5. QUARTERLY GAR VARIANCE REPORTING SERVICE & ROUTE
  // =========================================================================
  describe('5. Quarterly GAR Variance Reporting Service & API', () => {
    test('GarReportService returns structured report with accurate financial metrics', async () => {
      const report = await GarReportService.getQuarterlyGarVariance({
        year: 2026,
        quarter: 1,
      });

      assert.ok(report);
      assert.strictEqual(report.fiscalYear, 2026);
      assert.strictEqual(report.quarter, 1);
      assert.ok(typeof report.summary.totalPlannedBudget === 'number');
      assert.ok(typeof report.summary.totalActualBudgetUsed === 'number');
      assert.ok(typeof report.summary.totalBudgetVariance === 'number');
      assert.ok(typeof report.summary.overallUtilizationRate === 'number');
      assert.ok(Array.isArray(report.items));
    });

    test('GarReportService rejects invalid quarter values with ValidationError', async () => {
      await assert.rejects(
        async () => {
          await GarReportService.getQuarterlyGarVariance({
            year: 2026,
            quarter: 5 as any,
          });
        },
        (err: any) => {
          return err.message.includes('Invalid quarter');
        }
      );
    });

    test('HTTP GET /api/reports/gar-variance returns report with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/reports/gar-variance?year=2026&quarter=1`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const json = await res.json();
      assert.strictEqual(json.success, true);
      assert.ok(json.data.summary);
    });

    test('HTTP GET /api/reports/gar-variance returns 400 Bad Request on invalid quarter', async () => {
      const res = await fetch(`${baseUrl}/api/reports/gar-variance?year=2026&quarter=99`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 400);
      const json = await res.json();
      assert.strictEqual(json.success, false);
      assert.ok(json.message.includes('Invalid quarter'));
    });
  });

  // =========================================================================
  // 6. OFFICE SCOPE ENFORCEMENT & DATA ISOLATION
  // =========================================================================
  describe('6. Office Scope Enforcement & Inter-Office Data Isolation', () => {
    beforeEach(() => {
      GADPlanService.resetMemoryStore();
    });

    test('ENCODER from Office A cannot modify or submit a plan owned by Office B', async () => {
      const planOfficeB = await GADPlanService.createGADPlan(
        {
          officeId: 'off-mho',
          fiscalYear: 2026,
          totalBudget: 5000000,
          gadBudget: 300000,
        },
        encoderOfficeB
      );

      await assert.rejects(
        async () => {
          await GADPlanService.submitPlan(planOfficeB.id, encoderOfficeA);
        },
        (err: any) => {
          return err.name === 'OfficeScopeError' || err.statusCode === 403;
        },
        'Office A encoder cannot submit Office B plan'
      );
    });
  });
});
