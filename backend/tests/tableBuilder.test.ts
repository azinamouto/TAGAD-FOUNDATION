import './testEnvironment';
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  TableBuilderService,
  ActorContext,
} from '../server/services/TableBuilderService';
import {
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  Role,
} from '@prisma/client';
import {
  ForbiddenError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../server/lib/errors';
import { AuditService } from '../server/services/AuditService';

describe('TAGAD Sprint 12 — Issue #14: Table Builder Backend Service & Security Suite', () => {
  // Test Actor Contexts
  const superAdmin: ActorContext = {
    id: '00000000-0000-0000-0000-000000000001',
    fullName: 'System Super Administrator',
    email: 'superadmin@talibon.gov.ph',
    role: Role.SUPER_ADMIN,
    officeId: null,
  };

  const adminUser: ActorContext = {
    id: '00000000-0000-0000-0000-000000000002',
    fullName: 'Municipal Planning Admin',
    email: 'admin_mpdc@talibon.gov.ph',
    role: Role.ADMIN,
    officeId: '00000000-0000-0000-0000-000000000020',
  };

  const encoderUser: ActorContext = {
    id: '00000000-0000-0000-0000-000000000003',
    fullName: 'MSWDO Data Encoder',
    email: 'encoder_mswdo@talibon.gov.ph',
    role: Role.ENCODER,
    officeId: '00000000-0000-0000-0000-000000000030',
  };

  const viewerUser: ActorContext = {
    id: '00000000-0000-0000-0000-000000000004',
    fullName: 'Public Audit Viewer',
    email: 'viewer@talibon.gov.ph',
    role: Role.VIEWER,
    officeId: null,
  };

  const mockReq: any = {
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'TAGAD-Automated-Audit-Runner/1.0',
    },
    socket: { remoteAddress: '127.0.0.1' },
  };

  beforeEach(() => {
    TableBuilderService.resetInMemoryState();
  });

  // ============================================================================
  // 1. Table CRUD & System-Table Immutability
  // ============================================================================
  describe('1. Table CRUD & Immutability Engine', () => {
    test('listTables returns paginated statistical table definitions', async () => {
      const result = await TableBuilderService.listTables({ page: 1, limit: 10 }, adminUser);
      assert.ok(result.tables.length > 0);
      assert.strictEqual(result.pagination.page, 1);
      assert.strictEqual(result.pagination.limit, 10);
      assert.ok(result.pagination.total >= 69);
    });

    test('getTableById retrieves a single table with bindings and indicators', async () => {
      const list = await TableBuilderService.listTables({ limit: 1 }, adminUser);
      const targetId = list.tables[0].id;

      const table = await TableBuilderService.getTableById(targetId, adminUser);
      assert.strictEqual(table.id, targetId);
      assert.ok(table.tableCode);
      assert.ok(Array.isArray(table.dimensionBindings));
      assert.ok(Array.isArray(table.indicators));
    });

    test('createTable creates a custom statistical table with valid defaults', async () => {
      const created = await TableBuilderService.createTable(
        {
          title: 'Custom Barangay Livelihood Assessment',
          domain: 'Economic Development & Livelihood',
          description: 'Special assessment table for rural livelihood programs',
          expectedUnit: 'Households',
        },
        adminUser,
        mockReq
      );

      assert.ok(created.id);
      assert.strictEqual(created.title, 'Custom Barangay Livelihood Assessment');
      assert.strictEqual(created.domain, 'Economic Development & Livelihood');
      assert.strictEqual(created.isSystemTable, false);
      assert.strictEqual(created.isArchived, false);
      assert.ok(created.tableNumber >= 100);
      assert.match(created.tableCode, /^STAT-CUST-\d+$/);
    });

    test('Duplicate table-code protection rejects collision', async () => {
      await assert.rejects(
        async () => {
          await TableBuilderService.createTable(
            {
              tableCode: 'SUMMARY_STATISTICS',
              title: 'Attempted Impersonation of Table 1',
              domain: 'Demographics',
            },
            adminUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ConflictError, true);
          assert.match(err.message, /already (exists|registered)/i);
          return true;
        }
      );
    });

    test('updateTable updates allowlisted metadata properties', async () => {
      const created = await TableBuilderService.createTable(
        {
          title: 'Initial Title',
          domain: 'Health & Nutrition',
          description: 'Initial Description',
        },
        adminUser,
        mockReq
      );

      const updated = await TableBuilderService.updateTable(
        created.id,
        {
          title: 'Updated Health Assessment Title',
          description: 'Updated Description',
        },
        adminUser,
        mockReq
      );

      assert.strictEqual(updated.title, 'Updated Health Assessment Title');
      assert.strictEqual(updated.description, 'Updated Description');
      assert.strictEqual(updated.domain, 'Health & Nutrition');
    });

    test('System-table immutability: Cannot delete PSA canonical tables (1-69)', async () => {
      const list = await TableBuilderService.listTables({ limit: 5 }, adminUser);
      const systemTable = list.tables.find((t: any) => t.isSystemTable);
      assert.ok(systemTable, 'System table must exist');

      await assert.rejects(
        async () => {
          await TableBuilderService.deleteOrArchiveTable(systemTable.id, adminUser, mockReq);
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.match(err.message, /cannot be deleted/i);
          return true;
        }
      );
    });

    test('System-table immutability: Update payload cannot mutate protected identity fields', async () => {
      const list = await TableBuilderService.listTables({ limit: 1 }, adminUser);
      const systemTable = list.tables[0];
      const origCode = systemTable.tableCode;
      const origNumber = systemTable.tableNumber;

      const updated = await TableBuilderService.updateTable(
        systemTable.id,
        {
          title: 'Permitted Title Adjustment',
          // Maliciously attempted fields passed via object
          ...({
            tableCode: 'MALICIOUS_OVERRIDE',
            tableNumber: 9999,
            isSystemTable: false,
          } as any),
        },
        adminUser,
        mockReq
      );

      assert.strictEqual(updated.tableCode, origCode);
      assert.strictEqual(updated.tableNumber, origNumber);
      assert.strictEqual(updated.isSystemTable, true);
    });

    test('Custom table deletion succeeds for unreferenced custom table', async () => {
      const custom = await TableBuilderService.createTable(
        {
          title: 'Temporary Scratch Table',
          domain: 'Governance',
        },
        adminUser,
        mockReq
      );

      const deleteRes = await TableBuilderService.deleteOrArchiveTable(custom.id, adminUser, mockReq);
      assert.strictEqual(deleteRes.deleted, true);

      await assert.rejects(
        async () => {
          await TableBuilderService.getTableById(custom.id, adminUser);
        },
        (err: any) => err instanceof NotFoundError
      );
    });
  });

  // ============================================================================
  // 2. Dimension Dictionary & Inline Creation
  // ============================================================================
  describe('2. Dimension Dictionary & Inline Creation', () => {
    test('getDimensionDictionary returns registered analytical dimensions', async () => {
      const dimensions = await TableBuilderService.getDimensionDictionary({});
      assert.ok(dimensions.length >= 6);
      const hasSex = dimensions.some((d: any) => d.dimensionCode === 'DIM_SEX');
      assert.strictEqual(hasSex, true);
    });

    test('Inline dimension creation creates a new verified dimension', async () => {
      const created = await TableBuilderService.createDimension(
        {
          dimensionCode: 'DIM_INDIGENOUS_AFFILIATION',
          name: 'IP Ethnic Affiliation',
          description: 'Recognized indigenous cultural community affiliation',
          dataType: 'string',
          vocabularySource: 'NCIP Official Register',
        },
        adminUser,
        mockReq
      );

      assert.ok(created.id);
      assert.strictEqual(created.dimensionCode, 'DIM_INDIGENOUS_AFFILIATION');
      assert.strictEqual(created.name, 'IP Ethnic Affiliation');
    });

    test('Duplicate dimension-code protection rejects duplicate dimensionCode', async () => {
      await assert.rejects(
        async () => {
          await TableBuilderService.createDimension(
            {
              dimensionCode: 'DIM_SEX',
              name: 'Duplicate Sex Dimension',
            },
            adminUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ConflictError, true);
          assert.match(err.message, /already (exists|registered)/i);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // 3. Dimension Binding, Safe Unbinding & Transactional Reordering
  // ============================================================================
  describe('3. Dimension Binding, Unbinding & Reordering', () => {
    test('bindDimension binds a dimension to a table with display order', async () => {
      const table = await TableBuilderService.createTable(
        {
          title: 'Health Survey Disaggregation',
          domain: 'Health & Nutrition',
        },
        adminUser,
        mockReq
      );

      const dimensions = await TableBuilderService.getDimensionDictionary({});
      const sexDim = dimensions.find((d: any) => d.dimensionCode === 'DIM_SEX');
      assert.ok(sexDim);

      const binding = await TableBuilderService.bindDimension(
        table.id,
        {
          dimensionId: sexDim.id,
          isRequired: true,
          displayOrder: 1,
        },
        adminUser,
        mockReq
      );

      assert.ok(binding.id);
      assert.strictEqual(binding.dimensionId, sexDim.id);
      assert.strictEqual(binding.displayOrder, 1);
      assert.strictEqual(binding.isRequired, true);
    });

    test('Duplicate dimension binding is rejected with 409 Conflict', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Test Table Duplicate Bind', domain: 'Demographics' },
        adminUser,
        mockReq
      );
      const dimensions = await TableBuilderService.getDimensionDictionary({});
      const dim = dimensions[0];

      await TableBuilderService.bindDimension(table.id, { dimensionId: dim.id }, adminUser, mockReq);

      await assert.rejects(
        async () => {
          await TableBuilderService.bindDimension(table.id, { dimensionId: dim.id }, adminUser, mockReq);
        },
        (err: any) => {
          assert.strictEqual(err instanceof ConflictError, true);
          assert.match(err.message, /already bound/i);
          return true;
        }
      );
    });

    test('Safe unbinding removes dimension binding when no observations exist', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Unbind Target Table', domain: 'Demographics' },
        adminUser,
        mockReq
      );
      const dimensions = await TableBuilderService.getDimensionDictionary({});
      const dim = dimensions[0];

      await TableBuilderService.bindDimension(table.id, { dimensionId: dim.id }, adminUser, mockReq);
      const unbindRes = await TableBuilderService.unbindDimension(table.id, dim.id, adminUser, mockReq);

      assert.strictEqual(unbindRes.success, true);
    });

    test('Transactional dimension reorder normalizes sequence across all bound dimensions', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Reorder Test Table', domain: 'Demographics' },
        adminUser,
        mockReq
      );
      const dimensions = await TableBuilderService.getDimensionDictionary({});
      const dim1 = dimensions[0];
      const dim2 = dimensions[1];
      const dim3 = dimensions[2];

      await TableBuilderService.bindDimension(table.id, { dimensionId: dim1.id, displayOrder: 1 }, adminUser, mockReq);
      await TableBuilderService.bindDimension(table.id, { dimensionId: dim2.id, displayOrder: 2 }, adminUser, mockReq);
      await TableBuilderService.bindDimension(table.id, { dimensionId: dim3.id, displayOrder: 3 }, adminUser, mockReq);

      // Reorder: put dim3 first (order 1), then dim1 (order 2), then dim2 (order 3)
      const reordered = await TableBuilderService.reorderDimensions(
        table.id,
        [
          { dimensionId: dim3.id, displayOrder: 1 },
          { dimensionId: dim1.id, displayOrder: 2 },
          { dimensionId: dim2.id, displayOrder: 3 },
        ],
        adminUser,
        mockReq
      );

      assert.ok(reordered);
      const bindings = reordered.dimensionBindings;
      assert.strictEqual(bindings.length, 3);
      const b3 = bindings.find((b: any) => b.dimensionId === dim3.id);
      const b1 = bindings.find((b: any) => b.dimensionId === dim1.id);
      const b2 = bindings.find((b: any) => b.dimensionId === dim2.id);
      assert.strictEqual(b3.displayOrder, 1);
      assert.strictEqual(b1.displayOrder, 2);
      assert.strictEqual(b2.displayOrder, 3);
    });

    test('Cross-table reorder rejection: Reordering with foreign dimension ID is rejected', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Table A', domain: 'Demographics' },
        adminUser,
        mockReq
      );
      const dimensions = await TableBuilderService.getDimensionDictionary({});
      const dim1 = dimensions[0];
      const foreignDim = dimensions[4]; // Not bound to table A

      await TableBuilderService.bindDimension(table.id, { dimensionId: dim1.id }, adminUser, mockReq);

      await assert.rejects(
        async () => {
          await TableBuilderService.reorderDimensions(
            table.id,
            [
              { dimensionId: dim1.id, displayOrder: 1 },
              { dimensionId: foreignDim.id, displayOrder: 2 },
            ],
            adminUser,
            mockReq
          );
        },
        (err: any) => {
          assert.ok(err instanceof NotFoundError || err.statusCode === 404);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // 4. Indicator CRUD & Integrity
  // ============================================================================
  describe('4. Indicator CRUD & Referential Protection', () => {
    test('createIndicator creates an indicator associated with a table definition', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Indicator Host Table', domain: 'Social Development' },
        adminUser,
        mockReq
      );

      const indicator = await TableBuilderService.createIndicator(
        table.id,
        {
          indicatorCode: 'IND_POVERTY_INCIDENCE_2026',
          name: 'Poverty Incidence Rate',
          title: 'Proportion of Population Below Poverty Threshold',
          unit: '%',
          formula: '(poor_population / total_population) * 100',
        },
        adminUser,
        mockReq
      );

      assert.ok(indicator.id);
      assert.strictEqual(indicator.indicatorCode, 'IND_POVERTY_INCIDENCE_2026');
      assert.strictEqual(indicator.tableDefinitionId, table.id);
    });

    test('Duplicate indicator-code is rejected with ConflictError', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Indicator Dup Table', domain: 'Social Development' },
        adminUser,
        mockReq
      );

      await TableBuilderService.createIndicator(
        table.id,
        {
          indicatorCode: 'IND_UNIQUE_TEST_CODE',
          name: 'Indicator 1',
          title: 'First Instance',
        },
        adminUser,
        mockReq
      );

      await assert.rejects(
        async () => {
          await TableBuilderService.createIndicator(
            table.id,
            {
              indicatorCode: 'IND_UNIQUE_TEST_CODE',
              name: 'Indicator 2',
              title: 'Duplicate Code Instance',
            },
            adminUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ConflictError, true);
          assert.match(err.message, /already exists/i);
          return true;
        }
      );
    });

    test('updateIndicator updates indicator formula, name, and title', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Indicator Update Table', domain: 'Education' },
        adminUser,
        mockReq
      );

      const ind = await TableBuilderService.createIndicator(
        table.id,
        {
          indicatorCode: 'IND_LITERACY_RATE',
          name: 'Literacy Rate',
          title: 'Basic Literacy Rate',
        },
        adminUser,
        mockReq
      );

      const updated = await TableBuilderService.updateIndicator(
        ind.id,
        {
          title: 'Functional Literacy Rate (Updated)',
          formula: '(literate_count / cohort_total) * 100',
        },
        adminUser,
        mockReq
      );

      assert.strictEqual(updated.title, 'Functional Literacy Rate (Updated)');
      assert.strictEqual(updated.formula, '(literate_count / cohort_total) * 100');
    });

    test('deleteIndicator deletes unreferenced indicator', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Indicator Deletion Table', domain: 'Education' },
        adminUser,
        mockReq
      );

      const ind = await TableBuilderService.createIndicator(
        table.id,
        {
          indicatorCode: 'IND_TEMP_DELETE',
          name: 'Temporary Indicator',
          title: 'Temporary Indicator Title',
        },
        adminUser,
        mockReq
      );

      const delRes = await TableBuilderService.deleteIndicator(ind.id, adminUser, mockReq);
      assert.strictEqual(delRes.success, true);
    });
  });

  // ============================================================================
  // 5. RBAC Enforcement for Non-Admin Roles
  // ============================================================================
  describe('5. RBAC Enforcement (ENCODER and VIEWER Rejection)', () => {
    test('ENCODER role cannot create tables (ForbiddenError 403)', async () => {
      await assert.rejects(
        async () => {
          await TableBuilderService.createTable(
            { title: 'Unauthorized Encoder Table', domain: 'Governance' },
            encoderUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('VIEWER role cannot update tables (ForbiddenError 403)', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Admin Table', domain: 'Governance' },
        adminUser,
        mockReq
      );

      await assert.rejects(
        async () => {
          await TableBuilderService.updateTable(table.id, { title: 'Viewer Attempted Change' }, viewerUser, mockReq);
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('ENCODER role cannot bind dimensions (ForbiddenError 403)', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Admin Table Bind', domain: 'Governance' },
        adminUser,
        mockReq
      );
      const dimensions = await TableBuilderService.getDimensionDictionary({});

      await assert.rejects(
        async () => {
          await TableBuilderService.bindDimension(table.id, { dimensionId: dimensions[0].id }, encoderUser, mockReq);
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('VIEWER role cannot create dimensions (ForbiddenError 403)', async () => {
      await assert.rejects(
        async () => {
          await TableBuilderService.createDimension(
            { dimensionCode: 'DIM_VIEWER_ILLEGAL', name: 'Illegal Dimension' },
            viewerUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });

    test('ENCODER role cannot create indicators (ForbiddenError 403)', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Admin Table Ind', domain: 'Governance' },
        adminUser,
        mockReq
      );

      await assert.rejects(
        async () => {
          await TableBuilderService.createIndicator(
            table.id,
            { indicatorCode: 'IND_ENCODER_ILLEGAL', name: 'Illegal Indicator', title: 'Illegal' },
            encoderUser,
            mockReq
          );
        },
        (err: any) => {
          assert.strictEqual(err instanceof ForbiddenError, true);
          assert.strictEqual(err.statusCode, 403);
          return true;
        }
      );
    });
  });

  // ============================================================================
  // 6. Audit Trail Generation
  // ============================================================================
  describe('6. Audit Trail Logging Verification', () => {
    test('Mutations emit audit log events with actor and entity tracking', async () => {
      const table = await TableBuilderService.createTable(
        { title: 'Audited Statistical Table', domain: 'Economic Development' },
        adminUser,
        mockReq
      );

      const logs = await AuditService.getLogs({
        userId: adminUser.id,
        action: 'TABLE_DEFINITION_CREATED',
      });

      assert.ok(logs.logs.length >= 1);
      const matchingLog = logs.logs.find((l: any) => l.entityId === table.id);
      assert.ok(matchingLog);
      assert.strictEqual(matchingLog.action, 'TABLE_DEFINITION_CREATED');
      assert.strictEqual(matchingLog.entityType, 'StatisticalTableDefinition');
    });
  });
});
