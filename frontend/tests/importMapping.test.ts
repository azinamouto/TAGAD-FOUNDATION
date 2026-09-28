import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMeasureMappings } from '../src/modules/statisticalData/importMapping';
test('measure mapping requires actual CSV headers and explicit indicators', () => {
  assert.throws(() => validateMeasureMappings([], ['Women']));
  assert.throws(() => validateMeasureMappings([{ columnName: 'guessed_indicator', indicatorId: 'id' }], ['Women']));
  assert.throws(() => validateMeasureMappings([{ columnName: 'Women', indicatorId: '' }], ['Women']));
  assert.doesNotThrow(() => validateMeasureMappings([{ columnName: 'Women', indicatorId: 'id', period: '2026', dimensions: { SEX: 'Female' } }], ['Women']));
});
