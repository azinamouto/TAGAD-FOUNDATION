import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { STATISTICAL_69_TABLE_CATALOG as source } from '../server/services/StatisticalCatalogService';
import { reconcileCbmsCatalog } from '../server/services/reconcileCbmsCatalog';

const url = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.pathname !== '/tagad_qualification')
  throw new Error('Catalog qualification requires the disposable local qualification database');
const db = new PrismaClient();
try {
  assert.equal(await db.statisticalTableDefinition.count(), 0, 'qualification requires an empty catalog');
  await db.statisticalTableDefinition.createMany({ data: Array.from({ length: 74 }, (_, i) => ({
    tableNumber: i + 1, tableCode: `STAT-TAB-${String(i + 1).padStart(2, '0')}`,
    title: `Legacy seed ${i + 1}`, domain: 'Legacy', isSystemTable: true,
  })) });
  const custom = await db.statisticalTableDefinition.create({ data: {
    tableNumber: 100, tableCode: 'CUSTOM_KEEP', title: 'Custom table retained', domain: 'Custom',
  } });
  const result = await reconcileCbmsCatalog(db, source);
  assert.equal(result.count, 69); assert.equal(result.updated, 69); assert.equal(result.removed, 5);
  const rows = await db.statisticalTableDefinition.findMany({ where: { isSystemTable: true }, orderBy: { tableNumber: 'asc' } });
  assert.deepEqual(rows.map(({ tableNumber, tableCode, title }) => ({ tableNumber, tableCode, title })),
    source.map(({ tableNumber, tableCode, title }) => ({ tableNumber, tableCode, title })));
  assert.ok(await db.statisticalTableDefinition.findUnique({ where: { id: custom.id } }));
  assert.deepEqual(await reconcileCbmsCatalog(db, source), { count: 69, seeded: 0, updated: 0, removed: 0 });
  const obsolete = await db.statisticalTableDefinition.create({ data: {
    tableNumber: 68, tableCode: 'STAT-TAB-68', title: 'Needs source review', domain: 'Legacy', isSystemTable: true,
  } });
  const indicator = await db.statisticalIndicator.create({ data: {
    indicatorCode: 'QUAL_PROTECTED', name: 'Protected', title: 'Protected', tableDefinitionId: obsolete.id,
  } });
  await assert.rejects(reconcileCbmsCatalog(db, source), /obsolete table 68 has linked data/);
  assert.ok(await db.statisticalTableDefinition.findUnique({ where: { id: obsolete.id } }));
  await db.statisticalIndicator.delete({ where: { id: indicator.id } });
  await db.statisticalTableDefinition.delete({ where: { id: obsolete.id } });
  await db.statisticalTableDefinition.update({ where: { id: rows[0].id }, data: { title: 'Different data concept' } });
  const bound = await db.statisticalIndicator.create({ data: {
    indicatorCode: 'QUAL_BOUND', name: 'Bound', title: 'Bound', tableDefinitionId: rows[0].id,
  } });
  await assert.rejects(reconcileCbmsCatalog(db, source), /table 1 has linked data and a different title/);
  assert.equal((await db.statisticalTableDefinition.findUniqueOrThrow({ where: { id: rows[0].id } })).title, 'Different data concept');
  await db.statisticalIndicator.delete({ where: { id: bound.id } });
  await reconcileCbmsCatalog(db, source);
  // The runner owns this initially empty database; clear its fixtures before issue16.
  await db.statisticalTableDefinition.deleteMany();
  console.log('CBMS PostgreSQL qualification PASS: 74 legacy -> 69 exact source rows; custom retained; idempotent; linked data protected.');
} finally { await db.$disconnect(); }
