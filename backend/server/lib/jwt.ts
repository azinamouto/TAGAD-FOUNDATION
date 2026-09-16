import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { TokenRevocationService } from '../services/TokenRevocationService';

const INSECURE_DEFAULT_SECRETS = new Set([
  'tagad_talibon_jwt_secret_key_2026',
  'tagad_talibon_refresh_secret_key_2026',
  'tagad_talibon_secret_2025',
  'secret',
  'jwt-secret',
  'development-secret',
  'change-me',
  'test',
]);

const DEV_FALLBACK_SECRET = 'dev_only_tagad_local_signing_secret_do_not_use_in_prod_2026';
const DEV_FALLBACK_REFRESH_SECRET = 'dev_only_tagad_local_refresh_secret_do_not_use_in_prod_2026';

export class JwtConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtConfigurationError';
  }
}

/**
 * Validates and retrieves JWT secrets according to environment mode.
 * In production (NODE_ENV=production):
 *   - JWT_SECRET and JWT_REFRESH_SECRET must be explicitly provided in the environment.
 *   - Insecure default/placeholder secrets and short keys (<16 chars) are strictly rejected.
 *   - Fails fast by throwing JwtConfigurationError.
 * In development/test mode:
 *   - Controlled development secrets are permitted if environment variables are not set.
 */
export function validateJwtConfig(): { jwtSecret: string; jwtRefreshSecret: string } {
  const isProd = process.env.NODE_ENV === 'production';
  const rawSecret = process.env.JWT_SECRET;
  const rawRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (isProd) {
    if (!rawSecret || rawSecret.trim().length === 0) {
      throw new JwtConfigurationError(
        'CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is required in production mode. Refusing to start with insecure configuration.'
      );
    }
    if (INSECURE_DEFAULT_SECRETS.has(rawSecret.trim()) || rawSecret.length < 16) {
      throw new JwtConfigurationError(
        'CRITICAL SECURITY ERROR: Insecure, default, or short JWT_SECRET provided in production mode. A strong secret (min 16 chars) is required.'
      );
    }

    if (!rawRefreshSecret || rawRefreshSecret.trim().length === 0) {
      throw new JwtConfigurationError(
        'CRITICAL CONFIGURATION ERROR: JWT_REFRESH_SECRET environment variable is required in production mode. Refusing to start with insecure configuration.'
      );
    }
    if (INSECURE_DEFAULT_SECRETS.has(rawRefreshSecret.trim()) || rawRefreshSecret.length < 16) {
      throw new JwtConfigurationError(
        'CRITICAL SECURITY ERROR: Insecure, default, or short JWT_REFRESH_SECRET provided in production mode. A strong secret (min 16 chars) is required.'
      );
    }

    return { jwtSecret: rawSecret, jwtRefreshSecret: rawRefreshSecret };
  }

  // Non-production (development / testing)
  const jwtSecret = rawSecret && rawSecret.trim().length > 0 ? rawSecret : DEV_FALLBACK_SECRET;
  const jwtRefreshSecret = rawRefreshSecret && rawRefreshSecret.trim().length > 0 ? rawRefreshSecret : DEV_FALLBACK_REFRESH_SECRET;

  return { jwtSecret, jwtRefreshSecret };
}

export function getJwtSecret(): string {
  return validateJwtConfig().jwtSecret;
}

export function getJwtRefreshSecret(): string {
  return validateJwtConfig().jwtRefreshSecret;
}

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  officeId?: string | null;
  barangayId?: string | null;
  jti?: string;
  sessionId?: string;
  sessionVersion?: number;
}

// In-memory active refresh sessions tracker
const activeRefreshSessions = new Map<string, { userId: string; jti: string; expiresAt: number }>();

// Periodic cleanup of expired tokens and sessions every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeRefreshSessions.entries()) {
    if (session.expiresAt < now) {
      activeRefreshSessions.delete(key);
    }
  }
  TokenRevocationService.pruneExpired().catch(() => {});
}, 15 * 60 * 1000).unref();

/**
 * Legacy offline demo helper; use revokeTokenAsync for durable revocation.
 */
export const revokeToken = (tokenOrJti: string, ttlMs = 30 * 24 * 60 * 60 * 1000): void => {
  if (!tokenOrJti) return;
  TokenRevocationService.revokeTokenSync(tokenOrJti, ttlMs);
};

/**
 * Revokes a token or JTI durably with asynchronous persistence confirmation.
 */
export const revokeTokenAsync = async (
  tokenOrJti: string,
  options?: { reason?: string; expiresAt?: Date; userId?: string; ttlMs?: number }
): Promise<void> => {
  if (!tokenOrJti) return;
  await TokenRevocationService.revokeToken(tokenOrJti, options);
};

