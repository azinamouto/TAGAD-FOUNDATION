import { Request, Response, NextFunction } from 'express';

import { SENSITIVE_KEYS } from '../lib/sensitiveKeys';

/**
 * Deeply strips sensitive PII fields from JSON payloads before sending to public clients
 */
export function sanitizePII(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizePII(item));
  }

  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // If key is known sensitive, omit it
      if (SENSITIVE_KEYS.has(lowerKey)) {
        continue;
      }

      // If key matches partial pattern for PII
      if (lowerKey.includes('password') || lowerKey.includes('secret')) {
        continue;
      }

      cleaned[key] = sanitizePII(value);
    }
    return cleaned;
  }

  return data;
}

/**
 * Express middleware that intercepts res.json on public routes to enforce zero PII leakage
 */
export const enforcePIISafety = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json.bind(res);

  res.json = function (body: any) {
    if (body && typeof body === 'object') {
      const sanitized = sanitizePII(body);
      return originalJson(sanitized);
    }
    return originalJson(body);
  };

  next();
};
