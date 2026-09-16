import './testEnvironment';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GADPlanService as G } from '../server/services/GADPlanService';
import { Role, GADPlanStatus as S } from '@prisma/client';
import { updateGADPlanSchema } from '../server/validation/schemas';

test('partial GAD updates preserve omitted budgets and workflow status', () => {
  assert.deepEqual(updateGADPlanSchema.parse({ gadBudget: 150 }), { gadBudget: 150 });
  assert.deepEqual(updateGADPlanSchema.parse({}), {});
  assert.deepEqual(updateGADPlanSchema.parse({ status: 'APPROVED' }), { status: 'APPROVED' });
  assert.equal(updateGADPlanSchema.safeParse({ gadBudget: -1 }).success, false);
});

test('all GAD status entry points enforce the same state and budget checks', async () => {
  G.resetMemoryStore();
  const actor = { id: 'usr-superadmin-01', role: Role.SUPER_ADMIN, officeId: null };
  await assert.rejects(G.createGADPlan({ status: 'APPROVED' }, actor), (e: any) => e.statusCode === 422);
  const item = await G.createGADPlan({ fiscalYear: 2094, officeId: 'off-mpdc', totalBudget: 100000, budget: 100 }, actor);
  await assert.rejects(G.updatePlanStatus(item.planId, S.APPROVED, actor), (e: any) => e.statusCode === 422);
  await assert.rejects(G.updateGADPlan(item.planId, { status: S.APPROVED }, actor), (e: any) => e.statusCode === 403);
  await G.submitPlan(item.planId, actor);
  await assert.rejects(G.updatePlanStatus(item.planId, S.APPROVED, actor), (e: any) => e.statusCode === 422);
  await assert.rejects(G.approvePlan(item.planId, actor, 'false' as any, 'not a boolean'), (e: any) => e.statusCode === 422);
  await assert.rejects(G.updatePlanStatus(item.planId, S.REVISED, actor), (e: any) => e.statusCode === 422);
  assert.equal((await G.approvePlan(item.planId, actor, true, 'Documented administrative exception')).status, S.APPROVED);
  await assert.rejects(G.updateGADPlan(item.planId, { gadBudget: 0 }, actor), (e: any) => e.statusCode === 403);
  await assert.rejects(G.updateGADPlan(item.id, { budget: 0 }, actor), (e: any) => e.statusCode === 403);
  await assert.rejects(G.deleteGADPlan(item.planId, actor), (e: any) => e.statusCode === 403);
  await assert.rejects(G.deleteGADPlan(item.id, actor), (e: any) => e.statusCode === 403);
  await assert.rejects(G.createGADPlanItem(item.planId, { budget: 10 }, actor), (e: any) => e.statusCode === 403);
  await assert.rejects(G.createGADPlan({ fiscalYear: 2094, officeId: 'off-mpdc', budget: 20 }, actor), (e: any) => e.statusCode === 403);
});
