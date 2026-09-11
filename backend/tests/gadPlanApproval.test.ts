import './testEnvironment';
import test from 'node:test';
import assert from 'node:assert/strict';
import { GADPlanService } from '../server/services/GADPlanService';
import { GADPlanStatus, Role } from '@prisma/client';

test('SUPER_ADMIN can approve a GAD plan through the status transition service', async () => {
  const created = await GADPlanService.createGADPlan(
    {
      fiscalYear: 2099,
      officeId: 'off-mpdc',
      budget: 100,
      genderIssue: 'Test approval plan',
    },
    { id: 'usr-superadmin-01', role: Role.SUPER_ADMIN, officeId: null }
  );

  const result = await GADPlanService.updatePlanStatus(
    created.planId,
    GADPlanStatus.APPROVED,
    { id: 'usr-superadmin-01', role: Role.SUPER_ADMIN, officeId: null }
  );

  assert.equal(result.status, GADPlanStatus.APPROVED);
});