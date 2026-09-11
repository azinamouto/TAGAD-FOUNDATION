import api from './axios';
import {
  TableDefinitionItem,
  TableListResponse,
  TableListQueryParams,
  CreateTablePayload,
  UpdateTablePayload,
  BindDimensionPayload,
  DimensionReorderItem,
  DimensionItem,
  CreateDimensionPayload,
  TableIndicatorItem,
  CreateIndicatorPayload,
  UpdateIndicatorPayload,
} from '../types/tableBuilder';

const BASE_URL = '/admin/table-builder';

export const listTables = async (
  params?: TableListQueryParams
): Promise<TableListResponse> => {
  const response = await api.get(`${BASE_URL}/tables`, { params });
  const data = response.data?.data || response.data || [];
  const meta = response.data?.meta?.pagination || {
    total: Array.isArray(data) ? data.length : 0,
    page: params?.page || 1,
    limit: params?.limit || 20,
    totalPages: 1,
  };

  return {
    tables: Array.isArray(data) ? data : [],
    pagination: meta,
  };
};

export const getTableById = async (
  idOrCode: string
): Promise<TableDefinitionItem> => {
  const response = await api.get(`${BASE_URL}/tables/${idOrCode}`);
  return response.data?.data || response.data;
};

export const createTable = async (
  payload: CreateTablePayload
): Promise<TableDefinitionItem> => {
  const response = await api.post(`${BASE_URL}/tables`, payload);
  return response.data?.data || response.data;
};

export const updateTable = async (
  id: string,
  payload: UpdateTablePayload
): Promise<TableDefinitionItem> => {
  const response = await api.put(`${BASE_URL}/tables/${id}`, payload);
  return response.data?.data || response.data;
};

export const deleteOrArchiveTable = async (
  id: string
): Promise<{ deleted?: boolean; archived?: boolean; message: string }> => {
  const response = await api.delete(`${BASE_URL}/tables/${id}`);
  return response.data?.data || response.data;
};

export const getDimensionDictionary = async (params?: {
  search?: string;
  verificationStatus?: string;
}): Promise<DimensionItem[]> => {
  const response = await api.get(`${BASE_URL}/dimension-dictionary`, { params });
  return response.data?.data || response.data || [];
};

export const createDimension = async (
  payload: CreateDimensionPayload
): Promise<DimensionItem> => {
  const response = await api.post(`${BASE_URL}/dimensions`, payload);
  return response.data?.data || response.data;
};

export const bindDimension = async (
  tableId: string,
  payload: BindDimensionPayload
): Promise<any> => {
  const response = await api.post(`${BASE_URL}/tables/${tableId}/dimensions`, payload);
  return response.data?.data || response.data;
};

export const unbindDimension = async (
  tableId: string,
  dimensionId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`${BASE_URL}/tables/${tableId}/dimensions/${dimensionId}`);
  return response.data?.data || response.data;
};

export const reorderDimensions = async (
  tableId: string,
  dimensions: DimensionReorderItem[]
): Promise<TableDefinitionItem> => {
  const response = await api.put(`${BASE_URL}/tables/${tableId}/dimensions/reorder`, {
    dimensions,
  });
  return response.data?.data || response.data;
};

export const createIndicator = async (
  tableId: string,
  payload: CreateIndicatorPayload
): Promise<TableIndicatorItem> => {
  const response = await api.post(`${BASE_URL}/tables/${tableId}/indicators`, payload);
  return response.data?.data || response.data;
};

export const updateIndicator = async (
  indicatorId: string,
  payload: UpdateIndicatorPayload
): Promise<TableIndicatorItem> => {
  const response = await api.put(`${BASE_URL}/indicators/${indicatorId}`, payload);
  return response.data?.data || response.data;
};

export const deleteIndicator = async (
  indicatorId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`${BASE_URL}/indicators/${indicatorId}`);
  return response.data?.data || response.data;
};
