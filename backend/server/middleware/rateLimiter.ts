import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { sendError } from '../lib/response';
import { AppError } from '../lib/errors';
import { logger } from '../lib/logger';

/**
 * Rate limiter for authentication login endpoint (POST /api/auth/login).
 * Protects against brute-force and credential stuffing attacks.
 * Defaults to 10 attempts per 15-minute window per IP.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: () => {
    const envVal = process.env.RATE_LIMIT_LOGIN_MAX;
    return envVal ? parseInt(envVal, 10) : 10;
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req: Request, res: Response) => {
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    logger.warn('RATE_LIMIT_EXCEEDED_LOGIN', { clientIp, path: req.originalUrl });

    return sendError(
      res,
      new AppError(
        'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
        429,
        'RATE_LIMIT_EXCEEDED'
      ),
      429
    );
  },
});

/**
 * Rate limiter for public feedback submissions (POST /api/public/feedback).
 * Protects public citizen feedback endpoints from spam and automated flooding.
 * Defaults to 5 submissions per 1-hour window per IP.
 */
export const feedbackRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: () => {
    const envVal = process.env.RATE_LIMIT_FEEDBACK_MAX;
    return envVal ? parseInt(envVal, 10) : 5;
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const clientIp = req.ip || req.socket?.remoteAddress || 'unknown';
    logger.warn('RATE_LIMIT_EXCEEDED_FEEDBACK', { clientIp, path: req.originalUrl });

    return sendError(
      res,
      new AppError(
        'Too many feedback submissions from this IP address. Please try again after 1 hour.',
        429,
        'RATE_LIMIT_EXCEEDED'
      ),
      429
    );
  },
});

/**
 * Helper factory to create customized rate limiters for testing and specific endpoints.
 */
export function createCustomRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  code?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      return sendError(
        res,
        new AppError(
          options.message || 'Too many requests. Please try again later.',
          429,
          options.code || 'RATE_LIMIT_EXCEEDED'
        ),
        429
      );
    },
  });
}
