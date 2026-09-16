import { captureBackendError } from './errorTracking';
import { Response } from 'express';
import { AppError } from './errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: Record<string, any>,
  statusCode: number = 200
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  error: AppError | Error | string,
  statusCode: number = 500
): Response => {
  captureBackendError(error, error instanceof AppError ? error.statusCode : statusCode);
  // Only deliberately constructed client errors are safe to disclose. Controller
  // fallback status codes must not expose database messages, paths, or SDK details.
  if (process.env.NODE_ENV === 'production' &&
      (!(error instanceof AppError) || error.statusCode >= 500)) {
    const unavailable = error instanceof AppError && error.statusCode === 503;
    return res.status(unavailable ? 503 : 500).json({
      success: false,
      error: {
        code: unavailable ? 'SERVICE_UNAVAILABLE' : 'INTERNAL_SERVER_ERROR',
        message: unavailable ? 'Service temporarily unavailable' : 'Internal server error',
      },
    });
  }
  if (error instanceof AppError) {
    const code = error.code || 'APP_ERROR';
    return res.status(error.statusCode).json({
      success: false,
      error: {
        code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
  }

  const message = typeof error === 'string' ? error : error.message || 'Internal server error';
  const code = (error as any)?.code || (error as any)?.errorCode || 'INTERNAL_SERVER_ERROR';

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
