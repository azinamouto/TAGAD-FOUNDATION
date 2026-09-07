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

export interface StatisticalIndicatorItem {
  id?: string;
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

export interface StatisticalTableCatalogItem {
  id?: string;
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
  verificationStatus: StatisticalVerificationStatus;
  hasRealData?: boolean;
  dataStatus?: 'REAL DATA' | 'UNVERIFIED' | string;
  indicators?: StatisticalIndicatorItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface DomainSummary {
  domain: string;
  tableCount: number;
  tables: Array<{
    tableNumber: number;
    tableCode: string;
    title: string;
    classification: StatisticalTableClassification;
    verificationStatus: StatisticalVerificationStatus;
  }>;
  verifiedCount: number;
  unverifiedCount: number;
  indicatorCount: number;
}

export interface StatisticalDimensionItem {
  id: string;
  dimensionCode: string;
  name: string;
  description: string;
  dataType: string;
  vocabularySource?: string;
  verificationStatus: StatisticalVerificationStatus;
}

export interface CatalogFilterParams {
  domain?: string;
  classification?: string;
  verificationStatus?: string;
  search?: string;
  page?: number;
  limit?: number;
}
