import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

export interface RevocationMetadata {
  jti?: string;
  userId?: string;
  reason?: string;
  expiresAt?: Date;
  ttlMs?: number;
}

// In-memory cache for ultra-fast O(1) synchronous revocation verification
// Key -> expiry timestamp (ms)
const inMemoryRevokedTokens = new Map<string, number>();

export class TokenRevocationService {
  private static isHydrated = false;
  private static hydrationPromise: Promise<void> | null = null;

  /**
   * Generates a deterministic SHA-256 hash of a token to avoid storing raw JWTs.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token.trim()).digest('hex');
  }

  /**
   * Extracts metadata from a JWT if parseable.
   */
  public static extractTokenMetadata(tokenOrJti: string): { jti?: string; userId?: string; exp?: number } {
    try {
      const decoded = jwt.decode(tokenOrJti) as any;
      if (decoded && typeof decoded === 'object') {
        return {
          jti: decoded.jti,
          userId: decoded.id || decoded.userId,
          exp: decoded.exp,
        };
      }
    } catch {
      // Not a standard JWT string, treated as direct jti / id
    }
    return {};
  }

  /**
   * Hydrates the in-memory revocation cache with active records from PostgreSQL.
   */
  private static retryTimer: ReturnType<typeof setTimeout> | null = null;
  private static retryDelayMs = 1000;

  public static isReady(): boolean { return this.isHydrated; }

  // Offline demo sessions are explicitly non-durable and never allowed in production.
  private static allowOfflineDemo(): boolean {
    return process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true' && !isDatabaseConnected();
  }

  private static unavailable(): AppError {
    return new AppError('Authentication temporarily unavailable', 503, 'REVOCATION_STORE_UNAVAILABLE');
  }

