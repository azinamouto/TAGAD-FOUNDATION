import {
  TableDefinitionItem,
  DimensionBindingItem,
  TableIndicatorItem,
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  StatisticalPublicationStatus,
} from './tableBuilder';

export type ObservationSaveRowState = 'NEW' | 'DIRTY' | 'SAVING' | 'SAVED' | 'ERROR';

export interface StatisticalObservationItem {
  id: string;
  tableDefinitionId: string;
  datasetId: string;
  indicatorId: string | null;
  barangayId: string | null;
  period: string;
  dimensions: Record<string, any>;
  dimensionsHash: string;
  numericValue: number;
  observationStatus: string | null;
  notes: string | null;
  barangay?: {
    id: string;
    name: string;
    code?: string;
  } | null;
  indicator?: {
    id: string;
    indicatorCode: string;
    name: string;
    unit?: string | null;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GridRowData {
  clientRowId: string;
  id?: string; // database UUID if persisted
  period: string;
  barangayId: string | null;
  indicatorId: string | null;
  dimensions: Record<string, string>;
  numericValue: number | string;
  observationStatus?: string;
  notes?: string;
  rowState: ObservationSaveRowState;
  errorMessage?: string;
  fieldErrors?: Record<string, string>;
}

export interface DatasetItem {
  id: string;
  datasetCode: string;
  name: string;
  description?: string | null;
  sourceAgency?: string | null;
  reportingYear?: number | null;
  reportingPeriod?: string | null;
  surveyRound?: string | null;
  geographicLevel?: string | null;
  isOfficial?: boolean;
  isPublished?: boolean;
  publicationStatus: 'DRAFT' | 'VALIDATED' | 'OFFICIAL' | 'PUBLISHED' | 'WITHDRAWN';
  verificationStatus?: 'UNVERIFIED' | 'PROVISIONAL' | 'VERIFIED';
  observationsCount?: number;
  importedBy?: {
    id: string;
    fullName?: string;
    email?: string;
    role?: string;
    officeId?: string | null;
    office?: { id: string; code?: string; name: string } | null;
  } | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateDatasetPayload {
  datasetCode: string;
  name: string;
  description?: string | null;
  sourceAgency?: string | null;
  reportingYear?: number | null;
  reportingPeriod?: string | null;
  surveyRound?: string | null;
  geographicLevel?: string;
  sourceFileName?: string | null;
}

export interface ObservationListParams {
  datasetId: string;
  period?: string;
  barangayId?: string;
  indicatorId?: string;
  page?: number;
  limit?: number;
}

export interface ObservationListResponse {
  observations: StatisticalObservationItem[];
  table?: {
    id: string;
    tableCode: string;
    title: string;
  };
  dataset?: {
    id: string;
    datasetCode: string;
    name: string;
    publicationStatus: string;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateObservationPayload {
  datasetId: string;
  period: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  dimensions?: Record<string, any>;
  numericValue: number;
  observationStatus?: string | null;
  notes?: string | null;
}

export interface UpdateObservationPayload {
  period?: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  dimensions?: Record<string, any>;
  numericValue?: number;
  observationStatus?: string | null;
  notes?: string | null;
}

export interface BulkObservationRowPayload {
  id?: string;
  period: string;
  barangayId?: string | null;
  indicatorId?: string | null;
  dimensions?: Record<string, any>;
  numericValue: number;
  observationStatus?: string | null;
  notes?: string | null;
}

export interface BulkSaveObservationsPayload {
  datasetId: string;
  observations: BulkObservationRowPayload[];
}

export interface BarangayItem {
  id: string;
  name: string;
  code?: string;
}

export type {
  TableDefinitionItem,
  DimensionBindingItem,
  TableIndicatorItem,
};

export {
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  StatisticalPublicationStatus,
};
