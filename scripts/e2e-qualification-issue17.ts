import dotenv from 'dotenv';
dotenv.config();

import { Role, StatisticalPublicationStatus, StatisticalVerificationStatus } from '@prisma/client';
import { TableBuilderService, ActorContext } from '../server/services/TableBuilderService';
import { ObservationService } from '../server/services/ObservationService';
import { StatisticalDatasetService } from '../server/services/StatisticalDatasetService';
import { StatisticalCatalogService } from '../server/services/StatisticalCatalogService';
import { StatisticalObservationIngestionService } from '../server/services/StatisticalObservationIngestionService';
import { BarangayService } from '../server/services/BarangayService';
import { isDatabaseConnected } from '../server/lib/prisma';

interface TestResult {
  step: string;
  name: string;
  pass: boolean;
  evidence: string;
  details?: any;
}

async function runIssue17Qualification() {
  console.log('======================================================================');
  console.log('  TAGAD ISSUE #17 — STATISTICAL GOVERNANCE TIE-IN QUALIFICATION AUDIT');
  console.log('======================================================================\n');

  const results: TestResult[] = [];

  // 0. Reset state for clean qualification run
  TableBuilderService.resetInMemoryState();
  StatisticalDatasetService.resetInMemoryDatasets();
  ObservationService.resetInMemoryObservations();

  const barangays = await BarangayService.getBarangays();
  console.log(`>> [SETUP] Database connected: ${isDatabaseConnected()}`);
  console.log(`>> [SETUP] Loaded ${barangays.length} canonical Talibon barangays.`);

  // Define Qualified Actors
  const superAdminActor: ActorContext = {
    id: 'usr-superadmin-01',
    email: 'superadmin@talibon.gov.ph',
    fullName: 'System Super Admin',
    role: Role.SUPER_ADMIN,
    officeId: null,
  };

  const mpdcAdminActor: ActorContext = {
    id: 'usr-mpdc-admin-01',
    email: 'admin_mpdc@talibon.gov.ph',
    fullName: 'MPDC Head Administrator',
    role: Role.ADMIN,
    officeId: '00000000-0000-0000-0000-000000000020',
  };

  const mswdoEncoderActor: ActorContext = {
    id: 'usr-mswdo-encoder-01',
    email: 'encoder_mswdo@talibon.gov.ph',
    fullName: 'MSWDO Data Encoder',
    role: Role.ENCODER,
    officeId: '00000000-0000-0000-0000-000000000030',
  };

  const publicViewerActor: ActorContext = {
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    fullName: 'Public Transparency Viewer',
    role: Role.VIEWER,
    officeId: null,
  };

  // =========================================================================
  // PHASE 1: Dataset Initialization Lifecycle (Rule 1: Mandatory DRAFT Status)
  // =========================================================================
  try {
    console.log('>> [PHASE 1] Verifying Dataset Initialization Mandatory DRAFT Status...');

    // 1.1 Ingestion/Catalog Dataset Creation
    const catalogDataset = await StatisticalCatalogService.createDataset({
      datasetCode: 'DS-E2E-GOV-01',
      name: 'TEST / SYNTHETIC DATA: 2025 Municipal Demographic Profile',
      reportingYear: 2025,
      sourceAgency: 'MSWDO Talibon',
      // Attacker attempts to forge publicationStatus / isOfficial
      publicationStatus: StatisticalPublicationStatus.OFFICIAL,
      isOfficial: true,
      isApproved: true,
    });

    const isDraftEnforcedCatalog =
      catalogDataset.publicationStatus === StatisticalPublicationStatus.DRAFT &&
      catalogDataset.isOfficial === false &&
      catalogDataset.isApproved === false;

    // 1.2 Core Dataset Creation
    const coreDataset = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-E2E-GOV-02',
        name: 'TEST / SYNTHETIC DATA: 2025 GAD Nutrition Survey',
        reportingYear: 2025,
        sourceAgency: 'MHO Talibon',
      },
      mswdoEncoderActor
    );

    const isDraftEnforcedCore =
      coreDataset.publicationStatus === StatisticalPublicationStatus.DRAFT &&
      coreDataset.isOfficial === false;

    const pass = isDraftEnforcedCatalog && isDraftEnforcedCore;

    results.push({
      step: 'Phase 1: Initialization',
      name: 'Dataset Initialization Starts Strictly in DRAFT Status',
      pass,
      evidence: `Catalog creation enforced status=${catalogDataset.publicationStatus}, isOfficial=${catalogDataset.isOfficial}. Core service creation enforced status=${coreDataset.publicationStatus}, isOfficial=${coreDataset.isOfficial}. Anti-tampering safeguards passed.`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 1: Initialization',
      name: 'Dataset Initialization Starts Strictly in DRAFT Status',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // PHASE 2: State Machine Lifecycle Transitions & RBAC Validation
  // =========================================================================
  let governanceDataset: any;
  try {
    console.log('>> [PHASE 2] Verifying State Machine Transitions & RBAC...');

    governanceDataset = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-E2E-GOV-03',
        name: 'TEST / SYNTHETIC DATA: 2024 Talibon Labor Statistics',
        reportingYear: 2024,
        sourceAgency: 'PESO Talibon',
      },
      mpdcAdminActor
    );

    // 2.1 Viewers and Encoders cannot trigger governance transitions
    let rbacBlockedEncoder = false;
    try {
      await StatisticalDatasetService.transitionStatus(
        governanceDataset.id,
        StatisticalPublicationStatus.VALIDATED,
        mswdoEncoderActor,
        { reason: 'Encoder attempting to validate' }
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        rbacBlockedEncoder = true;
      }
    }

    let rbacBlockedViewer = false;
    try {
      await StatisticalDatasetService.transitionStatus(
        governanceDataset.id,
        StatisticalPublicationStatus.VALIDATED,
        publicViewerActor,
        { reason: 'Viewer attempting to validate' }
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        rbacBlockedViewer = true;
      }
    }

    // 2.2 Illegal transitions are blocked (cannot skip directly DRAFT -> OFFICIAL)
    let illegalTransitionBlocked = false;
    try {
      await StatisticalDatasetService.transitionStatus(
        governanceDataset.id,
        StatisticalPublicationStatus.OFFICIAL,
        superAdminActor,
        { reason: 'Attempt to skip validation' }
      );
    } catch (err: any) {
      if (err.statusCode === 400 || err.status === 400 || err.code === 'INVALID_TRANSITION') {
        illegalTransitionBlocked = true;
      }
    }

    // 2.3 Legal transition sequence: DRAFT -> VALIDATED
    const validatedResult = await StatisticalDatasetService.transitionStatus(
      governanceDataset.id,
      StatisticalPublicationStatus.VALIDATED,
      mpdcAdminActor,
      { reason: 'Validated against municipal registry standards' }
    );

    // 2.4 Legal transition sequence: VALIDATED -> OFFICIAL
    const officialResult = await StatisticalDatasetService.transitionStatus(
      governanceDataset.id,
      StatisticalPublicationStatus.OFFICIAL,
      superAdminActor,
      { reason: 'Promulgated as official municipal baseline' }
    );

    const pass =
      rbacBlockedEncoder &&
      rbacBlockedViewer &&
      illegalTransitionBlocked &&
      validatedResult.dataset.publicationStatus === StatisticalPublicationStatus.VALIDATED &&
      officialResult.dataset.publicationStatus === StatisticalPublicationStatus.OFFICIAL;

    results.push({
      step: 'Phase 2: Lifecycle RBAC',
      name: 'State Machine & RBAC Governance Enforcement',
      pass,
      evidence: `RBAC blocks: Encoder blocked=${rbacBlockedEncoder}, Viewer blocked=${rbacBlockedViewer}. Illegal transition blocked=${illegalTransitionBlocked}. Transition sequence DRAFT -> VALIDATED (${validatedResult.dataset.publicationStatus}) -> OFFICIAL (${officialResult.dataset.publicationStatus}) succeeded.`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 2: Lifecycle RBAC',
      name: 'State Machine & RBAC Governance Enforcement',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // PHASE 3: Table Structure Mutation on DRAFT Datasets (Permitted)
  // =========================================================================
  let testTable: any;
  let testDim1: any;
  let testDim2: any;
  let draftDataset: any;

  try {
    console.log('>> [PHASE 3] Verifying unbindDimension Permitted on DRAFT Datasets...');

    // Create a Table Definition
    testTable = await TableBuilderService.createTable(
      {
        tableCode: 'TBL-E2E-GOV-01',
        title: 'TEST / SYNTHETIC DATA: Population Distribution by Age and Sex',
        domain: 'Demographics',
        description: 'Test fixture for structural governance',
      },
      mpdcAdminActor
    );

    // Create 2 Dimensions
    testDim1 = await TableBuilderService.createDimension(
      {
        dimensionCode: 'DIM-E2E-SEX',
        name: 'Sex Disaggregation',
        dataType: 'string',
      },
      mpdcAdminActor
    );

    testDim2 = await TableBuilderService.createDimension(
      {
        dimensionCode: 'DIM-E2E-AGE',
        name: 'Age Groupings',
        dataType: 'string',
      },
      mpdcAdminActor
    );

    // Bind both dimensions
    await TableBuilderService.bindDimension(
      testTable.id,
      { dimensionId: testDim1.id, isRequired: true },
      mpdcAdminActor
    );

    await TableBuilderService.bindDimension(
      testTable.id,
      { dimensionId: testDim2.id, isRequired: false },
      mpdcAdminActor
    );

    // Create DRAFT Dataset and associate with table
    draftDataset = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-E2E-DRAFT-01',
        name: 'TEST / SYNTHETIC DATA: Draft Demographic Dataset',
        reportingYear: 2025,
        sourceAgency: 'MPDC Talibon',
      },
      mpdcAdminActor
    );

    TableBuilderService.associateTableWithDatasetInMemory(testTable.id, draftDataset.id);

    // Unbind dimension testDim2 while dataset is DRAFT
    const unbindResult = await TableBuilderService.unbindDimension(
      testTable.id,
      testDim2.id,
      mpdcAdminActor,
      draftDataset.id
    );

    const tableAfterUnbind = await TableBuilderService.getTableById(testTable.id, mpdcAdminActor);
    const hasDim2 = tableAfterUnbind.dimensionBindings.some((b: any) => b.dimensionId === testDim2.id || b.dimension?.id === testDim2.id);

    const pass = unbindResult.success && !hasDim2;

    results.push({
      step: 'Phase 3: DRAFT Mutation',
      name: 'Dimension Unbinding Permitted on DRAFT Datasets',
      pass,
      evidence: `Successfully unbind dimension ${testDim2.dimensionCode} while dataset status is DRAFT. Table dimension bindings count: ${tableAfterUnbind.dimensionBindings.length}.`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 3: DRAFT Mutation',
      name: 'Dimension Unbinding Permitted on DRAFT Datasets',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // PHASE 4: Table Structure Lock (Rule 2: unbindDimension Blocked on OFFICIAL)
  // =========================================================================
  try {
    console.log('>> [PHASE 4] Verifying Table Structure Lock on OFFICIAL Dataset...');

    // Re-bind testDim2 so we can attempt to unbind under lock
    await TableBuilderService.bindDimension(
      testTable.id,
      { dimensionId: testDim2.id, isRequired: false },
      mpdcAdminActor
    );

    // Associate table with OFFICIAL dataset from Phase 2
    TableBuilderService.associateTableWithDatasetInMemory(testTable.id, governanceDataset.id);

    // 4.1 Direct check: Explicit datasetId passed as OFFICIAL dataset
    let blockedExplicitOfficial = false;
    let explicitErrorMsg = '';
    try {
      await TableBuilderService.unbindDimension(
        testTable.id,
        testDim2.id,
        mpdcAdminActor,
        governanceDataset.id
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        blockedExplicitOfficial = true;
        explicitErrorMsg = err.message;
      }
    }

    // 4.2 Indirect check: unbindDimension without datasetId param, but table is associated with OFFICIAL dataset
    let blockedAssociatedOfficial = false;
    let associatedErrorMsg = '';
    try {
      await TableBuilderService.unbindDimension(
        testTable.id,
        testDim2.id,
        mpdcAdminActor
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        blockedAssociatedOfficial = true;
        associatedErrorMsg = err.message;
      }
    }

    // 4.3 Observation check: Table has existing observations in an OFFICIAL dataset
    const memObs = ObservationService.getInMemoryObservations();
    memObs.push({
      id: 'obs-e2e-gov-official-01',
      datasetId: governanceDataset.id,
      tableDefinitionId: testTable.id,
      indicatorId: null,
      barangayId: null,
      period: '2024',
      numericValue: 1250,
      unit: 'count',
      dimensions: {},
      dimensionsHash: 'none',
      provenanceId: null,
      suppressionStatus: 'NONE',
      suppressionReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    let blockedByExistingObs = false;
    try {
      await TableBuilderService.unbindDimension(
        testTable.id,
        testDim1.id,
        superAdminActor
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        blockedByExistingObs = true;
      }
    }

    const pass = blockedExplicitOfficial && blockedAssociatedOfficial && blockedByExistingObs;

    results.push({
      step: 'Phase 4: Structure Lock',
      name: 'Structural Mutation Blocked for OFFICIAL Datasets & Associated Tables',
      pass,
      evidence: `Explicit dataset check blocked=${blockedExplicitOfficial} ("${explicitErrorMsg}"). Associated dataset check blocked=${blockedAssociatedOfficial}. Ingested observation lock blocked=${blockedByExistingObs}. Table structure is strictly protected from dimension removal.`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 4: Structure Lock',
      name: 'Structural Mutation Blocked for OFFICIAL Datasets & Associated Tables',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // PHASE 5: Catalog Status Representation (Rule 3: REAL DATA vs UNVERIFIED)
  // =========================================================================
  try {
    console.log('>> [PHASE 5] Verifying Catalog Status Representation (REAL DATA vs UNVERIFIED)...');

    // 5.1 Query StatisticalCatalogService.getAllTableDefinitions
    const catalogTables = await StatisticalCatalogService.getAllTableDefinitions();

    // Find baseline unverified table
    const unverifiedTable = catalogTables.find(
      (t: any) => t.verificationStatus === StatisticalVerificationStatus.UNVERIFIED
    );

    const unverifiedHasFlag =
      unverifiedTable &&
      unverifiedTable.hasRealData === false &&
      unverifiedTable.dataStatus === 'UNVERIFIED';

    // 5.2 Create verified table with verified status and observations
    const verifiedTable = await TableBuilderService.createTable(
      {
        tableCode: 'TBL-E2E-VERIFIED-01',
        title: 'TEST / SYNTHETIC DATA: Verified Barangay Profile',
        domain: 'Demographics',
        verificationStatus: StatisticalVerificationStatus.VERIFIED,
      },
      mpdcAdminActor
    );

    // List via TableBuilderService.listTables
    const tableBuilderResult = await TableBuilderService.listTables({ limit: 100 });
    const verifiedItem = tableBuilderResult.tables.find((t: any) => t.id === verifiedTable.id);

    const verifiedHasFlag =
      verifiedItem &&
      verifiedItem.hasRealData === true &&
      verifiedItem.dataStatus === 'REAL DATA';

    const pass = Boolean(unverifiedHasFlag) && Boolean(verifiedHasFlag);

    results.push({
      step: 'Phase 5: UI & Catalog Status',
      name: 'Status Representation Distinguishes REAL DATA vs UNVERIFIED',
      pass,
      evidence: `Unverified table correctly tagged: hasRealData=${unverifiedTable?.hasRealData}, dataStatus="${unverifiedTable?.dataStatus}". Verified table correctly tagged: hasRealData=${verifiedItem?.hasRealData}, dataStatus="${verifiedItem?.dataStatus}".`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 5: UI & Catalog Status',
      name: 'Status Representation Distinguishes REAL DATA vs UNVERIFIED',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // PHASE 6: End-to-End Governance Lifecycle Integration
  // =========================================================================
  try {
    console.log('>> [PHASE 6] Verifying Full End-to-End Governance Ingestion Lifecycle...');

    // 6.1 Create Table for Ingestion
    const e2eTable = await TableBuilderService.createTable(
      {
        tableCode: 'TBL-E2E-WORKFLOW-01',
        title: 'TEST / SYNTHETIC DATA: Municipal Livelihood Statistics',
        domain: 'Economy',
      },
      mpdcAdminActor
    );

    const sexDim = await TableBuilderService.createDimension(
      {
        dimensionCode: 'DIM-WORKFLOW-SEX',
        name: 'Sex',
        dataType: 'string',
      },
      mpdcAdminActor
    );

    await TableBuilderService.bindDimension(
      e2eTable.id,
      { dimensionId: sexDim.id, isRequired: true },
      mpdcAdminActor
    );

    // 6.2 Import CSV Observation into DRAFT Dataset
    const e2eDataset = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-E2E-WORKFLOW-01',
        name: 'TEST / SYNTHETIC DATA: 2024 Livelihood Import',
        reportingYear: 2024,
        sourceAgency: 'MPDC Talibon',
      },
      mpdcAdminActor
    );

    // Initial check: Dataset is DRAFT
    const step1Draft = e2eDataset.publicationStatus === StatisticalPublicationStatus.DRAFT;

    // Ingest observations
    const csvContent = [
      'Barangay,Sex,Year,Count',
      'Poblacion,Male,2024,340',
      'Poblacion,Female,2024,390',
    ].join('\n');

    const ingestResult = await StatisticalObservationIngestionService.execute(
      {
        csvContent,
        filename: 'livelihood_qual.csv',
        datasetId: e2eDataset.id,
        tableId: e2eTable.id,
        ingestionMode: 'RECORD_PER_ROW',
        mapping: {
          period: { sourceColumn: 'Year' },
          barangay: { sourceColumn: 'Barangay' },
          numericValueColumn: 'Count',
          dimensions: { [sexDim.dimensionCode]: { sourceColumn: 'Sex' } },
        },
        duplicateStrategy: 'REJECT',
      },
      mpdcAdminActor
    );

    const step2IngestOk = ingestResult.insertedCount === 2;

    // Step 3: unbindDimension works while in DRAFT
    const testExtraDim = await TableBuilderService.createDimension(
      {
        dimensionCode: 'DIM-TEMP-WORKFLOW',
        name: 'Temporary Dimension',
        dataType: 'string',
      },
      mpdcAdminActor
    );
    await TableBuilderService.bindDimension(e2eTable.id, { dimensionId: testExtraDim.id }, mpdcAdminActor);
    const unbindDraftOk = await TableBuilderService.unbindDimension(e2eTable.id, testExtraDim.id, mpdcAdminActor, e2eDataset.id);

    // Step 4: Promote through Governance: DRAFT -> VALIDATED -> OFFICIAL
    await StatisticalDatasetService.transitionStatus(
      e2eDataset.id,
      StatisticalPublicationStatus.VALIDATED,
      mpdcAdminActor,
      { reason: 'Verified by MPDC' }
    );
    await StatisticalDatasetService.transitionStatus(
      e2eDataset.id,
      StatisticalPublicationStatus.OFFICIAL,
      superAdminActor,
      { reason: 'Officially published by Local Chief Executive' }
    );

    // Step 5: Structure is now locked! Attempting to unbind sexDim fails with 403
    let structureLockedOk = false;
    try {
      await TableBuilderService.unbindDimension(
        e2eTable.id,
        sexDim.id,
        superAdminActor,
        e2eDataset.id
      );
    } catch (err: any) {
      if (err.statusCode === 403 || err.status === 403 || err.code === 'FORBIDDEN') {
        structureLockedOk = true;
      }
    }

    const pass = step1Draft && step2IngestOk && unbindDraftOk.success && structureLockedOk;

    results.push({
      step: 'Phase 6: E2E Workflow',
      name: 'Full End-to-End Ingestion -> Governance Transition -> Structural Lock',
      pass,
      evidence: `Initial DRAFT enforced: ${step1Draft}. 2 observations ingested into DRAFT dataset. Dimension unbind in DRAFT: ${unbindDraftOk.success}. Promoted to OFFICIAL. Post-official dimension unbind locked with 403: ${structureLockedOk}. Complete lifecycle verified.`,
    });
  } catch (err: any) {
    results.push({
      step: 'Phase 6: E2E Workflow',
      name: 'Full End-to-End Ingestion -> Governance Transition -> Structural Lock',
      pass: false,
      evidence: `Failed with error: ${err.message}`,
    });
  }

  // =========================================================================
  // SUMMARY OUTPUT
  // =========================================================================
  console.log('\n----------------------------------------------------------------------');
  console.log('  QUALIFICATION MATRIX VERIFICATION RESULTS — ISSUE #17');
  console.log('----------------------------------------------------------------------');

  let allPassed = true;
  for (const r of results) {
    const status = r.pass ? 'PASS' : 'FAIL';
    if (!r.pass) allPassed = false;
    console.log(`[${status}] ${r.step} - ${r.name}`);
    console.log(`       Evidence: ${r.evidence}\n`);
  }

  console.log('======================================================================');
  if (allPassed) {
    console.log('  FINAL VERDICT: ISSUE #17 — QUALIFIED / PASS');
  } else {
    console.log('  FINAL VERDICT: ISSUE #17 — FAILED');
  }
  console.log('======================================================================\n');

  if (!allPassed) {
    process.exit(1);
  }
}

runIssue17Qualification().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
