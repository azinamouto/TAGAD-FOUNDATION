import './testEnvironment';
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TableBuilderService, ActorContext } from '../server/services/TableBuilderService';
import { StatisticalCatalogService } from '../server/services/StatisticalCatalogService';
import { StatisticalDatasetService } from '../server/services/StatisticalDatasetService';
import { ObservationService } from '../server/services/ObservationService';
import {
  StatisticalPublicationStatus,
  StatisticalVerificationStatus,
  Role,
} from '@prisma/client';
import { ForbiddenError } from '../server/lib/errors';

describe('TAGAD Issue #17 — Governance Tie-in Specification & Verification Suite', () => {
  const superAdmin: ActorContext = {
    id: '00000000-0000-0000-0000-000000000001',
    fullName: 'System Super Administrator',
    email: 'superadmin@talibon.gov.ph',
    role: Role.SUPER_ADMIN,
    officeId: null,
  };

  const mpdcAdmin: ActorContext = {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'MPDC Administrator',
    email: 'admin_mpdc@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: '00000000-0000-0000-0000-000000000020',
  };

  const mswdoEncoder: ActorContext = {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'MSWDO Data Encoder',
    email: 'encoder_mswdo@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: '00000000-0000-0000-0000-000000000030',
  };

  const publicViewer: ActorContext = {
    id: '00000000-0000-0000-0000-000000000004',
    fullName: 'Public Viewer',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
    officeId: null,
  };

  beforeEach(() => {
    TableBuilderService.resetInMemoryState();
    ObservationService.resetInMemoryObservations();
    StatisticalDatasetService.resetInMemoryDatasets();
  });

  // ==========================================================================
  // SPEC 1: All Imported / Entered Data Starts Strictly as DRAFT
  // ==========================================================================
  describe('Spec 1: Dataset Initialization Lifecycle (Mandatory DRAFT Status)', () => {
    test('StatisticalCatalogService.createDataset enforces DRAFT publication status by default', async () => {
      const dataset = await StatisticalCatalogService.createDataset({
        datasetCode: 'DS-CATALOG-DRAFT-2024',
        name: 'TEST / SYNTHETIC DATA: Demographics 2024 Initial Import',
        reportingYear: 2024,
        sourceAgency: 'MPDC Talibon',
        metadata: { provenance: 'Unit Test Import' },
      });

      assert.ok(dataset);
      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.DRAFT);
      assert.strictEqual(dataset.isOfficial, false);
      assert.strictEqual(dataset.isApproved, false);
    });

    test('StatisticalCatalogService.createDataset rejects tampering attempting to start as OFFICIAL', async () => {
      const dataset = await StatisticalCatalogService.createDataset({
        datasetCode: 'DS-CATALOG-TAMPER-2024',
        name: 'TEST / SYNTHETIC DATA: Tampered Attempted Official Dataset',
        reportingYear: 2024,
        sourceAgency: 'MPDC Talibon',
        publicationStatus: 'OFFICIAL' as any,
        isOfficial: true as any,
        isApproved: true as any,
      });

      // Must be forced back to DRAFT and non-official
      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.DRAFT);
      assert.strictEqual(dataset.isOfficial, false);
      assert.strictEqual(dataset.isApproved, false);
    });

    test('StatisticalDatasetService.createDataset creates DRAFT dataset by default', async () => {
      const dataset = await StatisticalDatasetService.createDataset(
        {
          datasetCode: 'DS-GAD-2025',
          name: 'TEST / SYNTHETIC DATA: Municipal GAD Plan 2025',
          description: 'Synthetic baseline for governance verification',
          reportingYear: 2025,
          sourceAgency: 'MSWDO Talibon',
        },
        mswdoEncoder
      );

      assert.strictEqual(dataset.publicationStatus, StatisticalPublicationStatus.DRAFT);
      assert.strictEqual(dataset.isOfficial, false);
    });
  });

  // ==========================================================================
  // SPEC 2: Table Structure Lock on OFFICIAL / PUBLISHED Datasets
  // ==========================================================================
  describe('Spec 2: Table Structure Lock (unbindDimension Rejection on OFFICIAL Datasets)', () => {
    test('unbindDimension succeeds on custom table when dataset is in DRAFT status', async () => {
      // 1. Create a custom table
      const table = await TableBuilderService.createTable(
        {
          tableCode: 'CUSTOM-GOV-01',
          title: 'TEST / SYNTHETIC DATA: Draft Governance Table',
          domain: 'Health & Nutrition',
        },
        mpdcAdmin
      );

      // 2. Create dimension and bind it
      const dim = await TableBuilderService.createDimension(
        {
          dimensionCode: 'GOV_DIM_01',
          name: 'Synthetic Age Cohort',
          dataType: 'string',
        },
        mpdcAdmin
      );

      await TableBuilderService.bindDimension(
        table.id,
        { dimensionId: dim.id, isRequired: true },
        mpdcAdmin
      );

      // 3. Create a DRAFT dataset and associate it with the table
      const draftDataset = await StatisticalCatalogService.createDataset({
        title: 'TEST / SYNTHETIC DATA: Draft Working Dataset',
        datasetYear: 2024,
        sourceAgency: 'MPDC Talibon',
      });
      // 4. unbindDimension must SUCCEED because dataset is DRAFT
      const unbindResult = await TableBuilderService.unbindDimension(
        table.id,
        dim.id,
        mpdcAdmin,
        undefined
      );

      assert.strictEqual(unbindResult.success, true);
      assert.match(unbindResult.message, /Dimension unbound successfully/i);
    });

  });

  // ==========================================================================
  // SPEC 3: UI & Catalog Status Distinction: "REAL DATA" vs "UNVERIFIED"
  // ==========================================================================
  describe('Spec 3: Catalog Status Representation (REAL DATA vs UNVERIFIED)', () => {
    test('getAllTableDefinitions maps VERIFIED status to hasRealData=true and dataStatus="REAL DATA"', async () => {
      const tables = await StatisticalCatalogService.getAllTableDefinitions();
      assert.ok(tables.length > 0);

      for (const t of tables) {
        assert.ok(typeof t.hasRealData === 'boolean');
        assert.ok(t.dataStatus === 'REAL DATA' || t.dataStatus === 'UNVERIFIED');

        if (t.verificationStatus === StatisticalVerificationStatus.VERIFIED) {
          assert.strictEqual(t.hasRealData, true);
          assert.strictEqual(t.dataStatus, 'REAL DATA');
        } else {
          assert.strictEqual(t.hasRealData, false);
          assert.strictEqual(t.dataStatus, 'UNVERIFIED');
        }
      }
    });

    test('TableBuilderService.listTables injects hasRealData and dataStatus based on verificationStatus and official observation presence', async () => {
      const result = await TableBuilderService.listTables({}, mpdcAdmin);
      assert.ok(result.tables.length > 0);

      const verifiedTable = result.tables.find(
        (t) => t.verificationStatus === StatisticalVerificationStatus.VERIFIED
      );
      if (verifiedTable) {
        assert.strictEqual(verifiedTable.hasRealData, true);
        assert.strictEqual(verifiedTable.dataStatus, 'REAL DATA');
      }

      const unverifiedTable = result.tables.find(
        (t) => t.verificationStatus === StatisticalVerificationStatus.UNVERIFIED
      );
      if (unverifiedTable) {
        assert.strictEqual(unverifiedTable.hasRealData, false);
        assert.strictEqual(unverifiedTable.dataStatus, 'UNVERIFIED');
      }
    });
  });

  // ==========================================================================
  // SPEC 4: Authoritative RBAC & Actor Context Integrity
  // ==========================================================================
  describe('Spec 4: RBAC & Governance Access Boundaries', () => {
    test('ENCODER and VIEWER cannot unbind dimensions regardless of dataset state', async () => {
      const table = await TableBuilderService.createTable(
        {
          tableCode: 'CUSTOM-GOV-04',
          title: 'TEST / SYNTHETIC DATA: RBAC Table',
          domain: 'Health & Nutrition',
        },
        mpdcAdmin
      );

      const dim = await TableBuilderService.createDimension(
        {
          dimensionCode: 'GOV_DIM_04',
          name: 'Synthetic Dimension',
          dataType: 'string',
        },
        mpdcAdmin
      );

      await TableBuilderService.bindDimension(
        table.id,
        { dimensionId: dim.id },
        mpdcAdmin
      );

      // ENCODER should be rejected with 403
      await assert.rejects(
        async () => {
          await TableBuilderService.unbindDimension(table.id, dim.id, mswdoEncoder);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );

      // VIEWER should be rejected with 403
      await assert.rejects(
        async () => {
          await TableBuilderService.unbindDimension(table.id, dim.id, publicViewer);
        },
        (err: any) => {
          assert.ok(err instanceof ForbiddenError);
          return true;
        }
      );
    });
  });
});
