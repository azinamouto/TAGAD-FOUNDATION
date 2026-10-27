import { isDatabaseConnected } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { Response } from 'express';
import { UserService } from '../../services/UserService';
import { sendSuccess, sendError } from '../../lib/response';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, role, officeId } = req.query;
    const users = await UserService.getUsers({
      search: search as string,
      role: role as string,
      officeId: officeId as string,
    }, { strict: true });
    return sendSuccess(res, users);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 500);
  }
};

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserService.getUserById(req.params.id, { strict: true });
    return sendSuccess(res, user);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 404);
  }
};

export const createUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) throw new AppError('Storage unavailable; no save was confirmed', 503, 'DATA_UNAVAILABLE');
    const user = await UserService.createUser(req.body, req.user?.id, req);
    return sendSuccess(res, user, undefined, 201);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) throw new AppError('Storage unavailable; no save was confirmed', 503, 'DATA_UNAVAILABLE');
    const user = await UserService.updateUser(req.params.id, req.body, req.user?.id, req);
    return sendSuccess(res, user);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!isDatabaseConnected()) throw new AppError('Storage unavailable; no save was confirmed', 503, 'DATA_UNAVAILABLE');
    const result = await UserService.deactivateUser(req.params.id, req.user?.id, req);
    return sendSuccess(res, result);
  } catch (error: any) {
    return sendError(res, error, error.statusCode || 400);
  }
};
