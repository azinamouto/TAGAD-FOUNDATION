export enum StatisticalTableClassification {
  AGGREGATED_STATISTICS = 'AGGREGATED_STATISTICS',
  INDICATOR = 'INDICATOR',
  DERIVED_METRIC = 'DERIVED_METRIC',
  REFERENCE_DATA = 'REFERENCE_DATA',
  UNVERIFIED = 'UNVERIFIED',
}

export enum StatisticalVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PROVISIONAL = 'PROVISIONAL',
  VERIFIED = 'VERIFIED',
}

export enum StatisticalPublicationStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  OFFICIAL = 'OFFICIAL',
  PUBLISHED = 'PUBLISHED',
  WITHDRAWN = 'WITHDRAWN',
}

export interface DimensionItem {
  id: string;
  dimensionCode: string;
  name: string;
  description?: string | null;
  dataType: string;
  vocabularySource?: string | null;
  verificationStatus: StatisticalVerificationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface DimensionBindingItem {
  id: string;
  tableDefinitionId: string;
  dimensionId: string;
  displayOrder: number;
  isRequired: boolean;
  allowedValues?: any;
  dimension: DimensionItem;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableIndicatorItem {
  id: string;
  tableDefinitionId: string;
  indicatorCode: string;
  name: string;
  title: string;
  description?: string | null;
  unit?: string | null;
  classification: StatisticalTableClassification;
  formula?: string | null;
  numeratorDefinition?: string | null;
  denominatorDefinition?: string | null;
  verificationStatus: StatisticalVerificationStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableDefinitionItem {
  id: string;
  tableNumber: number;
  tableCode: string;
  title: string;
  domain: string;
  classification: StatisticalTableClassification;
  description?: string | null;
  expectedUnit?: string | null;
  rowGrain?: string | null;
  dimensionsSummary?: string | null;
  measureStructure?: string | null;
  sourceFormat?: string | null;
  isSystemTable: boolean;
  isArchived: boolean;
  verificationStatus: StatisticalVerificationStatus;
  hasRealData?: boolean;
  dataStatus?: 'REAL DATA' | 'UNVERIFIED' | string;
  observationCount?: number;
  dimensionCount?: number;
  indicatorCount?: number;
  dimensionBindings: DimensionBindingItem[];
  indicators: TableIndicatorItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TableListResponse {
  tables: TableDefinitionItem[];
  pagination: PaginationMeta;
}

export interface TableListQueryParams {
  page?: number;
  limit?: number;
  domain?: string;
  isSystemTable?: boolean;
  isArchived?: boolean;
  classification?: StatisticalTableClassification | string;
  verificationStatus?: StatisticalVerificationStatus | string;
  search?: string;
}

export interface CreateTablePayload {
  tableCode?: string;
  title: string;
  domain: string;
  classification?: StatisticalTableClassification;
  description?: string | null;
  expectedUnit?: string | null;
  rowGrain?: string | null;
  dimensionsSummary?: string | null;
  measureStructure?: string | null;
  sourceFormat?: string | null;
  dimensionIds?: string[];
}

export interface UpdateTablePayload {
  title?: string;
  domain?: string;
  classification?: StatisticalTableClassification;
  description?: string | null;
  expectedUnit?: string | null;
  rowGrain?: string | null;
  dimensionsSummary?: string | null;
  measureStructure?: string | null;
  sourceFormat?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
  isArchived?: boolean;
}

export interface BindDimensionPayload {
  dimensionId: string;
  displayOrder?: number;
  isRequired?: boolean;
  allowedValues?: any;
}

export interface DimensionReorderItem {
  dimensionId: string;
  displayOrder: number;
}

export interface CreateDimensionPayload {
  dimensionCode: string;
  name: string;
  description?: string | null;
  dataType?: string;
  vocabularySource?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}

export interface CreateIndicatorPayload {
  indicatorCode: string;
  name: string;
  title: string;
  description?: string | null;
  unit?: string | null;
  classification?: StatisticalTableClassification;
  formula?: string | null;
  numeratorDefinition?: string | null;
  denominatorDefinition?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}

export interface UpdateIndicatorPayload {
  name?: string;
  title?: string;
  description?: string | null;
  unit?: string | null;
  classification?: StatisticalTableClassification;
  formula?: string | null;
  numeratorDefinition?: string | null;
  denominatorDefinition?: string | null;
  verificationStatus?: StatisticalVerificationStatus;
}
