import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      startTime?: number;
    }
  }
}

/**
 * Express middleware for request tracing and structured logging.
 * - Extracts or generates an X-Request-Id
 * - Injects X-Request-Id into response headers
 * - Logs request completion with duration, status, and redacted metadata
 * - Automatically ignores internal Vite HMR/source files to keep logs clean
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers['x-request-id'] as string;
  const requestId = incomingId && incomingId.trim().length > 0 ? incomingId.trim() : crypto.randomUUID();

  req.id = requestId;
  req.startTime = performance.now();

  res.setHeader('X-Request-Id', requestId);

  const requestPath = req.originalUrl || req.url || '';

  // Skip noisy Vite development asset module fetches
  const isViteAsset =
    requestPath.startsWith('/@') ||
    requestPath.startsWith('/src/') ||
    requestPath.startsWith('/node_modules/') ||
    /\.(tsx?|jsx?|css|png|jpg|jpeg|gif|svg|ico|woff2?|map)$/i.test(requestPath);

  // Capture response finish event
  res.on('finish', () => {
    if (isViteAsset && res.statusCode < 400) {
      return;
    }

    const durationMs = req.startTime ? Number((performance.now() - req.startTime).toFixed(2)) : 0;
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = (req as any).user?.id || (req as any).user?.userId;

    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';

    const logPayload = {
      requestId,
      method: req.method,
      path: requestPath,
      statusCode: res.statusCode,
      durationMs,
      clientIp: String(clientIp),
      userAgent: String(userAgent),
      userId,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
    };

    if (level === 'ERROR') {
      logger.error('HTTP_REQUEST_FAILED', undefined, logPayload);
    } else if (level === 'WARN') {
      logger.warn('HTTP_REQUEST_WARNING', undefined, logPayload);
    } else {
      logger.info('HTTP_REQUEST_COMPLETED', undefined, logPayload);
    }
  });

  next();
};
