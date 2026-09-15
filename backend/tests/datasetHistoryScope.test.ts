import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { AuditService } from '../server/services/AuditService';
import { StatisticalDatasetService as D } from '../server/services/StatisticalDatasetService';

for (const connected of [false, true]) {
  test(`dataset history filters before pagination (${connected ? 'database query' : 'memory'})`, async () => {
    const original = { get: D.getDatasetById, count: prisma.auditLog.count, find: prisma.auditLog.findMany };
    const datasetId = `history-target-${connected}`;
    const logs = Array.from({ length: 150 }, (_, i) => ({
      id: `entry-${i}`, entityId: i < 3 ? datasetId : 'other-dataset',
      entityType: 'StatisticalDataset', action: i < 3 ? 'STATISTICAL_DATASET_WITHDRAWN' : 'STATISTICAL_DATASET_CREATED',
      createdAt: new Date(1700000000000 + i), afterState: { reason: 'Documented withdrawal' },
    }));
    setDatabaseConnected(false);
    for (const log of logs) await AuditService.logAction(log);
    D.getDatasetById = (async () => ({ id: datasetId })) as typeof D.getDatasetById;
    setDatabaseConnected(connected);
    try {
      prisma.auditLog.count = (async ({ where }: any) => {
        assert.equal(where.entityId, datasetId);
        return logs.filter(log => log.entityId === where.entityId).length;
      }) as any;
      prisma.auditLog.findMany = (async ({ where, skip, take }: any) => {
        assert.equal(where.entityId, datasetId);
        assert.equal(where.entityType, 'StatisticalDataset');
        return logs.filter(log => log.entityId === where.entityId).reverse().slice(skip, skip + take);
      }) as any;
      const result = await D.getDatasetHistory(datasetId, { id: 'admin', role: 'ADMIN' });
      assert.equal(result.history.length, 3);
      assert.ok(result.history.every(log => log.action === 'STATISTICAL_DATASET_WITHDRAWN'));
      assert.ok(result.history.every(log => log.reason === 'Documented withdrawal'));
    } finally {
      D.getDatasetById = original.get;
      prisma.auditLog.count = original.count;
      prisma.auditLog.findMany = original.find;
      setDatabaseConnected(false);
    }
  });
}
