import type { PrismaClient } from '@prisma/client';
import type { StatisticalTableCatalogItem } from './StatisticalCatalogService';

/** Apply source identities atomically; never discard or relabel linked statistical data. */
export async function reconcileCbmsCatalog(client: PrismaClient, source: StatisticalTableCatalogItem[]) {
  if (source.length !== 69 || new Set(source.map(row => row.tableNumber)).size !== 69 ||
      new Set(source.map(row => row.tableCode)).size !== 69) throw new Error('Invalid CBMS source register');
  return client.$transaction(async tx => {
    const existing = await tx.statisticalTableDefinition.findMany({
      include: { _count: { select: { observations: true, indicators: true, dimensionBindings: true } } },
    });
    const numbers = new Set(source.map(row => row.tableNumber));
    const isCanonical = (row: typeof existing[number]) => row.isSystemTable || /^STAT-TAB-\d+$/.test(row.tableCode);
    const linked = (row: typeof existing[number]) => Object.values(row._count).some(count => count > 0);
    const obsolete = existing.filter(row => isCanonical(row) && !numbers.has(row.tableNumber));
    for (const row of obsolete) {
      if (linked(row)) throw new Error(`CBMS reconciliation requires review: obsolete table ${row.tableNumber} has linked data`);
    }
    for (const row of source) {
      const previous = existing.find(item => item.tableNumber === row.tableNumber);
      if (previous && !isCanonical(previous) && previous.tableCode !== row.tableCode)
        throw new Error(`CBMS table number ${row.tableNumber} collides with a custom table`);
      if (previous && previous.title !== row.title && linked(previous))
        throw new Error(`CBMS reconciliation requires review: table ${row.tableNumber} has linked data and a different title`);
    }
    let seeded = 0, updated = 0;
    for (const row of obsolete) await tx.statisticalTableDefinition.delete({ where: { id: row.id } });
    for (const row of source) {
      const previous = existing.find(item => item.tableNumber === row.tableNumber);
      if (!previous) {
        await tx.statisticalTableDefinition.create({ data: { ...row, isSystemTable: true } });
        seeded++;
      } else if (previous.title !== row.title || previous.tableCode !== row.tableCode || !previous.isSystemTable) {
        await tx.statisticalTableDefinition.update({ where: { id: previous.id }, data: {
          tableNumber: row.tableNumber, tableCode: row.tableCode, title: row.title,
          isSystemTable: true,
        } });
        updated++;
      }
    }
    return { count: source.length, seeded, updated, removed: obsolete.length };
  }, { isolationLevel: 'Serializable', timeout: 60000 });
}
