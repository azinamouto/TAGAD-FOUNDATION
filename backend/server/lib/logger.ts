import { SENSITIVE_KEYS } from './sensitiveKeys';
import { Request } from 'express';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  clientIp?: string;
  userAgent?: string;
  userId?: string;
  error?: {
    name?: string;
    message: string;
    code?: string;
    stack?: string;
  };
  details?: any;
  [key: string]: any;
}

const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'accesstoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'api_key',
  'creditcard',
  'ssn',
  'birthdate',
  'phonenumber',
  'contactnumber',
  'mobilenumber',
];

const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
const BEARER_REGEX = /^Bearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/i;

function isSensitiveLogKey(key: string): boolean {
  return key.toLowerCase().split(/[.\[\]]+/).some(part =>
    SENSITIVE_KEYS.has(part) || SENSITIVE_KEY_PATTERNS.some(pattern => part.includes(pattern))
  );
}

/** Redact decoded query keys before any raw request URL reaches a log sink. */
export function redactLogUrl(value: string): string {
  const queryStart = value.indexOf('?');
  if (queryStart < 0) return value;
  const query = new URLSearchParams(value.slice(queryStart + 1));
  const sanitized = new URLSearchParams();
  for (const [key, entry] of query) {
    sanitized.append(key, isSensitiveLogKey(key) ? '[REDACTED]' : entry);
  }
  return value.slice(0, queryStart + 1) + sanitized.toString();
}

/**
 * Recursively deep-redacts sensitive fields and patterns from log data.
 */
export function redactPII(data: any, depth = 0): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Prevent circular references and excessive recursion
  if (depth > 8) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (typeof data === 'string') {
    // Redact JWT or Bearer string values
    if (BEARER_REGEX.test(data.trim())) {
      return 'Bearer [REDACTED_JWT]';
    }
    if (JWT_REGEX.test(data.trim()) && data.length > 30) {
      return '[REDACTED_JWT]';
    }
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactPII(item, depth + 1));
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: redactPII(data.message, depth + 1),
      code: (data as any).code,
      stack: process.env.NODE_ENV === 'production' ? undefined : redactPII(data.stack, depth + 1),
    };
  }

  if (typeof data === 'object') {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      // Check if key matches sensitive patterns
      const isSensitiveKey = isSensitiveLogKey(key);

      if (isSensitiveKey) {
        redacted[key] = '[REDACTED]';
      } else if (['path', 'url', 'originalurl'].includes(lowerKey) && typeof value === 'string') {
        redacted[key] = redactLogUrl(value);
      } else {
        redacted[key] = redactPII(value, depth + 1);
      }
    }
    return redacted;
  }

  return data;
}

class Logger {
  private formatLog(level: LogLevel, event: string, details?: any, meta?: Partial<StructuredLogEntry>): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...(meta ? redactPII(meta) : {}),
      ...(details !== undefined ? { details: redactPII(details) } : {}),
    };
    return entry;
  }

  private write(entry: StructuredLogEntry) {
    const jsonOutput = JSON.stringify(entry);
    if (entry.level === 'ERROR') {
      console.error(jsonOutput);
    } else if (entry.level === 'WARN') {
      console.warn(jsonOutput);
    } else {
      console.log(jsonOutput);
    }
  }

  public info(event: string, details?: any, meta?: Partial<StructuredLogEntry>) {
    this.write(this.formatLog('INFO', event, details, meta));
  }

  public warn(event: string, details?: any, meta?: Partial<StructuredLogEntry>) {
    this.write(this.formatLog('WARN', event, details, meta));
  }

  public error(event: string, errorOrDetails?: any, meta?: Partial<StructuredLogEntry>) {
    let errorObj: any;
    let detailsObj: any;

    if (errorOrDetails instanceof Error) {
      errorObj = {
        name: errorOrDetails.name,
        message: errorOrDetails.message,
        code: (errorOrDetails as any).code,
        stack: process.env.NODE_ENV === 'production' ? undefined : errorOrDetails.stack,
      };
    } else {
      detailsObj = errorOrDetails;
    }

    const logEntry = this.formatLog('ERROR', event, detailsObj, {
      ...meta,
      ...(errorObj ? { error: errorObj } : {}),
    });
    this.write(logEntry);
  }

  public debug(event: string, details?: any, meta?: Partial<StructuredLogEntry>) {
    if (process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'DEBUG') {
      this.write(this.formatLog('DEBUG', event, details, meta));
    }
  }
}

export const logger = new Logger();