  private static scheduleHydrationRetry(): void {
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.hydrateFromDatabase();
    }, this.retryDelayMs);
    this.retryTimer.unref();
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, 30000);
  }

  public static async hydrateFromDatabase(): Promise<void> {
    if (this.isHydrated) return;
    if (this.hydrationPromise) return this.hydrationPromise;
    if (!isDatabaseConnected()) {
      this.scheduleHydrationRetry();
      return;
    }
    this.hydrationPromise = (async () => {
      try {
        const activeRevocations = await prisma.revokedToken.findMany({
          where: { expiresAt: { gt: new Date() } },
          select: { jti: true, tokenHash: true, expiresAt: true },
        });
        for (const rev of activeRevocations) {
          const expiresAt = rev.expiresAt.getTime();
          if (rev.jti) inMemoryRevokedTokens.set(rev.jti, expiresAt);
          if (rev.tokenHash) inMemoryRevokedTokens.set(rev.tokenHash, expiresAt);
        }
        this.isHydrated = true;
        this.retryDelayMs = 1000;
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = null;
        logger.info('REVOCATION_STORE_HYDRATED', { count: activeRevocations.length });
      } catch {
        logger.warn('REVOCATION_HYDRATION_FAILED');
        this.scheduleHydrationRetry();
      }
    })();
    try { await this.hydrationPromise; }
    finally { this.hydrationPromise = null; }
  }

  /**
   * Revokes a token durably (persisting to DB and cache).
   */
  public static async revokeToken(
    tokenOrJti: string,
    metadata?: RevocationMetadata,
    singleUse = false
  ): Promise<void> {
    if (!tokenOrJti || typeof tokenOrJti !== 'string') return;

    const trimmed = tokenOrJti.trim();
    const tokenHash = this.hashToken(trimmed);
    const meta = this.extractTokenMetadata(trimmed);

    const jti = metadata?.jti || meta.jti || (trimmed.length <= 100 && !trimmed.includes('.') ? trimmed : undefined);
    const userId = metadata?.userId || meta.userId;
    const defaultTtlMs = metadata?.ttlMs || 30 * 24 * 60 * 60 * 1000; // 30 days default
    
    let expiresAt: Date;
    if (metadata?.expiresAt) {
      expiresAt = metadata.expiresAt;
    } else if (meta.exp) {
      expiresAt = new Date(meta.exp * 1000);
    } else {
      expiresAt = new Date(Date.now() + defaultTtlMs);
    }

    const expMs = expiresAt.getTime();

    // A successful response must mean the shared store committed the revocation.
    if (isDatabaseConnected()) {
      try {
        const record = {
            jti: jti || null,
            tokenHash,
            userId: userId || null,
            reason: metadata?.reason || 'REVOCATION_REQUESTED',
            expiresAt,
        };
        if (singleUse) {
          // Unique JTI/hash makes refresh consumption atomic across processes.
          await prisma.revokedToken.create({ data: record });
        } else await prisma.revokedToken.upsert({
          where: jti ? { jti } : { tokenHash },
          create: record,
          update: {
            expiresAt,
            reason: metadata?.reason || 'REVOCATION_UPDATED',
          },
        });
      } catch (err: any) {
        if (singleUse && err?.code === 'P2002') {
          const revoked = new Error('Refresh token already consumed');
          revoked.name = 'TokenRevokedError';
          throw revoked;
        }
        logger.warn('REVOCATION_DB_WRITE_FAILED');
        throw this.unavailable();
      }
    } else if (!this.allowOfflineDemo()) {
      throw this.unavailable();
    } else if (singleUse && this.isTokenRevoked(trimmed)) {
      const revoked = new Error('Refresh token already consumed');
      revoked.name = 'TokenRevokedError';
      throw revoked;
    }
    inMemoryRevokedTokens.set(tokenHash, expMs);
    if (jti) inMemoryRevokedTokens.set(jti, expMs);
  }

  /**
   * Legacy offline test/demo helper. Runtime endpoints must await revokeToken.
   */
  public static revokeTokenSync(tokenOrJti: string, ttlMs = 30 * 24 * 60 * 60 * 1000): void {
    if (!tokenOrJti || typeof tokenOrJti !== 'string') return;
    if (!this.allowOfflineDemo()) throw this.unavailable();
    const trimmed = tokenOrJti.trim();
    const expMs = Date.now() + ttlMs;

    inMemoryRevokedTokens.set(trimmed, expMs);
    inMemoryRevokedTokens.set(this.hashToken(trimmed), expMs);

    const meta = this.extractTokenMetadata(trimmed);
    if (meta.jti) inMemoryRevokedTokens.set(meta.jti, expMs);
  }

  /**
   * Synchronously checks whether a token or JTI is revoked.
   */
  public static isTokenRevoked(tokenOrJti: string): boolean {
    if (!tokenOrJti || typeof tokenOrJti !== 'string') return false;

    const trimmed = tokenOrJti.trim();
    const now = Date.now();

    // Check direct key
    const exp = inMemoryRevokedTokens.get(trimmed);
    if (exp) {
      if (exp > now) return true;
      inMemoryRevokedTokens.delete(trimmed);
    }

    // Check hash key
    const hash = this.hashToken(trimmed);
    const hashExp = inMemoryRevokedTokens.get(hash);
    if (hashExp) {
      if (hashExp > now) return true;
      inMemoryRevokedTokens.delete(hash);
    }

    // Check embedded JTI if it's a JWT
    const meta = this.extractTokenMetadata(trimmed);
    if (meta.jti) {
      const jtiExp = inMemoryRevokedTokens.get(meta.jti);
      if (jtiExp) {
        if (jtiExp > now) return true;
        inMemoryRevokedTokens.delete(meta.jti);
      }
    }

    // Check user-wide revocation if userId is present in payload
    if (meta.userId) {
      const userRevExp = inMemoryRevokedTokens.get(`user_${meta.userId}`);
      if (userRevExp) {
        if (userRevExp > now) return true;
        inMemoryRevokedTokens.delete(`user_${meta.userId}`);
      }
    }

    return false;
  }

  /**
   * Asynchronously checks whether a token is revoked (checking memory first, then DB).
   */
  public static async isTokenRevokedAsync(tokenOrJti: string): Promise<boolean> {
    if (this.isTokenRevoked(tokenOrJti)) return true;

    if (!isDatabaseConnected()) {
      if (this.allowOfflineDemo()) return false;
      throw this.unavailable();
    }

    const trimmed = tokenOrJti.trim();
    const tokenHash = this.hashToken(trimmed);
    const meta = this.extractTokenMetadata(trimmed);

    try {
      const now = new Date();
      const whereOr: any[] = [{ tokenHash }];
      if (meta.jti) whereOr.push({ jti: meta.jti });
      if (meta.userId) whereOr.push({ jti: `user_${meta.userId}` });
      const sessionId = (jwt.decode(trimmed) as any)?.sessionId;
      if (sessionId) whereOr.push({ jti: sessionId });
      if (trimmed.length <= 100 && !trimmed.includes('.')) whereOr.push({ jti: trimmed });

      const found = await prisma.revokedToken.findFirst({
        where: {
          OR: whereOr,
          expiresAt: { gt: now },
        },
      });

      if (found) {
        // Cache for subsequent sync lookups
        const expMs = found.expiresAt.getTime();
        inMemoryRevokedTokens.set(trimmed, expMs);
        inMemoryRevokedTokens.set(tokenHash, expMs);
        if (found.jti) inMemoryRevokedTokens.set(found.jti, expMs);
        return true;
      }
    } catch {
      logger.warn('REVOCATION_DB_READ_FAILED');
      throw this.unavailable();
    }

    return false;
  }

  /**
   * Prunes expired revoked token records from database and in-memory cache.
   */
  public static async pruneExpired(): Promise<number> {
    const now = Date.now();
    for (const [key, exp] of inMemoryRevokedTokens.entries()) {
      if (exp <= now) {
        inMemoryRevokedTokens.delete(key);
      }
    }

    if (isDatabaseConnected()) {
      try {
        const result = await prisma.revokedToken.deleteMany({
          where: {
            expiresAt: { lt: new Date() },
          },
        });
        return result.count;
      } catch (err: any) {
        logger.warn('REVOCATION_PRUNE_ERROR', { message: err.message });
      }
    }

    return 0;
  }

  /**
   * Testing hook: Resets in-memory state.
   */
  public static resetInMemoryTestState(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.retryDelayMs = 1000;
    inMemoryRevokedTokens.clear();
    this.isHydrated = false;
    this.hydrationPromise = null;
  }

  /**
   * Returns total number of active in-memory entries (for monitoring/testing).
   */
  public static getInMemoryCount(): number {
    return inMemoryRevokedTokens.size;
  }
}
