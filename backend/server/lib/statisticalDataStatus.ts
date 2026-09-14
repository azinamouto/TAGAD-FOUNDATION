/** Catalog verification and persisted observation availability are independent. */
export function statisticalDataStatus(table: { id?: string; _count?: { observations?: number } }, persisted: boolean) {
  const hasRealData = persisted && (table._count?.observations ?? 0) > 0;
  return { hasRealData, dataStatus: hasRealData ? 'REAL DATA' : 'NO DATA' };
}
