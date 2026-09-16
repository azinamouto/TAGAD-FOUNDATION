export type IngestionMode = 'RECORD_PER_ROW' | 'MEASURE_COLUMNS';
export type DuplicateStrategy = 'REJECT' | 'SKIP' | 'OVERWRITE';

export interface ColumnMappingConfig {
  period?: { sourceColumn?: string; constantValue?: string };
  barangay?: { sourceColumn?: string; constantValue?: string | null };
  indicator?: { sourceColumn?: string; constantIndicatorId?: string };
  numericValueColumn?: string;
  measureColumns?: Array<{
    columnName: string; indicatorId: string; unit?: string;
    period?: string;
    dimensions?: Record<string, string>;
  }>;
  unit?: { sourceColumn?: string; constantValue?: string };
  dimensions?: Record<string, { sourceColumn?: string; constantValue?: string }>;
}

export interface ColumnProfile {
  name: string;
  normalizedName: string;
  detectedType: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'empty';
  totalValues: number;
  nonEmptyValues: number;
  emptyValues: number;
  uniqueValuesCount: number;
  sampleValues: string[];
  inferredRole: 'PERIOD' | 'BARANGAY' | 'INDICATOR' | 'MEASURE_VALUE' | 'DIMENSION' | 'UNKNOWN';
  targetFieldConfidence: number;
}

export interface CandidateMappings {
  period?: { sourceColumn?: string; confidence: number };
  barangay?: { sourceColumn?: string; confidence: number };
  indicator?: { sourceColumn?: string; confidence: number };
  numericValueColumn?: { sourceColumn?: string; confidence: number };
  measureColumns?: Array<{ columnName: string; indicatorId: string; indicatorCode: string; indicatorName: string; confidence: number }>;
  dimensions?: Record<string, { sourceColumn?: string; dimensionCode: string; dimensionName: string; confidence: number }>;
}

export interface DiscoveryResult {
  csvLayout: { headerRow: number; headerRowCount: number; skippedBannerRows: number };
  filename: string;
  totalRows: number;
  totalColumns: number;
  rawHeaders: string[];
  normalizedHeaders: string[];
  columns: ColumnProfile[];
  sampleRows: Array<Record<string, string>>;
  candidateMappings?: CandidateMappings;
}

export interface PreviewRow {
  rowNumber: number;
  rawRecord: Record<string, string>;
  coordinate: {
    period: string;
    barangayId: string | null;
    barangayName?: string | null;
    indicatorId: string | null;
    indicatorCode?: string | null;
    dimensions: Record<string, string>;
    dimensionsHash: string;
  };
  numericValue: number | null;
  unit: string | null;
  status: 'VALID' | 'INVALID' | 'DUPLICATE_IN_FILE' | 'COLLIDES_EXISTING';
  errors: string[];
}

export interface PreviewResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRowsWithinFile: number;
  existingCoordinateCollisions: number;
  blockingErrors: string[];
  rows: PreviewRow[];
  dataset: { id: string; datasetCode: string; name: string; publicationStatus: string; officeId: string | null };
  table: { id: string; tableCode: string; title: string; geographicLevel: string; rowGrain: string };
}

export interface ExecuteResult {
  success: boolean;
  datasetId: string;
  datasetCode: string;
  tableId: string;
  tableCode: string;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  duplicateStrategy: DuplicateStrategy;
  ingestionMode: IngestionMode;
  provenanceId: string | null;
  auditLogId: string | null;
  processingTimeMs: number;
  errors: Array<{ rowNumber: number; message: string }>;
}