/**
 * Checks whether a token, JTI, session, or user has been revoked.
 */
export const isTokenRevoked = (tokenOrJti: string): boolean => {
  if (!tokenOrJti) return false;
  return TokenRevocationService.isTokenRevoked(tokenOrJti);
};

export const registerRefreshSession = (sessionId: string, userId: string, jti: string, ttlMs = 30 * 24 * 60 * 60 * 1000): void => {
  activeRefreshSessions.set(sessionId, {
    userId,
    jti,
    expiresAt: Date.now() + ttlMs,
  });
};

export const invalidateSession = (sessionId: string): void => {
  if (!sessionId) return;
  const session = activeRefreshSessions.get(sessionId);
  if (session) {
    revokeToken(session.jti);
    activeRefreshSessions.delete(sessionId);
  }
  revokeToken(sessionId);
};

export const revokeAllUserSessions = (userId: string): void => {
  for (const [sessionId, session] of activeRefreshSessions.entries()) {
    if (session.userId === userId) {
      revokeToken(session.jti);
      activeRefreshSessions.delete(sessionId);
    }
  }
  revokeToken(`user_${userId}`);
};

export const signAccessToken = (payload: TokenPayload): string => {
  const jti = payload.jti || randomUUID();
  const sessionId = payload.sessionId || randomUUID();
  return jwt.sign({ ...payload, jti, sessionId, sessionVersion: 2 }, getJwtSecret(), { expiresIn: '8h' });
};

export const signRefreshToken = (payload: TokenPayload): string => {
  const jti = payload.jti || randomUUID();
  const sessionId = payload.sessionId || randomUUID();
  registerRefreshSession(sessionId, payload.id, jti);
  return jwt.sign({ ...payload, jti, sessionId, sessionVersion: 2 }, getJwtRefreshSecret(), { expiresIn: '30d' });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  if (isTokenRevoked(token)) {
    const err: any = new Error('Token has been revoked');
    err.name = 'TokenRevokedError';
    throw err;
  }

  const decoded = jwt.verify(token, getJwtSecret()) as TokenPayload;
  if (decoded.jti && isTokenRevoked(decoded.jti)) {
    const err: any = new Error('Token has been revoked');
    err.name = 'TokenRevokedError';
    throw err;
  }
  if (decoded.sessionId && isTokenRevoked(decoded.sessionId)) {
    const err: any = new Error('Session has been invalidated');
    err.name = 'TokenRevokedError';
    throw err;
  }
  if (decoded.id && isTokenRevoked(`user_${decoded.id}`)) {
    const err: any = new Error('All user sessions have been invalidated');
    err.name = 'TokenRevokedError';
    throw err;
  }

  return decoded;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  if (isTokenRevoked(token)) {
    const err: any = new Error('Refresh token has been revoked');
    err.name = 'TokenRevokedError';
    throw err;
  }

  const decoded = jwt.verify(token, getJwtRefreshSecret()) as TokenPayload;
  // Older token pairs used unrelated session IDs and cannot be logged out together.
  // Require a fresh login rather than perpetuating that incomplete contract.
  if (decoded.sessionVersion !== 2 || !decoded.sessionId) {
    throw new Error('Session upgrade requires a fresh login');
  }
  if (decoded.jti && isTokenRevoked(decoded.jti)) {
    const err: any = new Error('Refresh token has been revoked or already rotated');
    err.name = 'TokenRevokedError';
    throw err;
  }
  if (decoded.sessionId && isTokenRevoked(decoded.sessionId)) {
    const err: any = new Error('Session has been invalidated');
    err.name = 'TokenRevokedError';
    throw err;
  }
  if (decoded.id && isTokenRevoked(`user_${decoded.id}`)) {
    const err: any = new Error('All user sessions have been invalidated');
    err.name = 'TokenRevokedError';
    throw err;
  }

  return decoded;
};

// Verify the signature before consulting the shared revocation store. Never cache
// a negative result: another process can revoke the token between requests.
export async function verifyAccessTokenAsync(token: string): Promise<TokenPayload> {
  const payload = verifyAccessToken(token);
  if (await TokenRevocationService.isTokenRevokedAsync(token)) {
    const error = new Error('Token has been revoked');
    error.name = 'TokenRevokedError';
    throw error;
  }
  return payload;
}

export async function verifyRefreshTokenAsync(token: string): Promise<TokenPayload> {
  const payload = verifyRefreshToken(token);
  if (await TokenRevocationService.isTokenRevokedAsync(token)) {
    const error = new Error('Refresh token has been revoked');
    error.name = 'TokenRevokedError';
    throw error;
  }
  return payload;
}
