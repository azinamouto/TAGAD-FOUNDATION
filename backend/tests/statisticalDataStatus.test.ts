import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { TableBuilderService as T } from '../server/services/TableBuilderService';
import { StatisticalCatalogService as C } from '../server/services/StatisticalCatalogService';
test('database catalog and builder derive availability from persisted counts, not verification', async () => {
  const original = [prisma.statisticalTableDefinition.count, prisma.statisticalTableDefinition.findMany, prisma.statisticalTableDefinition.findFirst];
  const tables = [
    { id: 'empty', verificationStatus: 'VERIFIED', _count: { observations: 0 }, dimensionBindings: [], indicators: [] },
    { id: 'populated', verificationStatus: 'UNVERIFIED', _count: { observations: 3 }, dimensionBindings: [], indicators: [] },
  ];
  prisma.statisticalTableDefinition.count = (async () => 2) as any;
  prisma.statisticalTableDefinition.findMany = (async ({ include }: any) => {
    assert.equal(include._count.select.observations, true); return tables;
  }) as any;
  prisma.statisticalTableDefinition.findFirst = (async ({ include }: any) => {
    assert.equal(include._count.select.observations, true); return tables[1];
  }) as any;
  setDatabaseConnected(true);
  try {
    for (const rows of [(await T.listTables({})).tables, await C.getAllTableDefinitions(), (await C.getAllTableDefinitions({ page: 1 })).data]) {
      assert.equal(rows[0].hasRealData, false); assert.equal(rows[0].dataStatus, 'NO DATA');
      assert.equal(rows[1].hasRealData, true); assert.equal(rows[1].dataStatus, 'REAL DATA');
    }
    assert.equal((await T.getTableById('populated')).hasRealData, true);
  } finally {
    [prisma.statisticalTableDefinition.count, prisma.statisticalTableDefinition.findMany, prisma.statisticalTableDefinition.findFirst] = original as any;
    setDatabaseConnected(false);
  }
});
