import { Response } from 'express';
import { BeneficiaryService } from '../../services/BeneficiaryService';
import { sendSuccess, sendError } from '../../lib/response';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';

export const getBeneficiaries = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page, limit, search, sex, barangayId, barangay, sector, officeId, year } = req.query;
    const result = await BeneficiaryService.getBeneficiaries(
      {
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
        search: search as string,
        sex: sex as any,
        barangayId: barangayId as string,
        barangay: barangay as string,
        sector: sector as string,
        officeId: officeId as string,
        year: year ? Number(year) : undefined,
      },
      req.user, { strict: true }
    );
    return sendSuccess(res, result.data, result.pagination);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};

export const getBeneficiaryById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await BeneficiaryService.getBeneficiaryById(req.params.id, req.user);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 404);
  }
};

export const createBeneficiary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const result = await BeneficiaryService.createBeneficiary(req.body, req.user, req);
    return sendSuccess(res, result, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const updateBeneficiary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const result = await BeneficiaryService.updateBeneficiary(req.params.id, req.body, req.user, req);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const archiveBeneficiary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return sendError(res, 'Unauthorized', 401);
    const result = await BeneficiaryService.archiveBeneficiary(req.params.id, req.user, req);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};
