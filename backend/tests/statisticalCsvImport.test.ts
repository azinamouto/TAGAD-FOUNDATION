import './testEnvironment';
import test, { describe, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import adminRoutes from '../server/routes/admin/index';
import { signAccessToken } from '../server/lib/jwt';
import { TableBuilderService } from '../server/services/TableBuilderService';
import { ObservationService } from '../server/services/ObservationService';
import { StatisticalDatasetService } from '../server/services/StatisticalDatasetService';
import { StatisticalObservationIngestionService } from '../server/services/StatisticalObservationIngestionService';
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
    const sexDimension = await TableBuilderService.getDimensionById('DIM_SEX');
    await TableBuilderService.bindDimension(
      testTable.id,
      {
        dimensionId: sexDimension!.id,
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

});

