import { Response } from 'express';
import { TableBuilderService } from '../../services/TableBuilderService';
import { sendSuccess, sendError } from '../../lib/response';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { UnauthorizedError } from '../../lib/errors';

export const listTables = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      page,
      limit,
      domain,
      isSystemTable,
      isArchived,
      classification,
      verificationStatus,
      search,
    } = req.query as any;

    const filter = {
      page: page !== undefined ? Number(page) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      domain: domain as string | undefined,
      isSystemTable: isSystemTable !== undefined ? Boolean(isSystemTable) : undefined,
      isArchived: isArchived !== undefined ? Boolean(isArchived) : undefined,
      classification: classification as any,
      verificationStatus: verificationStatus as any,
      search: search as string | undefined,
    };

    const result = await TableBuilderService.listTables(filter, req.user);
    return sendSuccess(res, result.tables, { pagination: result.pagination });
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};

export const getTableById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const table = await TableBuilderService.getTableById(req.params.id, req.user);
    return sendSuccess(res, table);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 404);
  }
};

export const createTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const table = await TableBuilderService.createTable(req.body, req.user, req);
    return sendSuccess(res, table, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const updateTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const table = await TableBuilderService.updateTable(req.params.id, req.body, req.user, req);
    return sendSuccess(res, table);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const deleteOrArchiveTable = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const result = await TableBuilderService.deleteOrArchiveTable(req.params.id, req.user, req);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const bindDimension = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const binding = await TableBuilderService.bindDimension(req.params.id, req.body, req.user, req);
    return sendSuccess(res, binding, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const unbindDimension = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const datasetId = (req.query?.datasetId as string) || req.body?.datasetId;

    const result = await TableBuilderService.unbindDimension(
      req.params.id,
      req.params.dimensionId,
      req.user,
      req,
      datasetId
    );
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const reorderDimensions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const dimensionsList = Array.isArray(req.body)
      ? req.body
      : req.body?.dimensions || [];

    const table = await TableBuilderService.reorderDimensions(
      req.params.id,
      dimensionsList,
      req.user,
      req
    );
    return sendSuccess(res, table);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const createDimension = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const dimension = await TableBuilderService.createDimension(req.body, req.user, req);
    return sendSuccess(res, dimension, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const getDimensionDictionary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, verificationStatus } = req.query;
    const dimensions = await TableBuilderService.getDimensionDictionary({
      search: search as string | undefined,
      verificationStatus: verificationStatus as any,
    });
    return sendSuccess(res, dimensions);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};

export const createIndicator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const indicator = await TableBuilderService.createIndicator(
      req.params.id,
      req.body,
      req.user,
      req
    );
    return sendSuccess(res, indicator, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const updateIndicator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const indicator = await TableBuilderService.updateIndicator(
      req.params.indicatorId,
      req.body,
      req.user,
      req
    );
    return sendSuccess(res, indicator);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const deleteIndicator = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return sendError(res, new UnauthorizedError('Authentication required'));
    }

    const result = await TableBuilderService.deleteIndicator(
      req.params.indicatorId,
      req.user,
      req
    );
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};
