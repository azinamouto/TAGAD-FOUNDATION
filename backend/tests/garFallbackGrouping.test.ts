import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setDatabaseConnected } from '../server/lib/prisma';
import { FALLBACK_GAD_PLANS as plans, FALLBACK_ACCOMPLISHMENTS as accomplishments } from '../server/lib/fallbackStore';
import { GarReportService } from '../server/services/GarReportService';

for (const programId of [undefined, null, 'shared-program']) {
  test(`GAR attributes item-linked accomplishments only to that item (program ${programId})`, async () => {
    setDatabaseConnected(false);
    const originalPlans = [...plans], originalAccomplishments = [...accomplishments];
    plans.splice(0, plans.length, { id: 'plan', fiscalYear: 2026, items: [
      { id: 'item-a', programId, budget: 100 }, { id: 'item-b', programId, budget: 200 },
    ] });
    accomplishments.splice(0, accomplishments.length,
      { gadPlanItemId: 'item-a', programId, quarter: 1, actualBudgetUsed: 10, actualMale: 2 },
      { gadPlanItemId: 'item-b', programId, quarter: 1, actualBudgetUsed: 30, actualFemale: 3 },
      { gadPlanItemId: 'item-a', programId, quarter: 2, actualBudgetUsed: 999 },
    );
    try {
      const report = await GarReportService.getQuarterlyGarVariance({ year: 2026, quarter: 1 });
      assert.deepEqual(report.items.map(item => [item.id, item.actualBudgetUsed, item.accomplishmentCount]), [
        ['item-a', 10, 1], ['item-b', 30, 1],
      ]);
      assert.equal(report.summary.totalActualBudgetUsed, 40);
      assert.equal(report.summary.totalBudgetVariance, 260);
      assert.equal(report.summary.totalBeneficiaries, 5);
    } finally {
      plans.splice(0, plans.length, ...originalPlans);
      accomplishments.splice(0, accomplishments.length, ...originalAccomplishments);
    }
  });
}
