import './testEnvironment';
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { StatisticalDatasetService, ActorContext } from '../server/services/StatisticalDatasetService';
import { StatisticalPublicationStatus, Role } from '@prisma/client';

describe('Sprint 7 Phase 4 — Dataset Governance & Lifecycle Transition Engine', () => {
  // Define Test Actors
  const superAdmin: ActorContext = {
    id: '00000000-0000-0000-0000-000000000001',
    fullName: 'System Super Administrator',
    email: 'superadmin@talibon.gov.ph',
    role: Role.SUPER_ADMIN,
    officeId: null,
  };

  const adminUser: ActorContext = {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'MPDC Planning Admin',
    email: 'admin_mpdc@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: 'office-mpdc-uuid',
  };

  const encoderOfficeA: ActorContext = {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'MSWDO Staff Encoder',
    email: 'encoder_mswdo@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'office-mswdo-uuid',
  };

  const encoderOfficeB: ActorContext = {
    id: '00000000-0000-0000-0000-000000000004',
    fullName: 'RHU Health Encoder',
    email: 'encoder_rhu@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'office-rhu-uuid',
  };

  const viewerUser: ActorContext = {
    id: '00000000-0000-0000-0000-000000000005',
    fullName: 'Guest Observer',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
    officeId: null,
  };

  beforeEach(() => {
    StatisticalDatasetService.resetInMemoryDatasets();
  });

  describe('1. Authoritative State Machine Validation Logic (canTransition)', () => {
    test('Identity Check: Rejects transition to the exact same status', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.DRAFT,
        adminUser
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /already in DRAFT status/i);
    });

    test('Draft Valid Pathways: DRAFT -> VALIDATED is allowed for Admin', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.VALIDATED,
        adminUser
      );
      assert.strictEqual(check.allowed, true);
    });

    test('Draft Valid Pathways: DRAFT -> WITHDRAWN is allowed for Admin with reason', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.WITHDRAWN,
        adminUser,
        null,
        { reason: 'Duplicate survey batch imported erroneously' }
      );
      assert.strictEqual(check.allowed, true);
    });

    test('Draft Invalid Pathways: DRAFT -> OFFICIAL is forbidden (illegal skip)', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.OFFICIAL,
        adminUser
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Illegal state transition/i);
    });

    test('Draft Invalid Pathways: DRAFT -> PUBLISHED is forbidden (illegal skip)', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.PUBLISHED,
        superAdmin
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Illegal state transition/i);
    });

    test('Validated Valid Pathways: VALIDATED -> OFFICIAL is allowed for Admin', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.OFFICIAL,
        adminUser
      );
      assert.strictEqual(check.allowed, true);
    });

    test('Validated Invalid Pathways: VALIDATED -> DRAFT is forbidden (no regression)', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.DRAFT,
        adminUser
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Illegal state transition/i);
    });

    test('Validated Invalid Pathways: VALIDATED -> PUBLISHED is forbidden (requires officialization first)', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.PUBLISHED,
        superAdmin
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Illegal state transition/i);
    });

    test('Official Valid Pathways: OFFICIAL -> PUBLISHED is allowed for Super Admin', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.PUBLISHED,
        superAdmin
      );
      assert.strictEqual(check.allowed, true);
    });

    test('Official RBAC: OFFICIAL -> PUBLISHED is forbidden for regular ADMIN (Super Admin required)', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.PUBLISHED,
        adminUser
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /SUPER_ADMIN/i);
      assert.strictEqual(check.httpStatus, 403);
    });

    test('Official Invalid Pathways: OFFICIAL -> DRAFT and OFFICIAL -> VALIDATED are forbidden', () => {
      const checkDraft = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.DRAFT,
        adminUser
      );
      assert.strictEqual(checkDraft.allowed, false);

      const checkValidated = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.VALIDATED,
        adminUser
      );
      assert.strictEqual(checkValidated.allowed, false);
    });

    test('Terminal State: WITHDRAWN datasets cannot be transitioned to ANY status', () => {
      const targets = [
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.OFFICIAL,
        StatisticalPublicationStatus.PUBLISHED,
      ];
      for (const target of targets) {
        const check = StatisticalDatasetService.canTransition(
          StatisticalPublicationStatus.WITHDRAWN,
          target,
          superAdmin
        );
        assert.strictEqual(check.allowed, false);
        assert.match(check.reason!, /Terminal State Violation/i);
      }
    });

    test('Revocation Precondition: WITHDRAWN transition without reason is rejected', () => {
      const checkNoReason = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.VALIDATED,
        StatisticalPublicationStatus.WITHDRAWN,
        adminUser,
        null,
        { reason: '' }
      );
      assert.strictEqual(checkNoReason.allowed, false);
      assert.match(checkNoReason.reason!, /revocation reason/i);
      assert.strictEqual(checkNoReason.httpStatus, 422);
    });
  });

  describe('2. RBAC Access Control Enforcement', () => {
    test('ENCODER cannot transition datasets to VALIDATED', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.VALIDATED,
        encoderOfficeA
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Encoders are not authorized/i);
      assert.strictEqual(check.httpStatus, 403);
    });

    test('ENCODER cannot withdraw datasets', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.WITHDRAWN,
        encoderOfficeA,
        null,
        { reason: 'Revocation requested' }
      );
      assert.strictEqual(check.allowed, false);
      assert.strictEqual(check.httpStatus, 403);
    });

    test('VIEWER cannot perform any lifecycle transition', () => {
      const check = StatisticalDatasetService.canTransition(
        StatisticalPublicationStatus.DRAFT,
        StatisticalPublicationStatus.VALIDATED,
        viewerUser
      );
      assert.strictEqual(check.allowed, false);
      assert.match(check.reason!, /Viewers have read-only access/i);
      assert.strictEqual(check.httpStatus, 403);
    });

    test('VIEWER cannot create new datasets', async () => {
      await assert.rejects(
        async () => {
          await StatisticalDatasetService.createDataset(
            {
              datasetCode: 'VIEWER-ATTEMPT-01',
              name: 'Unauthorized Dataset',
            },
            viewerUser
          );
        },
        {
          name: 'AppError',
          message: 'Viewers have read-only access and cannot create datasets',
          statusCode: 403,
        }
      );
    });

    test('ENCODER can create datasets strictly in DRAFT status', async () => {
      const dataset = await StatisticalDatasetService.createDataset(
        {
          datasetCode: 'TEST-ENCODER-DATASET-01',
          name: 'Barangay Health Station Survey 2024',
          description: 'Quarterly nutrition status summary',
          sourceAgency: 'RHU Talibon',
          reportingYear: 2024,
        },
        encoderOfficeA
      );

      assert.strictEqual(dataset.datasetCode, 'TEST-ENCODER-DATASET-01');
      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.DRAFT);
      assert.strictEqual(dataset.isOfficial, false);
      assert.strictEqual(dataset.isPublished, false);
      assert.strictEqual(dataset.importedById, encoderOfficeA.id);
    });
  });

  describe('3. Office-Scope Isolation', () => {
    test('ENCODER from Office A cannot view unapproved draft of Office B', async () => {
      // In seed data, d3333333-3333-3333-3333-333333333333 is DRAFT belonging to MSWDO (office-mswdo-uuid)
      // Encoder B is RHU (office-rhu-uuid)
      await assert.rejects(
        async () => {
          await StatisticalDatasetService.getDatasetById(
            'd3333333-3333-3333-3333-333333333333',
            encoderOfficeB
          );
        },
        {
          name: 'AppError',
          code: 'OFFICE_SCOPE_MISMATCH',
          statusCode: 403,
        }
      );
    });

    test('ENCODER from Office A CAN view draft belonging to their own office', async () => {
      const dataset = await StatisticalDatasetService.getDatasetById(
        'd3333333-3333-3333-3333-333333333333',
        encoderOfficeA
      );
      assert.strictEqual(dataset.id, 'd3333333-3333-3333-3333-333333333333');
      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.DRAFT);
    });

    test('ENCODER from Office B CAN view PUBLISHED datasets regardless of originating office', async () => {
      // d1111111-1111-1111-1111-111111111111 is PUBLISHED
      const dataset = await StatisticalDatasetService.getDatasetById(
        'd1111111-1111-1111-1111-111111111111',
        encoderOfficeB
      );
      assert.strictEqual(dataset.id, 'd1111111-1111-1111-1111-111111111111');
      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.PUBLISHED);
    });

    test('ADMIN and SUPER_ADMIN can view all datasets across offices', async () => {
      const adminView = await StatisticalDatasetService.getDatasetById(
        'd3333333-3333-3333-3333-333333333333',
        adminUser
      );
      assert.strictEqual(adminView.id, 'd3333333-3333-3333-3333-333333333333');

      const superAdminView = await StatisticalDatasetService.getDatasetById(
        'd3333333-3333-3333-3333-333333333333',
        superAdmin
      );
      assert.strictEqual(superAdminView.id, 'd3333333-3333-3333-3333-333333333333');
    });
  });

  describe('4. Full Lifecycle Transition Execution & Audit History', () => {
    test('Execute Full Lifecycle Pipeline: DRAFT -> VALIDATED -> OFFICIAL -> PUBLISHED -> WITHDRAWN', async () => {
      // 1. Create DRAFT dataset
      const created = await StatisticalDatasetService.createDataset(
        {
          datasetCode: 'LIFECYCLE-PIPELINE-01',
          name: 'Talibon Gender Disaggregated Labor Matrix 2024',
          reportingYear: 2024,
        },
        adminUser
      );
      assert.strictEqual(created.publicationStatus, StatisticalPublicationStatus.DRAFT);
      assert.strictEqual(created.isOfficial, false);
      assert.strictEqual(created.isPublished, false);

      // 2. Validate Dataset (DRAFT -> VALIDATED)
      const valResult = await StatisticalDatasetService.transitionStatus(
        created.id,
        StatisticalPublicationStatus.VALIDATED,
        adminUser,
        { notes: 'Structural schema verified against catalog definition' }
      );
      assert.strictEqual(valResult.dataset.publicationStatus, StatisticalPublicationStatus.VALIDATED);
      assert.strictEqual(valResult.dataset.isOfficial, false);
      assert.strictEqual(valResult.dataset.isPublished, false);

      // 3. Department Officialization (VALIDATED -> OFFICIAL)
      const offResult = await StatisticalDatasetService.transitionStatus(
        created.id,
        StatisticalPublicationStatus.OFFICIAL,
        adminUser,
        { signOffBy: 'Engr. Planning Officer' }
      );
      assert.strictEqual(offResult.dataset.publicationStatus, StatisticalPublicationStatus.OFFICIAL);
      assert.strictEqual(offResult.dataset.isOfficial, true);
      assert.strictEqual(offResult.dataset.isPublished, false);

      // 4. Executive Public Release (OFFICIAL -> PUBLISHED)
      const pubResult = await StatisticalDatasetService.transitionStatus(
        created.id,
        StatisticalPublicationStatus.PUBLISHED,
        superAdmin,
        { notes: 'Approved for public GAD portal display' }
      );
      assert.strictEqual(pubResult.dataset.publicationStatus, StatisticalPublicationStatus.PUBLISHED);
      assert.strictEqual(pubResult.dataset.isOfficial, true);
      assert.strictEqual(pubResult.dataset.isPublished, true);

      // 5. Revocation (PUBLISHED -> WITHDRAWN)
      const withResult = await StatisticalDatasetService.withdrawDataset(
        created.id,
        'Superseded by updated Census data release Q3 2024',
        superAdmin,
        'Archived for historical record'
      );
      assert.strictEqual(withResult.dataset.publicationStatus, StatisticalPublicationStatus.WITHDRAWN);

      // 6. Verify Terminal State Lockout (Attempting to validate a withdrawn dataset is rejected)
      await assert.rejects(
        async () => {
          await StatisticalDatasetService.transitionStatus(
            created.id,
            StatisticalPublicationStatus.VALIDATED,
            superAdmin
          );
        },
        {
          name: 'AppError',
          statusCode: 400,
        }
      );
    });

    test('Audit history retrieval retrieves dataset status trail', async () => {
      const history = await StatisticalDatasetService.getDatasetHistory(
        'd1111111-1111-1111-1111-111111111111',
        superAdmin
      );
      assert.ok(history.dataset);
      assert.strictEqual(history.dataset.id, 'd1111111-1111-1111-1111-111111111111');
      assert.ok(Array.isArray(history.history));
    });
  });
});
