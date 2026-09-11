import test, { describe, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import adminRoutes from '../backend/server/routes/admin/index';
import { signAccessToken } from '../backend/server/lib/jwt';
import { TableBuilderService } from '../backend/server/services/TableBuilderService';
import { ObservationService } from '../backend/server/services/ObservationService';
import { StatisticalDatasetService } from '../backend/server/services/StatisticalDatasetService';
import { StatisticalObservationIngestionService } from '../backend/server/services/StatisticalObservationIngestionService';
import { Role, StatisticalPublicationStatus } from '@prisma/client';

describe('TAGAD Issue #16 — Statistical CSV Import Pipeline Suite', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  // Actor Tokens
  const superAdminToken = signAccessToken({
    id: 'usr-superadmin-01',
    email: 'superadmin@talibon.gov.ph',
    role: Role.SUPER_ADMIN,
  });

  const adminToken = signAccessToken({
    id: 'usr-admin-01',
    email: 'admin@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: 'off-mpdc',
  });

  const encoderMpdcToken = signAccessToken({
    id: 'usr-encoder-mpdc',
    email: 'mpdc_encoder@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mpdc',
  });

  const encoderMswdoToken = signAccessToken({
    id: 'usr-encoder-01',
    email: 'encoder@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mswdo',
  });

  const viewerToken = signAccessToken({
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
  });

  const adminActor = {
    id: 'usr-admin-01',
    email: 'admin@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: 'off-mpdc',
  };

  // Test Fixtures
  let testTable: any;
  let testDatasetMpdc: any;
  let testDatasetMswdo: any;
  let lockedOfficialDataset: any;

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const port = (server.address() as AddressInfo).port;
        baseUrl = `http://localhost:${port}/api/admin`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(async () => {
    // Reset state isolation
    TableBuilderService.resetInMemoryState();
    StatisticalDatasetService.resetInMemoryDatasets();
    ObservationService.resetInMemoryObservations();

    // 1. Create a Statistical Table with Dimensions and Indicators
    testTable = await TableBuilderService.createTable(
      {
        tableCode: 'TBL-DEMO-01',
        title: 'Talibon Population by Barangay and Sex',
        domain: 'DEMOGRAPHY',
        rowGrain: 'BARANGAY',
      },
      adminActor
    );

    // Bind DIM_SEX dimension (Allowed values: MALE, FEMALE)
    await TableBuilderService.bindDimension(
      testTable.id,
      {
        dimensionCode: 'DIM_SEX',
        displayOrder: 1,
        isRequired: true,
        allowedValues: ['MALE', 'FEMALE'],
      },
      adminActor
    );

    // Create Indicators
    const indTotal = await TableBuilderService.createIndicator(
      testTable.id,
      {
        indicatorCode: 'IND_POP_TOTAL',
        name: 'Total Population',
        title: 'Total Population',
        unit: 'Persons',
      },
      adminActor
    );

    const indMale = await TableBuilderService.createIndicator(
      testTable.id,
      {
        indicatorCode: 'IND_POP_MALE',
        name: 'Male Population',
        title: 'Male Population',
        unit: 'Persons',
      },
      adminActor
    );

    const indFemale = await TableBuilderService.createIndicator(
      testTable.id,
      {
        indicatorCode: 'IND_POP_FEMALE',
        name: 'Female Population',
        title: 'Female Population',
        unit: 'Persons',
      },
      adminActor
    );

    // Refresh table with bindings & indicators
    testTable = await TableBuilderService.getTableById(testTable.id, adminActor);

    // 2. Create MPDC Draft Dataset
    testDatasetMpdc = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-MPDC-2024-DRAFT',
        name: '2024 MPDC Demographic Registry (Draft)',
        reportingPeriod: '2024',
        reportingYear: 2024,
      },
      adminActor
    );

    // 3. Create MSWDO Draft Dataset
    testDatasetMswdo = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-MSWDO-2024-DRAFT',
        name: '2024 MSWDO Social Indicators (Draft)',
        reportingPeriod: '2024',
        reportingYear: 2024,
      },
      adminActor
    );

    // 4. Create an OFFICIAL Locked Dataset
    lockedOfficialDataset = await StatisticalDatasetService.createDataset(
      {
        datasetCode: 'DS-MPDC-2023-OFFICIAL',
        name: '2023 MPDC Official Statistics (Locked)',
        reportingPeriod: '2023',
        reportingYear: 2023,
      },
      adminActor
    );
    // Transition to OFFICIAL via VALIDATED
    await StatisticalDatasetService.transitionStatus(
      lockedOfficialDataset.id,
      StatisticalPublicationStatus.VALIDATED,
      adminActor
    );
    await StatisticalDatasetService.transitionStatus(
      lockedOfficialDataset.id,
      StatisticalPublicationStatus.OFFICIAL,
      adminActor
    );
  });

  describe('1. CSV Discovery & Profiling Endpoint', () => {
    test('POST /statistical-import/discover profiles CSV and suggests candidate mappings', async () => {
      const csv = [
        'Year,Barangay,Sex,Value',
        '2024,Poblacion,FEMALE,1250',
        '2024,San Roque,MALE,980',
        '2024,TLB-BAL,FEMALE,430',
      ].join('\n');

      const res = await fetch(`${baseUrl}/statistical-import/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          filename: 'demographics_sample.csv',
          tableId: testTable.id,
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.totalRows, 3);
      assert.equal(json.data.totalColumns, 4);

      // Verify Column Profiles
      const colMap = new Map<string, any>(json.data.columns.map((c: any) => [c.name, c]));
      assert.equal(colMap.get('Year').inferredRole, 'PERIOD');
      assert.equal(colMap.get('Barangay').inferredRole, 'BARANGAY');
      assert.equal(colMap.get('Value').inferredRole, 'MEASURE_VALUE');

      // Verify Candidate Mappings
      const candidate = json.data.candidateMappings;
      assert.ok(candidate);
      assert.equal(candidate.period?.sourceColumn, 'Year');
      assert.equal(candidate.barangay?.sourceColumn, 'Barangay');
      assert.equal(candidate.numericValueColumn?.sourceColumn, 'Value');
      assert.equal(candidate.dimensions?.DIM_SEX?.sourceColumn, 'Sex');
    });

    test('Rejects empty CSV content with 422 ValidationError', async () => {
      const res = await fetch(`${baseUrl}/statistical-import/discover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: '',
        }),
      });

      assert.equal(res.status, 422);
      const json = await res.json();
      assert.equal(json.success, false);
    });
  });

  describe('2. Side-Effect Free Preview Matrix', () => {
    test('POST /statistical-import/preview validates RECORD_PER_ROW mode with barangay resolution', async () => {
      const csv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,1500',
        '2024,Brgy. San Roque,MALE,1200',
        '2024,TLB-BAG,FEMALE,850',
        '2024,Talibon,MALE,5000', // Municipal token -> null barangayId
      ].join('\n');

      const res = await fetch(`${baseUrl}/statistical-import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            indicator: { constantIndicatorId: testTable.indicators[0].id },
            dimensions: {
              DIM_SEX: { sourceColumn: 'Sex' },
            },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.equal(json.data.valid, true);
      assert.equal(json.data.totalRows, 4);
      assert.equal(json.data.validRows, 4);
      assert.equal(json.data.invalidRows, 0);

      // Verify Poblacion resolved
      assert.equal(json.data.rows[0].coordinate.barangayName, 'Poblacion');
      assert.equal(json.data.rows[0].status, 'VALID');

      // Verify Brgy. San Roque normalized match
      assert.equal(json.data.rows[1].coordinate.barangayName, 'San Roque');
      assert.equal(json.data.rows[1].status, 'VALID');

      // Verify TLB-BAG code match
      assert.equal(json.data.rows[2].coordinate.barangayName, 'Bagacay');
      assert.equal(json.data.rows[2].status, 'VALID');

      // Verify Municipal Total (Talibon)
      assert.equal(json.data.rows[3].coordinate.barangayId, null);
      assert.equal(json.data.rows[3].status, 'VALID');

      // Assure preview is side-effect free (zero observations created)
      assert.equal(ObservationService.getInMemoryObservations().length, 0);
    });

    test('POST /statistical-import/preview unpivots MEASURE_COLUMNS mode correctly', async () => {
      const csv = [
        'Year,Barangay,MaleCount,FemaleCount',
        '2024,Poblacion,450,550',
        '2024,San Roque,300,320',
      ].join('\n');

      const indMale = testTable.indicators.find((i: any) => i.indicatorCode === 'IND_POP_MALE');
      const indFemale = testTable.indicators.find((i: any) => i.indicatorCode === 'IND_POP_FEMALE');

      const res = await fetch(`${baseUrl}/statistical-import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'MEASURE_COLUMNS',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            measureColumns: [
              { columnName: 'MaleCount', indicatorId: indMale.id },
              { columnName: 'FemaleCount', indicatorId: indFemale.id },
            ],
            dimensions: {
              DIM_SEX: { constantValue: 'MALE' },
            },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      // 2 CSV rows * 2 measure columns = 4 unpivoted observations
      assert.equal(json.data.totalRows, 4);
      assert.equal(json.data.validRows, 4);
      assert.equal(json.data.invalidRows, 0);
    });

    test('Flags unresolved barangay and invalid dimension vocabulary', async () => {
      const csv = [
        'Year,Barangay,Sex,Count',
        '2024,UnknownFantasyIsland,FEMALE,100', // Invalid barangay
        '2024,Poblacion,INVALID_SEX,200', // Invalid dimension allowed value
      ].join('\n');

      const res = await fetch(`${baseUrl}/statistical-import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: {
              DIM_SEX: { sourceColumn: 'Sex' },
            },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.data.valid, false);
      assert.equal(json.data.invalidRows, 2);
      assert.ok(json.data.rows[0].errors[0].includes('Unresolved barangay'));
      assert.ok(json.data.rows[1].errors[0].includes('Invalid value'));
    });
  });

  describe('3. Duplicate Strategies (REJECT, SKIP, OVERWRITE)', () => {
    test('Intra-batch duplicate collision: REJECT blocks preview and execution', async () => {
      const csv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,100',
        '2024,Poblacion,FEMALE,150', // Duplicate coordinate in same CSV
      ].join('\n');

      // 1. Preview
      const previewRes = await fetch(`${baseUrl}/statistical-import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      const previewJson = await previewRes.json();
      assert.equal(previewJson.data.valid, false);
      assert.equal(previewJson.data.duplicateRowsWithinFile, 1);
      assert.ok(previewJson.data.blockingErrors.length > 0);

      // 2. Execute should fail with 409 Conflict
      const execRes = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(execRes.status, 409);
    });

    test('Intra-batch duplicate collision: SKIP strategy skips duplicate row', async () => {
      const csv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,100',
        '2024,Poblacion,FEMALE,150', // Duplicate in file
      ].join('\n');

      const execRes = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'SKIP',
        }),
      });

      assert.equal(execRes.status, 201);
      const json = await execRes.json();
      assert.equal(json.data.insertedCount, 1);
      assert.equal(json.data.skippedCount, 1);

      // Check stored observation has first row value (100)
      const stored = ObservationService.getInMemoryObservations();
      assert.equal(stored.length, 1);
      assert.equal(stored[0].numericValue, 100);
    });

    test('Collision with existing database record: OVERWRITE strategy updates record', async () => {
      // 1. Insert initial observation
      const initialCsv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,500',
      ].join('\n');

      await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: initialCsv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(ObservationService.getInMemoryObservations().length, 1);
      assert.equal(ObservationService.getInMemoryObservations()[0].numericValue, 500);

      // 2. Import updated value for same coordinate with OVERWRITE
      const updatedCsv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,950',
      ].join('\n');

      const updateRes = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: updatedCsv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'OVERWRITE',
        }),
      });

      assert.equal(updateRes.status, 201);
      const updateJson = await updateRes.json();
      assert.equal(updateJson.data.insertedCount, 0);
      assert.equal(updateJson.data.updatedCount, 1);
      assert.equal(updateJson.data.skippedCount, 0);

      // Stored observation updated to 950
      assert.equal(ObservationService.getInMemoryObservations().length, 1);
      assert.equal(ObservationService.getInMemoryObservations()[0].numericValue, 950);
    });
  });

  describe('4. Dataset Lifecycle Governance Enforcement', () => {
    test('Import into locked OFFICIAL dataset is strictly rejected with 403 Forbidden', async () => {
      const csv = [
        'Year,Barangay,Sex,Count',
        '2023,Poblacion,FEMALE,100',
      ].join('\n');

      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: csv,
          datasetId: lockedOfficialDataset.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 403);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.message.includes('locked'));
    });
  });

  describe('5. RBAC & Office Scoping Enforcement', () => {
    const validCsv = [
      'Year,Barangay,Sex,Count',
      '2024,Poblacion,FEMALE,100',
    ].join('\n');

    test('ENCODER can import into own office dataset', async () => {
      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${encoderMpdcToken}`,
        },
        body: JSON.stringify({
          csvContent: validCsv,
          datasetId: testDatasetMpdc.id, // off-mpdc
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 201);
    });

    test('ENCODER is rejected when attempting to import into another office dataset (403 OfficeScopeError)', async () => {
      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${encoderMswdoToken}`, // off-mswdo
        },
        body: JSON.stringify({
          csvContent: validCsv,
          datasetId: testDatasetMpdc.id, // belongs to off-mpdc
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 403);
    });

    test('VIEWER role is rejected with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewerToken}`,
        },
        body: JSON.stringify({
          csvContent: validCsv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 403);
    });

    test('Unauthenticated request is rejected with 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/statistical-import/preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvContent: validCsv,
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {},
          duplicateStrategy: 'REJECT',
        }),
      });

      assert.equal(res.status, 401);
    });
  });

  describe('6. Transactional Atomicity, Provenance & Authoritative Dimensions Hash', () => {
    test('Strict transactional abort on invalid row: zero partial observations or provenance remain', async () => {
      // Deterministic fixture: 2 valid rows, 1 intentionally invalid row (non-numeric value)
      const mixedCsv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,150',
        '2024,San Roque,MALE,INVALID_COUNT_STRING',
        '2024,Bagacay,FEMALE,250',
      ].join('\n');

      const initialCount = ObservationService.getInMemoryObservations().length;
      assert.equal(initialCount, 0);

      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: mixedCsv,
          filename: 'synthetic_mixed_batch.csv',
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
        }),
      });

      // Strict failure with 422 Unprocessable Entity
      assert.equal(res.status, 422);
      const json = await res.json();
      assert.equal(json.success, false);
      assert.ok(json.error.message.includes('validation'));

      // Verify zero partial observations written
      const finalCount = ObservationService.getInMemoryObservations().length;
      assert.equal(finalCount, 0, 'No partial observations should be persisted on validation failure');
    });

    test('Authoritative dimension hash and provenance attribution on successful execution', async () => {
      const validCsv = [
        'Year,Barangay,Sex,Count',
        '2024,Poblacion,FEMALE,750',
      ].join('\n');

      const res = await fetch(`${baseUrl}/statistical-import/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          csvContent: validCsv,
          filename: 'test_demographics_2024.csv',
          datasetId: testDatasetMpdc.id,
          tableId: testTable.id,
          ingestionMode: 'RECORD_PER_ROW',
          mapping: {
            period: { sourceColumn: 'Year' },
            barangay: { sourceColumn: 'Barangay' },
            numericValueColumn: 'Count',
            dimensions: { DIM_SEX: { sourceColumn: 'Sex' } },
          },
          duplicateStrategy: 'REJECT',
          methodologyNotes: 'TEST / SYNTHETIC DATA for qualification audit',
        }),
      });

      assert.equal(res.status, 201);
      const json = await res.json();
      assert.equal(json.data.insertedCount, 1);
      assert.ok(json.data.provenanceId);

      // Verify stored record
      const stored = ObservationService.getInMemoryObservations();
      assert.equal(stored.length, 1);
      const obs = stored[0];
      assert.equal(obs.numericValue, 750);
      assert.equal(obs.period, '2024');

      // Verify dimensions hash matches authoritative ObservationService implementation
      const expectedHashResult = ObservationService.validateDimensions(testTable, { DIM_SEX: 'FEMALE' });
      assert.equal(obs.dimensionsHash, expectedHashResult.dimensionsHash);
      assert.equal(obs.provenanceId, json.data.provenanceId);
    });
  });
});

