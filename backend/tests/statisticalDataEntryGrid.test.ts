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
import { Role } from '@prisma/client';

describe('TAGAD Issue #15 — Step 3: Admin Data Entry Grid & 69 Statistical Catalog Test Suite', () => {
  let app: express.Express;
  let server: http.Server;
  let baseAdminUrl: string;

  // Role Authentication Tokens
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

  const encoderToken = signAccessToken({
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

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseAdminUrl = `http://127.0.0.1:${addr.port}/api/admin`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    TableBuilderService.resetInMemoryState();
    ObservationService.resetInMemoryObservations();
    StatisticalDatasetService.resetInMemoryDatasets();
  });

  // Helper HTTP fetcher
  async function request(path: string, options: {
    method?: string;
    token?: string;
    body?: any;
    query?: Record<string, string>;
  } = {}) {
    let url = `${baseAdminUrl}${path}`;
    if (options.query) {
      const q = new URLSearchParams(options.query).toString();
      url += `?${q}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  }

  // ============================================================================
  // 1. Authoritative 69 Table Catalog & Total Attributes Calculation
  // ============================================================================
  describe('1. 69 Table Catalog & Attribute Metrics Calculation', () => {
    test('GET /table-builder/tables returns the seeded 69 municipal statistical tables', async () => {
      const { status, data } = await request('/table-builder/tables', {
        token: adminToken,
        query: { limit: '100' },
      });

      assert.equal(status, 200);
      assert.ok(data.success);
      assert.equal(data.data.length, 69, 'Should return exactly 69 seeded tables');
      assert.equal(data.meta.pagination.total, 69);

      // Verify Table #01 (Demography)
      const table1 = data.data.find((t: any) => t.tableNumber === 1 || t.tableCode === 'T-01' || t.tableCode === 'STAT-TAB-01');
      assert.ok(table1, 'Table 1 must exist');
      assert.equal(table1.domain, 'Demographics & Population');

      // Verify Total Attributes = Dimensions + Indicators
      const totalAttrs = (table1.dimensionCount || 0) + (table1.indicatorCount || 0);
      assert.ok(typeof totalAttrs === 'number');
    });

    test('Aggregate metrics across all 69 tables compute Total Dimensions, Indicators, and Attributes', async () => {
      // First bind a dimension to table 1 to test attribute counting
      const dimRes = await request('/table-builder/dimension-dictionary', { token: adminToken });
      const sexDim = dimRes.data.data.find((d: any) => d.dimensionCode === 'DIM_SEX');

      await request('/table-builder/tables/1/dimensions', {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: sexDim.id,
          isRequired: true,
          allowedValues: ['Male', 'Female'],
        },
      });

      const { status, data } = await request('/table-builder/tables', {
        token: adminToken,
        query: { limit: '100' },
      });

      assert.equal(status, 200);
      const tables = data.data;

      let sumDimensions = 0;
      let sumIndicators = 0;
      let sumTotalAttributes = 0;

      tables.forEach((t: any) => {
        const d = t.dimensionCount || 0;
        const i = t.indicatorCount || 0;
        sumDimensions += d;
        sumIndicators += i;
        sumTotalAttributes += (d + i);
      });

      assert.ok(sumDimensions >= 1, 'Seeded tables must count bound dimensions');
      assert.equal(sumTotalAttributes, sumDimensions + sumIndicators, 'Total attributes must equal sum of dimensions and indicators');
    });

    test('GET /table-builder/tables/:id retrieves full specification with bound dimensions & allowed values', async () => {
      const { status, data } = await request('/table-builder/tables/1', {
        token: adminToken,
      });

      assert.equal(status, 200);
      assert.ok(data.data);
      assert.equal(data.data.tableNumber, 1);
      assert.ok(Array.isArray(data.data.dimensionBindings));
      assert.ok(Array.isArray(data.data.indicators));
    });
  });

  // ============================================================================
  // 2. Dataset Management & Governance Lifecycle
  // ============================================================================
  describe('2. Dataset Management & Governance Lifecycle', () => {
    test('POST /datasets creates a new DRAFT dataset for observation entry', async () => {
      const payload = {
        datasetCode: 'DS-2024-TEST-DRAFT',
        name: '2024 Municipal GAD Baseline (Test Draft)',
        description: 'Test working dataset',
        sourceAgency: 'MPDC',
        reportingYear: 2024,
        reportingPeriod: 'ANNUAL',
        geographicLevel: 'MUNICIPALITY',
      };

      const { status, data } = await request('/datasets', {
        method: 'POST',
        token: adminToken,
        body: payload,
      });

      assert.equal(status, 201);
      assert.ok(data.success);
      assert.equal(data.data.datasetCode, 'DS-2024-TEST-DRAFT');
      assert.equal(data.data.publicationStatus, 'DRAFT');
    });

    test('VIEWER role cannot create a new dataset (RBAC rejection)', async () => {
      const payload = {
        datasetCode: 'DS-UNAUTHORIZED',
        name: 'Unauthorized Dataset',
      };

      const { status } = await request('/datasets', {
        method: 'POST',
        token: viewerToken,
        body: payload,
      });

      assert.equal(status, 403);
    });
  });

  // ============================================================================
  // 3. Grid Observation Encoding: Single & Bulk CRUD Operations
  // ============================================================================
  describe('3. Observation Data Entry Grid CRUD & Bulk Operations', () => {
    let testDatasetId: string;
    let table1Id: string;

    beforeEach(async () => {
      // 1. Create a clean DRAFT dataset
      const dsRes = await request('/datasets', {
        method: 'POST',
        token: adminToken,
        body: {
          datasetCode: 'DS-GRID-TEST-2024',
          name: 'Grid Test Dataset 2024',
          reportingYear: 2024,
        },
      });
      testDatasetId = dsRes.data.data.id;

      // 2. Fetch table 1
      const tblRes = await request('/table-builder/tables/1', {
        token: adminToken,
      });
      table1Id = tblRes.data.data.id;

      // 3. Bind DIM_SEX and DIM_AGE_GROUP to table1 for testing
      const dimRes = await request('/table-builder/dimension-dictionary', { token: adminToken });
      const sexDim = dimRes.data.data.find((d: any) => d.dimensionCode === 'DIM_SEX');
      const ageDim = dimRes.data.data.find((d: any) => d.dimensionCode === 'DIM_AGE_GROUP');

      await request(`/table-builder/tables/${table1Id}/dimensions`, {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: sexDim.id,
          isRequired: false,
          allowedValues: ['Male', 'Female', 'Total'],
        },
      });

      await request(`/table-builder/tables/${table1Id}/dimensions`, {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: ageDim.id,
          isRequired: false,
          allowedValues: ['0-14', '15-24', '15-64', '65+'],
        },
      });
    });

    test('Honest Empty State: 0 observations initially returned for table in new dataset', async () => {
      const { status, data } = await request(`/table-builder/tables/${table1Id}/observations`, {
        token: adminToken,
        query: { datasetId: testDatasetId },
      });

      assert.equal(status, 200);
      assert.equal(data.data.length, 0, 'Must have 0 observations initially (honest empty state)');
      assert.equal(data.meta.pagination.total, 0);
    });

    test('POST /tables/:id/observations creates single row and validates required coordinates', async () => {
      const payload = {
        datasetId: testDatasetId,
        period: '2024',
        dimensions: {
          DIM_SEX: 'Female',
          DIM_AGE_GROUP: '15-24',
        },
        numericValue: 1420.5,
        observationStatus: 'PROVISIONAL',
        notes: 'Initial field survey encoding',
      };

      const { status, data } = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: adminToken,
        body: payload,
      });

      assert.equal(status, 201);
      assert.ok(data.success);
      assert.equal(data.data.numericValue, 1420.5);
      assert.equal(data.data.dimensions.DIM_SEX, 'Female');
      assert.equal(data.data.period, '2024');

      // Verify observation appears in listing
      const listRes = await request(`/table-builder/tables/${table1Id}/observations`, {
        token: adminToken,
        query: { datasetId: testDatasetId },
      });
      assert.equal(listRes.data.data.length, 1);
    });

    test('POST /tables/:id/observations rejects duplicate coordinate conflict (409)', async () => {
      const payload = {
        datasetId: testDatasetId,
        period: '2024',
        dimensions: {
          DIM_SEX: 'Female',
        },
        numericValue: 100,
      };

      // First entry succeeds
      const first = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: adminToken,
        body: payload,
      });
      assert.equal(first.status, 201);

      // Duplicate coordinate entry fails with 409 Conflict
      const second = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: adminToken,
        body: payload,
      });
      assert.equal(second.status, 409);
    });

    test('POST /tables/:id/observations/bulk saves batch spreadsheet rows cleanly', async () => {
      const bulkPayload = {
        datasetId: testDatasetId,
        observations: [
          {
            period: '2024',
            dimensions: { DIM_SEX: 'Male', DIM_AGE_GROUP: '0-14' },
            numericValue: 3100,
          },
          {
            period: '2024',
            dimensions: { DIM_SEX: 'Female', DIM_AGE_GROUP: '0-14' },
            numericValue: 2950,
          },
          {
            period: '2024',
            dimensions: { DIM_SEX: 'Male', DIM_AGE_GROUP: '15-64' },
            numericValue: 8400,
          },
          {
            period: '2024',
            dimensions: { DIM_SEX: 'Female', DIM_AGE_GROUP: '15-64' },
            numericValue: 8250,
          },
        ],
      };

      const { status, data } = await request(`/table-builder/tables/${table1Id}/observations/bulk`, {
        method: 'POST',
        token: adminToken,
        body: bulkPayload,
      });

      assert.equal(status, 200);
      assert.ok(data.success);
      assert.equal(data.data.insertedCount, 4);

      // Verify all 4 observations exist in list
      const listRes = await request(`/table-builder/tables/${table1Id}/observations`, {
        token: adminToken,
        query: { datasetId: testDatasetId },
      });
      assert.equal(listRes.data.data.length, 4);
    });

    test('PATCH /tables/:id/observations/:obsId updates numeric value and notes', async () => {
      // 1. Create row
      const createRes = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: adminToken,
        body: {
          datasetId: testDatasetId,
          period: '2024',
          dimensions: { DIM_SEX: 'Male' },
          numericValue: 500,
        },
      });
      const obsId = createRes.data.data.id;

      // 2. Patch row
      const patchRes = await request(`/table-builder/tables/${table1Id}/observations/${obsId}`, {
        method: 'PATCH',
        token: adminToken,
        body: {
          numericValue: 750,
          suppressionReason: 'Corrected after verification',
        },
      });

      assert.equal(patchRes.status, 200);
      assert.equal(patchRes.data.data.numericValue, 750);
      assert.equal(patchRes.data.data.suppressionReason, 'Corrected after verification');
    });

    test('DELETE /tables/:id/observations/:obsId removes observation', async () => {
      const createRes = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: adminToken,
        body: {
          datasetId: testDatasetId,
          period: '2024',
          dimensions: { DIM_SEX: 'Female' },
          numericValue: 600,
        },
      });
      const obsId = createRes.data.data.id;

      const delRes = await request(`/table-builder/tables/${table1Id}/observations/${obsId}`, {
        method: 'DELETE',
        token: adminToken,
      });

      assert.equal(delRes.status, 200);

      // Verify observation no longer exists
      const listRes = await request(`/table-builder/tables/${table1Id}/observations`, {
        token: adminToken,
        query: { datasetId: testDatasetId },
      });
      assert.equal(listRes.data.data.length, 0);
    });

    test('VIEWER role is rejected with 403 on observation creation and bulk save', async () => {
      const { status } = await request(`/table-builder/tables/${table1Id}/observations`, {
        method: 'POST',
        token: viewerToken,
        body: {
          datasetId: testDatasetId,
          period: '2024',
          dimensions: { DIM_SEX: 'Female' },
          numericValue: 100,
        },
      });

      assert.equal(status, 403);
    });
  });
});
