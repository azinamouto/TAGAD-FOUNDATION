import test, { describe, beforeEach, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'http';
import { AddressInfo } from 'net';
import adminRoutes from '../server/routes/admin/index';
import { signAccessToken } from '../server/lib/jwt';
import { TableBuilderService } from '../server/services/TableBuilderService';
import { AuditService } from '../server/services/AuditService';
import { Role } from '@prisma/client';

describe('TAGAD Sprint 12 — Step 4: Full Table Builder HTTP End-to-End Integration & RBAC Attack Suite', () => {
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
  // 1. Authentication & Security Boundary
  // ==========================================================================
  describe('1. Authentication Boundary Across HTTP', () => {
    test('Unauthenticated request to list tables returns 401 Unauthorized', async () => {
      const res = await request('/tables', { token: null });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error.message, /authentication required|token/i);
    });

    test('Malformed/invalid token returns 401 Unauthorized', async () => {
      const res = await request('/tables', { token: 'invalid.bearer.token' });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  // ==========================================================================
  // 2. Table Catalog End-to-End Across HTTP
  // ==========================================================================
  describe('2. Table Catalog List & Filters Across HTTP', () => {
    test('ADMIN retrieves paginated tables with metadata and pagination', async () => {
      const res = await request('/tables?page=1&limit=10', { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.data));
      assert.strictEqual(res.body.data.length, 10);
      assert.strictEqual(res.body.meta.pagination.page, 1);
      assert.strictEqual(res.body.meta.pagination.limit, 10);
      assert.ok(res.body.meta.pagination.total >= 69);
    });

    test('VIEWER can view catalog (Read-only access permitted)', async () => {
      const res = await request('/tables', { token: viewerToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data.length > 0);
    });

    test('Filtering by domain returns only matching domain tables', async () => {
      const res = await request('/tables?domain=Demographics', { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      for (const t of res.body.data) {
        assert.ok(t.domain.includes('Demographics'));
      }
    });

    test('Search query matches title or tableCode', async () => {
      const res = await request('/tables?search=Household', { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      for (const t of res.body.data) {
        const matches =
          t.title.toLowerCase().includes('household') ||
          t.tableCode.toLowerCase().includes('household') ||
          (t.description && t.description.toLowerCase().includes('household')) ||
          t.domain.toLowerCase().includes('household');
        assert.ok(matches);
      }
    });

    test('GET /tables/:id returns table detail with dimension bindings and indicators', async () => {
      const listRes = await request('/tables?limit=1', { token: adminToken });
      const tableId = listRes.body.data[0].id;

      const detailRes = await request(`/tables/${tableId}`, { token: adminToken });
      assert.strictEqual(detailRes.status, 200);
      assert.strictEqual(detailRes.body.data.id, tableId);
      assert.ok(Array.isArray(detailRes.body.data.dimensionBindings));
      assert.ok(Array.isArray(detailRes.body.data.indicators));
    });
  });

  // ==========================================================================
  // 3. Custom Table End-to-End Lifecycle
  // ==========================================================================
  describe('3. Custom Table Lifecycle (Create -> Read -> Update -> Delete)', () => {
    test('Complete custom table lifecycle with server-assigned identifiers and immutability', async () => {
      // 1. Create custom table
      const createRes = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Barangay Micro-Enterprise GAD Assessment',
          domain: 'Economic Development & Livelihood',
          description: 'Special annual assessment of female-led micro-enterprises in Talibon',
          expectedUnit: 'Enterprises',
          rowGrain: 'BARANGAY',
        },
      });

      assert.strictEqual(createRes.status, 201);
      assert.strictEqual(createRes.body.success, true);
      const created = createRes.body.data;
      assert.ok(created.id);
      assert.strictEqual(created.isSystemTable, false);
      assert.ok(created.tableNumber >= 100);
      assert.match(created.tableCode, /^STAT-CUST-\d+$/);

      // 2. Read single table
      const readRes = await request(`/tables/${created.id}`, { token: adminToken });
      assert.strictEqual(readRes.status, 200);
      assert.strictEqual(readRes.body.data.title, 'Barangay Micro-Enterprise GAD Assessment');

      // 3. Update permitted metadata
      const updateRes = await request(`/tables/${created.id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          title: 'Updated Barangay Micro-Enterprise Assessment',
          description: 'Enhanced description with verified municipal metrics',
        },
      });
      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.data.title, 'Updated Barangay Micro-Enterprise Assessment');

      // Verify protected identity remains untouched
      assert.strictEqual(updateRes.body.data.tableCode, created.tableCode);
      assert.strictEqual(updateRes.body.data.tableNumber, created.tableNumber);
      assert.strictEqual(updateRes.body.data.isSystemTable, false);

      // 4. Delete custom table
      const deleteRes = await request(`/tables/${created.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.strictEqual(deleteRes.status, 200);
      assert.strictEqual(deleteRes.body.success, true);

      // 5. Verify deleted table is no longer in active query
      const postDeleteRes = await request(`/tables/${created.id}`, { token: adminToken });
      assert.strictEqual(postDeleteRes.status, 404);
    });

    test('Duplicate tableCode in POST /tables is rejected with 409 Conflict', async () => {
      const res = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: {
          tableCode: 'STAT-TAB-01',
          title: 'Collision Attempt on Canonical Table',
          domain: 'Demographics',
        },
      });
      assert.strictEqual(res.status, 409);
      assert.strictEqual(res.body.success, false);
      assert.match(res.body.error.message, /already (exists|registered)/i);
    });
  });

  // ==========================================================================
  // 4. System Table Immutability Across HTTP
  // ==========================================================================
  describe('4. PSA System Table Immutability (#1–69)', () => {
    test('DELETE /tables/:id on a PSA System Table is strictly rejected with 403 Forbidden', async () => {
      const listRes = await request('/tables?search=STAT-TAB-01', { token: adminToken });
      const table1Id = listRes.body.data[0].id;

      const deleteRes = await request(`/tables/${table1Id}`, {
        method: 'DELETE',
        token: superAdminToken,
      });

      assert.strictEqual(deleteRes.status, 403);
      assert.strictEqual(deleteRes.body.success, false);
      assert.match(deleteRes.body.error.message, /cannot be deleted/i);
    });

    test('PUT /tables/:id cannot mutate tableCode, tableNumber, or isSystemTable', async () => {
      const listRes = await request('/tables?search=STAT-TAB-01', { token: adminToken });
      const table1Id = listRes.body.data[0].id;

      const updateRes = await request(`/tables/${table1Id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          title: 'Updated Table 1 Title Allowed',
          // Malicious attempts to overwrite system identity
          tableCode: 'MALICIOUS-OVERRIDE',
          tableNumber: 999,
          isSystemTable: false,
        } as any,
      });

      assert.strictEqual(updateRes.status, 200);
      assert.strictEqual(updateRes.body.data.title, 'Updated Table 1 Title Allowed');
      assert.strictEqual(updateRes.body.data.tableCode, 'STAT-TAB-01');
      assert.strictEqual(updateRes.body.data.tableNumber, 1);
      assert.strictEqual(updateRes.body.data.isSystemTable, true);
    });
  });

  // ==========================================================================
  // 5. Dimension End-to-End Lifecycle
  // ==========================================================================
  describe('5. Dimension Lifecycle (Dictionary -> Inline Create -> Bind -> Reorder -> Unbind)', () => {
    test('Dimension dictionary lookup, inline creation, binding, reordering, and unbinding', async () => {
      // 1. Get dimension dictionary
      const dictRes = await request('/dimension-dictionary', { token: adminToken });
      assert.strictEqual(dictRes.status, 200);
      assert.ok(Array.isArray(dictRes.body.data));
      assert.ok(dictRes.body.data.length > 0);

      // 2. Inline create dimension
      const dimCode = `DIM_TEST_${Date.now()}`;
      const createDimRes = await request('/dimensions', {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionCode: dimCode,
          name: 'Target Household Vulnerability Index',
          description: 'Vulnerability classification level',
          dataType: 'string',
        },
      });
      assert.strictEqual(createDimRes.status, 201);
      const newDim = createDimRes.body.data;
      assert.strictEqual(newDim.dimensionCode, dimCode);

      // 3. Create a target custom table for binding tests
      const customTableRes = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Dimension Testing Worktable',
          domain: 'Demographics',
        },
      });
      const tableId = customTableRes.body.data.id;

      // 4. Bind dimension
      const bindRes = await request(`/tables/${tableId}/dimensions`, {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: newDim.id,
          displayOrder: 1,
          isRequired: true,
        },
      });
      assert.strictEqual(bindRes.status, 201);
      assert.strictEqual(bindRes.body.data.dimensionId, newDim.id);

      // 5. Duplicate binding rejected with 409 Conflict
      const duplicateBindRes = await request(`/tables/${tableId}/dimensions`, {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: newDim.id,
          displayOrder: 2,
        },
      });
      assert.strictEqual(duplicateBindRes.status, 409);

      // 6. Bind a second dimension from dictionary for reorder test
      const secondDim = dictRes.body.data[0];
      await request(`/tables/${tableId}/dimensions`, {
        method: 'POST',
        token: adminToken,
        body: {
          dimensionId: secondDim.id,
          displayOrder: 2,
        },
      });

      // 7. Transactional reorder
      const reorderRes = await request(`/tables/${tableId}/dimensions/reorder`, {
        method: 'PUT',
        token: adminToken,
        body: {
          dimensions: [
            { dimensionId: secondDim.id, displayOrder: 1 },
            { dimensionId: newDim.id, displayOrder: 2 },
          ],
        },
      });
      assert.strictEqual(reorderRes.status, 200);
      const bindings = reorderRes.body.data.dimensionBindings;
      assert.strictEqual(bindings[0].dimensionId, secondDim.id);
      assert.strictEqual(bindings[0].displayOrder, 1);
      assert.strictEqual(bindings[1].dimensionId, newDim.id);
      assert.strictEqual(bindings[1].displayOrder, 2);

      // 8. Safe unbind
      const unbindRes = await request(`/tables/${tableId}/dimensions/${newDim.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.strictEqual(unbindRes.status, 200);
      assert.strictEqual(unbindRes.body.success, true);

      // Verify unbound dimension is removed
      const checkTable = await request(`/tables/${tableId}`, { token: adminToken });
      const remainingBindingIds = checkTable.body.data.dimensionBindings.map((b: any) => b.dimensionId);
      assert.ok(!remainingBindingIds.includes(newDim.id));
    });
  });

  // ==========================================================================
  // 6. Indicator End-to-End Lifecycle
  // ==========================================================================
  describe('6. Indicator Lifecycle (Create -> Read -> Update -> Delete)', () => {
    test('Indicator creation, formula updates, permanent code protection, and deletion', async () => {
      // 1. Create target table
      const tableRes = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Indicator Testing Table',
          domain: 'Health & Nutrition',
        },
      });
      const tableId = tableRes.body.data.id;

      // 2. Create indicator
      const indCode = `IND_TEST_${Date.now()}`;
      const createIndRes = await request(`/tables/${tableId}/indicators`, {
        method: 'POST',
        token: adminToken,
        body: {
          indicatorCode: indCode,
          name: 'Maternal Care Compliance Ratio',
          title: 'Percentage of Expecting Mothers Receiving Prenatal Consultation',
          unit: 'Percent',
          formula: '(Numerator / Denominator) * 100',
          numeratorDefinition: 'Mothers with 4+ prenatal visits',
          denominatorDefinition: 'Total registered pregnant women',
        },
      });
      assert.strictEqual(createIndRes.status, 201);
      const createdInd = createIndRes.body.data;
      assert.strictEqual(createdInd.indicatorCode, indCode);
      assert.strictEqual(createdInd.tableDefinitionId, tableId);

      // 3. Duplicate indicatorCode is rejected with 409 Conflict
      const dupIndRes = await request(`/tables/${tableId}/indicators`, {
        method: 'POST',
        token: adminToken,
        body: {
          indicatorCode: indCode,
          name: 'Duplicate Indicator Attempt',
          title: 'Duplicate Title',
        },
      });
      assert.strictEqual(dupIndRes.status, 409);

      // 4. Update indicator metadata & formula
      const updateIndRes = await request(`/indicators/${createdInd.id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          title: 'Updated Indicator Title with Precision Standard',
          formula: 'ROUND((Numerator / Denominator) * 100, 2)',
        },
      });
      assert.strictEqual(updateIndRes.status, 200);
      assert.strictEqual(updateIndRes.body.data.title, 'Updated Indicator Title with Precision Standard');
      assert.strictEqual(updateIndRes.body.data.formula, 'ROUND((Numerator / Denominator) * 100, 2)');

      // 5. Delete indicator
      const deleteIndRes = await request(`/indicators/${createdInd.id}`, {
        method: 'DELETE',
        token: adminToken,
      });
      assert.strictEqual(deleteIndRes.status, 200);
      assert.strictEqual(deleteIndRes.body.success, true);
    });
  });

  // ==========================================================================
  // 7. Full RBAC Attack Matrix Across HTTP
  // ==========================================================================
  describe('7. Authoritative RBAC HTTP Attack Matrix', () => {
    test('ENCODER cannot execute mutation operations (POST/PUT/DELETE return 403 Forbidden)', async () => {
      // Attempt Create Table
      const createTableRes = await request('/tables', {
        method: 'POST',
        token: encoderToken,
        body: { title: 'Unauthorized Table', domain: 'Demographics' },
      });
      assert.strictEqual(createTableRes.status, 403);
      assert.match(createTableRes.body.error.message, /forbidden|access denied|permission/i);

      // Attempt Create Dimension
      const createDimRes = await request('/dimensions', {
        method: 'POST',
        token: encoderToken,
        body: { dimensionCode: 'DIM_UNAUTH', name: 'Unauthorized Dimension' },
      });
      assert.strictEqual(createDimRes.status, 403);

      // Attempt Create Indicator
      const createIndRes = await request('/tables/any-id/indicators', {
        method: 'POST',
        token: encoderToken,
        body: { indicatorCode: 'IND_UNAUTH', name: 'Unauthorized', title: 'Unauthorized' },
      });
      assert.strictEqual(createIndRes.status, 403);
    });

    test('VIEWER cannot execute mutation operations (POST/PUT/DELETE return 403 Forbidden)', async () => {
      const createTableRes = await request('/tables', {
        method: 'POST',
        token: viewerToken,
        body: { title: 'Unauthorized Table by Viewer', domain: 'Demographics' },
      });
      assert.strictEqual(createTableRes.status, 403);

      const updateTableRes = await request('/tables/any-id', {
        method: 'PUT',
        token: viewerToken,
        body: { title: 'Unauthorized Table Update' },
      });
      assert.strictEqual(updateTableRes.status, 403);
    });

    test('SUPER_ADMIN and ADMIN are granted full mutation access', async () => {
      const superAdminRes = await request('/tables', {
        method: 'POST',
        token: superAdminToken,
        body: { title: 'Super Admin Created Table', domain: 'Governance' },
      });
      assert.strictEqual(superAdminRes.status, 201);

      const adminRes = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: { title: 'Admin Created Table', domain: 'Governance' },
      });
      assert.strictEqual(adminRes.status, 201);
    });
  });

  // ==========================================================================
  // 8. Audit Trail Integration Across HTTP
  // ==========================================================================
  describe('8. Audit Trail Event Emittance Across HTTP', () => {
    test('Mutations emit structured audit log events with actor metadata', async () => {
      const res = await request('/tables', {
        method: 'POST',
        token: adminToken,
        body: {
          title: 'Audited Statistical Table',
          domain: 'Demographics',
        },
      });
      assert.strictEqual(res.status, 201);
      const createdId = res.body.data.id;

      const { logs } = await AuditService.getLogs({
        limit: 10,
        entityType: 'StatisticalTableDefinition',
      });

      const match = logs.find((l: any) => l.entityId === createdId);
      assert.ok(match, 'Audit log entry must be created for table creation');
      assert.strictEqual(match.action, 'TABLE_DEFINITION_CREATED');
      assert.strictEqual(match.userId, 'usr-admin-01');
    });
  });
});
