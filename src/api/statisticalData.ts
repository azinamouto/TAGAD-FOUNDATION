import api from './axios';
import {
  DatasetItem,
  CreateDatasetPayload,
  StatisticalObservationItem,
  ObservationListParams,
  ObservationListResponse,
  CreateObservationPayload,
  UpdateObservationPayload,
  BulkSaveObservationsPayload,
  BarangayItem,
} from '../types/statisticalData';

// ==============================================================================
// 1. Dataset Management APIs
// ==============================================================================

export const listDatasets = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  year?: number;
  sourceAgency?: string;
  search?: string;
}): Promise<{ datasets: DatasetItem[]; pagination: any }> => {
  const response = await api.get('/admin/datasets', { params });
  const data = response.data?.data || [];
  const pagination = response.data?.meta?.pagination || {
    total: Array.isArray(data) ? data.length : 0,
    page: params?.page || 1,
    limit: params?.limit || 50,
    totalPages: 1,
  };
  return {
    datasets: Array.isArray(data) ? data : [],
    pagination,
  };
};

export const getDatasetById = async (id: string): Promise<DatasetItem> => {
  const response = await api.get(`/admin/datasets/${id}`);
  return response.data?.data || response.data;
};

export const createDataset = async (
  payload: CreateDatasetPayload
): Promise<DatasetItem> => {
  const response = await api.post('/admin/datasets', payload);
  return response.data?.data || response.data;
};

// ==============================================================================
// 2. Statistical Observation APIs
// ==============================================================================

export const listObservations = async (
  tableId: string,
  params: ObservationListParams
): Promise<ObservationListResponse> => {
  const response = await api.get(`/admin/table-builder/tables/${tableId}/observations`, {
    params,
  });
  const data = response.data?.data || [];
  const meta = response.data?.meta || {};
  return {
    observations: Array.isArray(data) ? data : [],
    table: meta.table,
    dataset: meta.dataset,
    pagination: meta.pagination || {
      total: Array.isArray(data) ? data.length : 0,
      page: params.page || 1,
      limit: params.limit || 100,
      totalPages: 1,
    },
  };
};

export const createObservation = async (
  tableId: string,
  payload: CreateObservationPayload
): Promise<StatisticalObservationItem> => {
  const response = await api.post(
    `/admin/table-builder/tables/${tableId}/observations`,
    payload
  );
  return response.data?.data || response.data;
};

export const updateObservation = async (
  tableId: string,
  observationId: string,
  payload: UpdateObservationPayload
): Promise<StatisticalObservationItem> => {
  const response = await api.patch(
    `/admin/table-builder/tables/${tableId}/observations/${observationId}`,
    payload
  );
  return response.data?.data || response.data;
};

export const deleteObservation = async (
  tableId: string,
  observationId: string
): Promise<{ success: boolean; message?: string }> => {
  const response = await api.delete(
    `/admin/table-builder/tables/${tableId}/observations/${observationId}`
  );
  return response.data?.data || response.data;
};

export const bulkSaveObservations = async (
  tableId: string,
  payload: BulkSaveObservationsPayload
): Promise<any> => {
  const response = await api.post(
    `/admin/table-builder/tables/${tableId}/observations/bulk`,
    payload
  );
  return response.data?.data || response.data;
};

// ==============================================================================
// 3. Barangay Reference API
// ==============================================================================

export const getBarangays = async (): Promise<BarangayItem[]> => {
  try {
    const response = await api.get('/admin/barangays');
    const list = response.data?.data || response.data || [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    // Fallback to public barangays endpoint if admin is unauthenticated or restricted
    try {
      const pubRes = await api.get('/public/barangays');
      const pubList = pubRes.data?.data || pubRes.data || [];
      return Array.isArray(pubList) ? pubList : [];
    } catch {
      return [];
    }
  }
};

// ==============================================================================
// 4. Statistical CSV Import APIs (TAGAD Issue #16)
// ==============================================================================

export interface DiscoverStatisticalCsvPayload {
  csvContent: string;
  filename?: string;
  tableId?: string;
  datasetId?: string;
}

export const discoverStatisticalCsv = async (payload: DiscoverStatisticalCsvPayload): Promise<any> => {
  const response = await api.post('/admin/statistical-import/discover', payload);
  return response.data?.data || response.data;
};

export const previewStatisticalCsv = async (payload: any): Promise<any> => {
  const response = await api.post('/admin/statistical-import/preview', payload);
  return response.data?.data || response.data;
};

export const executeStatisticalCsv = async (payload: any): Promise<any> => {
  const response = await api.post('/admin/statistical-import/execute', payload);
  return response.data?.data || response.data;
};

