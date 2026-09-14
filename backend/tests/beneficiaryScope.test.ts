import './testEnvironment';
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import prisma, { setDatabaseConnected } from '../server/lib/prisma';
import { BeneficiaryService as Service, MEMORY_BENEFICIARIES } from '../server/services/BeneficiaryService';
import { Role } from '@prisma/client';
const actor = { id: 'encoder-a', role: Role.ENCODER, officeId: 'office-a' };
const records = ['a', 'b'].map(office => ({ id: office, officeId: `office-${office}`, firstName: 'Synthetic', lastName: office, isArchived: false, barangay: { name: 'Test' } }));
const restores: Array<() => void> = [];
const mock = { method(target: any, key: string, replacement: any) { const original = target[key]; target[key] = replacement; restores.push(() => { target[key] = original; }); } };
afterEach(() => { restores.splice(0).forEach(restore => restore()); MEMORY_BENEFICIARIES.length = 0; setDatabaseConnected(false); });
for (const mode of ['memory', 'database', 'database-error']) {
  test(`beneficiary read isolation: ${mode}`, async () => {
    MEMORY_BENEFICIARIES.push(...records);
    setDatabaseConnected(mode !== 'memory');
    mock.method(prisma.beneficiary, 'findMany', async ({ where }: any) => {
      if (mode === 'database-error') throw new Error('Unavailable');
      assert.equal(where.officeId, actor.officeId);
      return records.filter(r => r.officeId === where.officeId);
    });
    mock.method(prisma.beneficiary, 'count', async () => 1);
    mock.method(prisma.beneficiary, 'findUnique', async ({ where }: any) => {
      if (mode === 'database-error') throw new Error('Unavailable');
      return records.find(r => r.id === where.id);
    });
    assert.deepEqual((await Service.getBeneficiaries({}, actor)).data.map(r => r.id), ['a']);
    assert.equal((await Service.getBeneficiaryById('a', actor)).id, 'a');
    await assert.rejects(Service.getBeneficiaryById('b', actor), /not found/i);
    await assert.rejects(Service.getBeneficiaries({ officeId: 'office-b' }, actor), /other offices/i);
    await assert.rejects(Service.getBeneficiaries({}, { ...actor, officeId: null }), /assigned office/i);
  });
}
