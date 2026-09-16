import { test } from 'node:test';
import assert from 'node:assert/strict';
import { updateProgramSchema, updateAccomplishmentSchema, updateOfficeSchema } from '../server/validation/schemas';

test('program title edits cannot reset status, budgets or beneficiary counts', () => {
  assert.deepEqual(updateProgramSchema.parse({ title: 'Revised title' }), { title: 'Revised title' });
  assert.deepEqual(updateProgramSchema.parse({ budgetActual: 0 }), { budgetActual: 0 });
  assert.equal(updateProgramSchema.safeParse({ budgetActual: -1 }).success, false);
});

test('accomplishment narrative edits cannot reset reported counts or expenditure', () => {
  assert.deepEqual(updateAccomplishmentSchema.parse({ remarks: 'Corrected narrative' }), { remarks: 'Corrected narrative' });
  assert.deepEqual(updateAccomplishmentSchema.parse({ actualMale: 0 }), { actualMale: 0 });
  assert.equal(updateAccomplishmentSchema.safeParse({ actualFemale: -1 }).success, false);
});

test('office metadata edits cannot reactivate an inactive office', () => {
  assert.deepEqual(updateOfficeSchema.parse({ name: 'Updated office name' }), { name: 'Updated office name' });
  assert.deepEqual(updateOfficeSchema.parse({ isActive: false }), { isActive: false });
  assert.equal(updateOfficeSchema.safeParse({ isActive: 'false' }).success, false);
});
