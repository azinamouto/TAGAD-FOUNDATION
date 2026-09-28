export interface MeasureMapping {
  columnName: string;
  indicatorId: string;
  period?: string;
  unit?: string;
  dimensions?: Record<string, string>;
}
export function validateMeasureMappings(measures: MeasureMapping[], headers: string[]): void {
  if (!measures.length) throw new Error('Add at least one measure column.');
  for (const measure of measures) {
    if (!headers.includes(measure.columnName) || !measure.indicatorId) throw new Error('Each measure needs an existing CSV column and an indicator.');
  }
}
