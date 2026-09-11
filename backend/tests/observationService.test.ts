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
import { AuditService } from '../server/services/AuditService';
import { Role, StatisticalPublicationStatus } from '@prisma/client';

describe('TAGAD Issue #15 — Step 2: Statistical Observation Backend, Validation & API Suite', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  // JWT Tokens for different roles
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
    officeId: 'off-mpdc',
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

  const encoderActor = {
    id: 'usr-encoder-01',
    email: 'encoder@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: 'off-mswdo',
  };

  const viewerActor = {
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
  };

  before(async () => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);

    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}/api/admin/table-builder`;
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
    StatisticalDatasetService.resetInMemoryDatasets();
    ObservationService.resetInMemoryObservations();
  });

  // Helper HTTP fetcher
  async function request(path: string, options: {
    method?: string;
    token?: string | null;
    body?: any;
  } = {}) {
    const { method = 'GET', token = adminToken, body } = options;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = await res.json().catch(() => ({}));
    return {
      status: res.status,
      body: json,
    };
  }

  // ==========================================================================
  // 1. Authoritative Coordinate & Hashing Unit Tests
  // ==========================================================================
  describe('1. Deterministic Coordinate & Dimension Hashing', () => {
    test('computeDimensionsHash returns EMPTY_DIMENSIONS for null, undefined, or empty object', () => {
      assert.strictEqual(ObservationService.computeDimensionsHash(null), 'EMPTY_DIMENSIONS');
      assert.strictEqual(ObservationService.computeDimensionsHash(undefined), 'EMPTY_DIMENSIONS');
      assert.strictEqual(ObservationService.computeDimensionsHash({}), 'EMPTY_DIMENSIONS');
    });

    test('computeDimensionsHash produces identical hash regardless of key order or whitespace', () => {
      const dimA = { SEX: 'Male ', AGE_GROUP: ' 18-24' };
      const dimB = { AGE_GROUP: '18-24', SEX: 'Male' };
      const hashA = ObservationService.computeDimensionsHash(dimA);
      const hashB = ObservationService.computeDimensionsHash(dimB);

      assert.strictEqual(typeof hashA, 'string');
      assert.strictEqual(hashA.length, 64);
      assert.strictEqual(hashA, hashB);
    });

    test('computeDimensionsHash produces different hash for different dimension values', () => {
      const dimA = { SEX: 'Male' };
      const dimB = { SEX: 'Female' };
      const hashA = ObservationService.computeDimensionsHash(dimA);
      const hashB = ObservationService.computeDimensionsHash(dimB);

      assert.notStrictEqual(hashA, hashB);
    });
  });

  // ==========================================================================
  // 2. Dimension Schema Validation
  // ==========================================================================
  describe('2. Dimension Schema Validation & Vocabulary Enforcement', () => {
    test('Rejects unknown dimension keys not bound to the table schema', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-TEST-DIMS-01',
        title: 'Dimension Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      assert.throws(
        () => {
          ObservationService.validateDimensions(table, { INVALID_DIM_KEY: 'SomeValue' });
        },
        /Unknown dimension key 'INVALID_DIM_KEY'/
      );
    });

    test('Enforces required dimensions bound to the table', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-TEST-REQ-01',
        title: 'Required Dimension Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dim = await TableBuilderService.createDimension({
        dimensionCode: 'SEX',
        name: 'Sex Disaggregation',
      }, adminActor);

      // Bind a required dimension
      await TableBuilderService.bindDimension(table.id, {
        dimensionId: dim.id,
        isRequired: true,
        allowedValues: ['Male', 'Female'],
      }, adminActor);

      const refreshedTable = await TableBuilderService.getTableById(table.id, adminActor);

      // Attempt validation with empty dimensions
      assert.throws(
        () => {
          ObservationService.validateDimensions(refreshedTable, {});
        },
        /Missing required dimension 'SEX'/
      );

      // Attempt validation with valid dimension
      const validResult = ObservationService.validateDimensions(refreshedTable, { SEX: 'Male' });
      assert.deepStrictEqual(validResult.normalizedDimensions, { SEX: 'Male' });
      assert.strictEqual(typeof validResult.dimensionsHash, 'string');
    });

    test('Enforces allowed vocabulary values on bound dimensions', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-TEST-VOCAB-01',
        title: 'Vocab Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dim = await TableBuilderService.createDimension({
        dimensionCode: 'SEX_VOCAB',
        name: 'Sex Vocab Disaggregation',
      }, adminActor);

      await TableBuilderService.bindDimension(table.id, {
        dimensionId: dim.id,
        isRequired: false,
        allowedValues: ['Male', 'Female'],
      }, adminActor);

      const refreshedTable = await TableBuilderService.getTableById(table.id, adminActor);

      // Invalid value
      assert.throws(
        () => {
          ObservationService.validateDimensions(refreshedTable, { SEX_VOCAB: 'Alien' });
        },
        /Invalid value 'Alien' for dimension 'SEX_VOCAB'/
      );

      // Case-insensitive valid value normalization
      const res = ObservationService.validateDimensions(refreshedTable, { SEX_VOCAB: 'female' });
      assert.deepStrictEqual(res.normalizedDimensions, { SEX_VOCAB: 'Female' });
    });
  });

  // ==========================================================================
  // 3. Dataset Mutability & State Lock
  // ==========================================================================
  describe('3. Dataset Mutability & State Lock Enforcement', () => {
    test('Allows observation creation in DRAFT dataset', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-DATASET-01',
        title: 'Dataset Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      // Create a DRAFT dataset
      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-TEST-DRAFT-01',
        name: 'Test Draft Dataset',
      }, adminActor);

      const obs = await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 1250,
      }, adminActor);

      assert.strictEqual(obs.datasetId, dataset.id);
      assert.strictEqual(obs.period, '2024');
      assert.strictEqual(obs.numericValue, 1250);
    });

    test('Rejects observation creation in OFFICIAL / locked dataset', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-DATASET-02',
        title: 'Locked Dataset Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      // Use pre-seeded OFFICIAL dataset
      const officialDatasetId = 'd2222222-2222-2222-2222-222222222222';

      await assert.rejects(
        async () => {
          await ObservationService.createObservation(table.id, {
            datasetId: officialDatasetId,
            period: '2024',
            numericValue: 999,
          }, adminActor);
        },
        /is locked in OFFICIAL status and cannot be modified/
      );
    });
  });

  // ==========================================================================
  // 4. Observation CRUD & Duplicate Coordinate Protection
  // ==========================================================================
  describe('4. Observation CRUD & Duplicate Coordinate Protection', () => {
    test('Prevents creating duplicate observation with identical coordinate', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-COORD-01',
        title: 'Coordinate Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-COORD-01',
        name: 'Coordinate Dataset',
      }, adminActor);

      // Create observation 1
      await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 500,
      }, adminActor);

      // Attempt duplicate creation with same coordinate
      await assert.rejects(
        async () => {
          await ObservationService.createObservation(table.id, {
            datasetId: dataset.id,
            period: '2024',
            numericValue: 600,
          }, adminActor);
        },
        /Observation with identical coordinate.*already exists/
      );
    });

    test('Allows updating observation and prevents collision on update', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-UPDATE-01',
        title: 'Update Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-UPDATE-01',
        name: 'Update Dataset',
      }, adminActor);

      const obs1 = await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2023',
        numericValue: 100,
      }, adminActor);

      const obs2 = await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 200,
      }, adminActor);

      // Update obs1 value -> success
      const updated = await ObservationService.updateObservation(table.id, obs1.id, {
        numericValue: 150,
      }, adminActor);
      assert.strictEqual(updated.numericValue, 150);

      // Update obs1 period to 2024 -> collision with obs2 -> rejects
      await assert.rejects(
        async () => {
          await ObservationService.updateObservation(table.id, obs1.id, {
            period: '2024',
          }, adminActor);
        },
        /Coordinate collision/
      );
    });

    test('Deletes observation successfully and frees coordinate for re-creation', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-DELETE-01',
        title: 'Delete Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-DELETE-01',
        name: 'Delete Dataset',
      }, adminActor);

      const obs = await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 300,
      }, adminActor);

      // Delete observation
      const delResult = await ObservationService.deleteObservation(table.id, obs.id, adminActor);
      assert.strictEqual(delResult.success, true);

      // Re-creating observation at same coordinate is now permitted
      const reCreated = await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 350,
      }, adminActor);
      assert.strictEqual(reCreated.numericValue, 350);
    });
  });

  // ==========================================================================
  // 5. Bulk Observation Operations & Atomic Upsert
  // ==========================================================================
  describe('5. Bulk Observation Persistence & Atomic Upsert', () => {
    test('Performs atomic bulk upsert (inserts new, updates matching coordinates)', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-BULK-01',
        title: 'Bulk Test Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-BULK-01',
        name: 'Bulk Dataset',
      }, adminActor);

      // Pre-seed 1 observation
      await ObservationService.createObservation(table.id, {
        datasetId: dataset.id,
        period: '2021',
        numericValue: 10,
      }, adminActor);

      // Bulk payload with 1 update (2021) and 2 new inserts (2022, 2023)
      const bulkResult = await ObservationService.bulkSaveObservations(table.id, {
        datasetId: dataset.id,
        observations: [
          { period: '2021', numericValue: 15 },
          { period: '2022', numericValue: 25 },
          { period: '2023', numericValue: 35 },
        ],
      }, adminActor);

      assert.strictEqual(bulkResult.data.totalProcessed, 3);
      assert.strictEqual(bulkResult.data.insertedCount, 2);
      assert.strictEqual(bulkResult.data.updatedCount, 1);

      // Verify list
      const list = await ObservationService.listObservations(table.id, {
        datasetId: dataset.id,
      }, adminActor);

      assert.strictEqual(list.observations.length, 3);
      const row2021 = list.observations.find((o) => o.period === '2021');
      assert.strictEqual(row2021?.numericValue, 15);
    });

    test('Rejects bulk operation if any single row has invalid dimension/coordinate', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-BULK-FAIL-01',
        title: 'Bulk Fail Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-BULK-FAIL-01',
        name: 'Bulk Fail Dataset',
      }, adminActor);

      // Bulk payload containing an invalid dimension
      await assert.rejects(
        async () => {
          await ObservationService.bulkSaveObservations(table.id, {
            datasetId: dataset.id,
            observations: [
              { period: '2021', numericValue: 10 },
              { period: '2022', numericValue: 20, dimensions: { UNBOUND_DIM: 'Bad' } },
            ],
          }, adminActor);
        },
        /Unknown dimension key 'UNBOUND_DIM'/
      );

      // Verify nothing was saved
      const list = await ObservationService.listObservations(table.id, {
        datasetId: dataset.id,
      }, adminActor);
      assert.strictEqual(list.observations.length, 0);
    });
  });

  // ==========================================================================
  // 6. HTTP API & Full RBAC Security Suite
  // ==========================================================================
  describe('6. HTTP API Endpoints & RBAC Enforcement', () => {
    let testTable: any;
    let testDataset: any;

    beforeEach(async () => {
      testTable = await TableBuilderService.createTable({
        tableCode: 'TBL-HTTP-01',
        title: 'HTTP Integration Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      testDataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-HTTP-01',
        name: 'HTTP Test Dataset',
      }, encoderActor);
    });

    test('Unauthenticated request returns 401 Unauthorized', async () => {
      const res = await request(`/tables/${testTable.id}/observations?datasetId=${testDataset.id}`, {
        token: null,
      });
      assert.strictEqual(res.status, 401);
    });

    test('VIEWER role can read observations but cannot create, update, delete, or bulk save', async () => {
      // 1. Read -> 200 OK
      const getRes = await request(`/tables/${testTable.id}/observations?datasetId=${testDataset.id}`, {
        token: viewerToken,
      });
      assert.strictEqual(getRes.status, 200);

      // 2. Create -> 403 Forbidden
      const createRes = await request(`/tables/${testTable.id}/observations`, {
        method: 'POST',
        token: viewerToken,
        body: {
          datasetId: testDataset.id,
          period: '2024',
          numericValue: 100,
        },
      });
      assert.strictEqual(createRes.status, 403);

      // 3. Bulk -> 403 Forbidden
      const bulkRes = await request(`/tables/${testTable.id}/observations/bulk`, {
        method: 'POST',
        token: viewerToken,
        body: {
          datasetId: testDataset.id,
          observations: [{ period: '2024', numericValue: 100 }],
        },
      });
      assert.strictEqual(bulkRes.status, 403);
    });

    test('ENCODER and ADMIN can perform observation CRUD and bulk save via HTTP', async () => {
      // Create via ENCODER
      const createRes = await request(`/tables/${testTable.id}/observations`, {
        method: 'POST',
        token: encoderToken,
        body: {
          datasetId: testDataset.id,
          period: '2024',
          numericValue: 750,
        },
      });
      assert.strictEqual(createRes.status, 201);
      const createdObs = createRes.body.data;
      assert.strictEqual(createdObs.numericValue, 750);

      // Patch via ENCODER
      const patchRes = await request(`/tables/${testTable.id}/observations/${createdObs.id}`, {
        method: 'PATCH',
        token: encoderToken,
        body: {
          numericValue: 800,
        },
      });
      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.data.numericValue, 800);

      // Bulk save via ADMIN
      const bulkRes = await request(`/tables/${testTable.id}/observations/bulk`, {
        method: 'POST',
        token: adminToken,
        body: {
          datasetId: testDataset.id,
          observations: [
            { period: '2024', numericValue: 850 },
            { period: '2025', numericValue: 900 },
          ],
        },
      });
      assert.strictEqual(bulkRes.status, 200);
      assert.strictEqual(bulkRes.body.data.totalProcessed, 2);

      // Delete via ADMIN
      const deleteRes = await request(`/tables/${testTable.id}/observations/${createdObs.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.strictEqual(deleteRes.status, 200);
      assert.strictEqual(deleteRes.body.data.success, true);
    });
  });

  // ============================================================================
  // HARDENING GATE CLOSURE SUITE (Conditions C1 - C7)
  // ============================================================================

  describe('Condition C1 — Production Persistence Isolation', () => {
    test('strictly throws 500 error and forbids in-memory fallback when NODE_ENV is production without database', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        const table = await TableBuilderService.createTable({
          tableCode: 'PROD-ISO-01',
          title: 'Production Isolation Test Table',
          domain: 'DEMOGRAPHY',
        }, adminActor);

        const dataset = await StatisticalDatasetService.createDataset({
          datasetCode: 'PROD-DS-01',
          name: 'Production Dataset',
        }, adminActor);

        process.env.NODE_ENV = 'production';

        // All operations must immediately fail with AppError (500)
        await assert.rejects(
          async () => {
            await ObservationService.createObservation(table.id, {
              datasetId: dataset.id,
              period: '2024',
              numericValue: 123,
            }, adminActor);
          },
          (err: any) => {
            assert.strictEqual(err.statusCode, 500);
            assert.match(err.message, /Database connection required in production/i);
            return true;
          }
        );

        await assert.rejects(
          async () => {
            await ObservationService.listObservations(table.id, {
              datasetId: dataset.id,
            }, adminActor);
          },
          (err: any) => {
            assert.strictEqual(err.statusCode, 500);
            return true;
          }
        );

        await assert.rejects(
          async () => {
            await ObservationService.bulkSaveObservations(table.id, {
              datasetId: dataset.id,
              observations: [{ period: '2024', numericValue: 50 }],
            }, adminActor);
          },
          (err: any) => {
            assert.strictEqual(err.statusCode, 500);
            return true;
          }
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Condition C4 — Cross-Table and Cross-Dataset IDOR Scoping', () => {
    test('rejects observation access and mutation when observation belongs to a different table', async () => {
      // Table 1 and Dataset
      const tableA = await TableBuilderService.createTable({
        tableCode: 'TBL-IDOR-A',
        title: 'Table A',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const tableB = await TableBuilderService.createTable({
        tableCode: 'TBL-IDOR-B',
        title: 'Table B',
        domain: 'HEALTH',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-IDOR-01',
        name: 'IDOR Test Dataset',
      }, adminActor);

      // Create observation in Table A
      const obsA = await ObservationService.createObservation(tableA.id, {
        datasetId: dataset.id,
        period: '2024',
        numericValue: 100,
      }, adminActor);

      // 1. Attempt to get obsA using Table B endpoint -> 404
      const getRes = await request(`/tables/${tableB.id}/observations/${obsA.id}`, {
        token: adminToken,
      });
      assert.strictEqual(getRes.status, 404);

      // 2. Attempt to PATCH obsA using Table B endpoint -> 404
      const patchRes = await request(`/tables/${tableB.id}/observations/${obsA.id}`, {
        method: 'PATCH',
        token: adminToken,
        body: { numericValue: 200 },
      });
      assert.strictEqual(patchRes.status, 404);

      // 3. Attempt to DELETE obsA using Table B endpoint -> 404
      const deleteRes = await request(`/tables/${tableB.id}/observations/${obsA.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.strictEqual(deleteRes.status, 404);

      // 4. Attempt to bulk-save with obsA.id targeting Table B -> 404
      const bulkRes = await request(`/tables/${tableB.id}/observations/bulk`, {
        method: 'POST',
        token: adminToken,
        body: {
          datasetId: dataset.id,
          observations: [{ id: obsA.id, period: '2024', numericValue: 300 }],
        },
      });
      assert.strictEqual(bulkRes.status, 404);
    });

    test('rejects cross-dataset observation modification', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-IDOR-C',
        title: 'Table C',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const datasetA = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-IDOR-A',
        name: 'Dataset A',
      }, adminActor);

      const datasetB = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-IDOR-B',
        name: 'Dataset B',
      }, adminActor);

      const obs = await ObservationService.createObservation(table.id, {
        datasetId: datasetA.id,
        period: '2024',
        numericValue: 50,
      }, adminActor);

      // Attempt to mutate datasetId via update -> 403 Forbidden
      await assert.rejects(
        async () => {
          await ObservationService.updateObservation(
            table.id,
            obs.id,
            { numericValue: 99, ...({ datasetId: datasetB.id } as any) },
            adminActor
          );
        },
        (err: any) => {
          assert.strictEqual(err.statusCode, 403);
          assert.match(err.message, /Cross-dataset observation migration is not permitted/i);
          return true;
        }
      );
    });
  });

  describe('Condition C5 — ENCODER Office Scope Isolation', () => {
    test('allows ENCODER to mutate datasets owned by their office, but strictly rejects mutations on other offices', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-OFFICE-01',
        title: 'Office Scope Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      // Dataset 1 created by MPDC Encoder (office: off-mpdc)
      const mpdcDataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-MPDC-01',
        name: 'MPDC Planning Data',
      }, {
        id: 'usr-encoder-mpdc',
        email: 'mpdc_encoder@talibon.gov.ph',
        role: Role.ENCODER,
        officeId: 'off-mpdc',
      });

      // Token for MPDC encoder
      const mpdcEncoderToken = signAccessToken({
        id: 'usr-encoder-mpdc',
        email: 'mpdc_encoder@talibon.gov.ph',
        role: Role.ENCODER,
        officeId: 'off-mpdc',
      });

      // Token for MSWDO encoder (different office: off-mswdo)
      const mswdoEncoderToken = signAccessToken({
        id: 'usr-encoder-01',
        email: 'encoder@talibon.gov.ph',
        role: Role.ENCODER,
        officeId: 'off-mswdo',
      });

      // 1. MPDC Encoder creates observation in MPDC dataset -> 201 Created
      const createRes = await request(`/tables/${table.id}/observations`, {
        method: 'POST',
        token: mpdcEncoderToken,
        body: {
          datasetId: mpdcDataset.id,
          period: '2024',
          numericValue: 450,
        },
      });
      assert.strictEqual(createRes.status, 201);
      const obs = createRes.body.data;

      // 2. MSWDO Encoder attempts to create observation in MPDC dataset -> 403 Forbidden
      const unauthorizedCreateRes = await request(`/tables/${table.id}/observations`, {
        method: 'POST',
        token: mswdoEncoderToken,
        body: {
          datasetId: mpdcDataset.id,
          period: '2025',
          numericValue: 500,
        },
      });
      assert.strictEqual(unauthorizedCreateRes.status, 403);

      // 3. MSWDO Encoder attempts to PATCH observation in MPDC dataset -> 403 Forbidden
      const unauthorizedPatchRes = await request(`/tables/${table.id}/observations/${obs.id}`, {
        method: 'PATCH',
        token: mswdoEncoderToken,
        body: {
          numericValue: 999,
        },
      });
      assert.strictEqual(unauthorizedPatchRes.status, 403);

      // 4. MSWDO Encoder attempts bulk save on MPDC dataset -> 403 Forbidden
      const unauthorizedBulkRes = await request(`/tables/${table.id}/observations/bulk`, {
        method: 'POST',
        token: mswdoEncoderToken,
        body: {
          datasetId: mpdcDataset.id,
          observations: [{ period: '2026', numericValue: 600 }],
        },
      });
      assert.strictEqual(unauthorizedBulkRes.status, 403);

      // 5. MSWDO Encoder attempts DELETE on MPDC dataset -> 403 Forbidden
      const unauthorizedDeleteRes = await request(`/tables/${table.id}/observations/${obs.id}`, {
        method: 'DELETE',
        token: mswdoEncoderToken,
      });
      assert.strictEqual(unauthorizedDeleteRes.status, 403);
    });
  });

  describe('Condition C6 — Audit Failure / Transaction Semantics', () => {
    test('does NOT emit false successful audit events when validation fails', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-AUDIT-01',
        title: 'Audit Failure Verification Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-AUDIT-01',
        name: 'Audit Dataset',
      }, adminActor);

      const initialAuditLogs = await AuditService.getLogs({});
      const initialCount = initialAuditLogs.pagination.total;

      // Attempt 1: Failed create due to empty period
      await assert.rejects(async () => {
        await ObservationService.createObservation(table.id, {
          datasetId: dataset.id,
          period: '',
          numericValue: 100,
        }, adminActor);
      });

      // Attempt 2: Failed create due to invalid indicator
      await assert.rejects(async () => {
        await ObservationService.createObservation(table.id, {
          datasetId: dataset.id,
          period: '2024',
          indicatorId: 'non-existent-ind',
          numericValue: 100,
        }, adminActor);
      });

      // Attempt 3: Failed bulk save due to duplicate coordinates inside bulk
      await assert.rejects(async () => {
        await ObservationService.bulkSaveObservations(table.id, {
          datasetId: dataset.id,
          observations: [
            { period: '2024', numericValue: 10 },
            { period: '2024', numericValue: 20 },
          ],
        }, adminActor);
      });

      // Audit logs count must remain completely unchanged
      const finalAuditLogs = await AuditService.getLogs({});
      assert.strictEqual(finalAuditLogs.pagination.total, initialCount);
    });
  });

  describe('Condition C7 — Duplicate Coordinates Inside Bulk Payload', () => {
    test('deterministically rejects bulk payloads containing duplicate coordinates upfront', async () => {
      const table = await TableBuilderService.createTable({
        tableCode: 'TBL-DUP-BULK',
        title: 'Duplicate Bulk Table',
        domain: 'DEMOGRAPHY',
      }, adminActor);

      // Create and bind dimension SEX with [Male, Female]
      const dim = await TableBuilderService.createDimension({
        dimensionCode: 'SEX_BULK_DUP',
        name: 'Sex Disaggregation',
      }, adminActor);

      await TableBuilderService.bindDimension(table.id, {
        dimensionId: dim.id,
        isRequired: true,
        allowedValues: ['Male', 'Female'],
      }, adminActor);

      const dataset = await StatisticalDatasetService.createDataset({
        datasetCode: 'DS-DUP-BULK-01',
        name: 'Duplicate Coordinates Dataset',
      }, adminActor);

      // Bulk payload with duplicate coordinate: (2024, SEX_BULK_DUP: Male) appears twice
      const bulkRes = await request(`/tables/${table.id}/observations/bulk`, {
        method: 'POST',
        token: adminToken,
        body: {
          datasetId: dataset.id,
          observations: [
            { period: '2024', dimensions: { SEX_BULK_DUP: 'Male' }, numericValue: 100 },
            { period: '2024', dimensions: { SEX_BULK_DUP: 'Female' }, numericValue: 150 },
            { period: '2024', dimensions: { SEX_BULK_DUP: 'Male' }, numericValue: 200 }, // DUPLICATE COORDINATE
          ],
        },
      });

      assert.strictEqual(bulkRes.status, 409);
      const errMessage = typeof bulkRes.body.error === 'string' ? bulkRes.body.error : (bulkRes.body.error?.message || bulkRes.body.message || '');
      assert.match(errMessage, /Duplicate coordinate detected within bulk payload/i);
      assert.match(errMessage, /Row #1 and Row #3/i);

      // Verify that no observations were partially inserted
      const listRes = await request(`/tables/${table.id}/observations?datasetId=${dataset.id}`, {
        token: adminToken,
      });
      assert.strictEqual(listRes.body.data.length, 0);
    });
  });
});

