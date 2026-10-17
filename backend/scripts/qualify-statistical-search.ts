import assert from 'node:assert/strict';
import express from 'express';
import prisma, { testDatabaseConnection } from '../server/lib/prisma';
import adminRoutes from '../server/routes/admin';
import { signAccessToken } from '../server/lib/jwt';
import { CBMS_SOURCE_ROWS } from '../server/data/cbmsSourceRows';

const url = new URL(process.env.DATABASE_URL || '');
if (url.hostname !== '127.0.0.1' || url.pathname !== '/tagad_qualification') throw new Error('Disposable qualification database required');
await testDatabaseConnection();
const encoder = await prisma.user.findFirstOrThrow({ where: { role: 'ENCODER', office: { code: 'QUAL_MPDC' } } });
const viewer = await prisma.user.findFirstOrThrow({ where: { role: 'VIEWER' } });
const admin = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });
const own = await prisma.statisticalDataset.findUniqueOrThrow({ where: { datasetCode: 'DS-MPDC-2024-DRAFT' } });
const foreign = await prisma.statisticalDataset.create({ data: { datasetCode: 'FOREIGN-SEARCH', name: 'Other office draft', importedById: (await prisma.user.findFirstOrThrow({ where: { role: 'ENCODER', office: { code: 'QUAL_MSWDO' } } })).id } });
const published = await prisma.statisticalDataset.create({ data: { datasetCode: 'PUBLIC-SEARCH', name: 'Published release', publicationStatus: 'PUBLISHED', isPublished: true } });
const source = CBMS_SOURCE_ROWS.find(row => row.tableNumber === 70)!;
const table = await prisma.statisticalTableDefinition.create({ data: { tableNumber: source.tableNumber, tableCode: source.tableCode, title: source.title, domain: 'Synthetic qualification', isSystemTable: true } });
await prisma.statisticalObservation.createMany({ data: Array.from({ length: 1001 }, (_, index) => ({
  datasetId: own.id, tableDefinitionId: table.id, period: '2094', numericValue: index, unit: 'persons',
  dimensions: { category: `OWN_MATCH_${index}` }, dimensionsHash: `own-${index}`, suppressionStatus: 'NONE',
})) });
await prisma.statisticalObservation.createMany({ data: [
  { datasetId: foreign.id, tableDefinitionId: table.id, period: '2094', numericValue: 5, dimensions: { category: 'FOREIGN_ONLY' }, suppressionStatus: 'NONE' },
  { datasetId: published.id, tableDefinitionId: table.id, period: '2094', numericValue: 8, dimensions: { category: 'PUBLIC_ONLY' }, suppressionStatus: 'NONE' },
  { datasetId: own.id, tableDefinitionId: table.id, period: '2094', numericValue: 999999, dimensions: { category: 'SUPPRESSED_ONLY' }, suppressionStatus: 'SUPPRESSED', unit: 'persons' },
  { datasetId: own.id, tableDefinitionId: table.id, period: '2094', numericValue: 20, dimensions: { category: 'RATE_ONLY' }, suppressionStatus: 'NONE', unit: 'percent' },
] });
const app = express(); app.use('/api/admin', adminRoutes);
const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
const base = `http://127.0.0.1:${(server.address() as any).port}/api/admin/statistical-search`;
async function get(user: any, path: string) {
  const token = signAccessToken({ id: user.id, email: user.email, role: user.role, officeId: user.officeId });
  const response = await fetch(base + path, { headers: { authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json() };
}
try {
  const ownMatches = await get(encoder, '?q=OWN_MATCH');
  assert.equal(ownMatches.status, 200, JSON.stringify(ownMatches.body));
  assert.equal(ownMatches.body.data.tables[0].matchingObservationCount, 1001);
  assert.equal((await get(encoder, '?q=FOREIGN_ONLY')).body.data.total, 0);
  assert.equal((await get(viewer, '?q=OWN_MATCH')).body.data.total, 0);
  assert.equal((await get(viewer, '?q=PUBLIC_ONLY')).body.data.total, 1);
  assert.equal((await get(admin, '?q=SUPPRESSED_ONLY')).body.data.total, 0);
  assert.equal((await get(admin, '?q=' + encodeURIComponent("%' OR 1=1 --"))).body.data.total, 0);
  const summaryPath = `/tables/${table.id}/summary?datasetId=${own.id}`;
  const summary = await get(encoder, summaryPath);
  assert.equal(summary.status, 200, JSON.stringify(summary.body));
  assert.equal(summary.body.data.groups.length, 2);
  const persons = summary.body.data.groups.find((group: any) => group.unit === 'persons');
  assert.equal(persons.observationCount, 1001);
  assert.equal(Number(persons.arithmeticMean), 500);
  assert.equal(Number(persons.maximum), 1000);
  assert.equal((await get(viewer, summaryPath)).status, 403);
  assert.equal((await get(encoder, `/tables/${table.id}/summary?datasetId=${foreign.id}`)).status, 403);
  console.log('Search PostgreSQL/HTTP PASS: 1001 observations, foreign-office isolation, published-only viewer data, suppression exclusion, literal query input, separate units and full-data summaries.');
} finally {
  await new Promise<void>(resolve => server.close(() => resolve())); await prisma.$disconnect();
}
