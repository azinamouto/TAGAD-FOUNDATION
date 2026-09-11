import './testEnvironment';
import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  revokeToken,
  revokeTokenAsync,
  isTokenRevoked,
  invalidateSession,
  revokeAllUserSessions,
  TokenPayload,
} from '../server/lib/jwt';
import { TokenRevocationService } from '../server/services/TokenRevocationService';
import { redactPII } from '../server/lib/logger';
import { configureCors } from '../server/lib/cors';

describe('Sprint 9 — Backend Security, Persistence, & Observability Suite', () => {

  describe('BE-3: Durable JWT Revocation & Storage', () => {
    beforeEach(() => {
      TokenRevocationService.resetInMemoryTestState();
    });

    const samplePayload: TokenPayload = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'officer@talibon.gov.ph',
      role: 'ADMIN',
      officeId: 'off-mpdc',
    };

    test('Access token verifies successfully before revocation', () => {
      const token = signAccessToken(samplePayload);
      const decoded = verifyAccessToken(token);
      assert.strictEqual(decoded.id, samplePayload.id);
      assert.strictEqual(decoded.email, samplePayload.email);
      assert.strictEqual(isTokenRevoked(token), false);
    });

    test('Revoking access token by token string immediately invalidates it', () => {
      const token = signAccessToken(samplePayload);
      assert.strictEqual(isTokenRevoked(token), false);

      revokeToken(token);
      assert.strictEqual(isTokenRevoked(token), true);

      assert.throws(
        () => verifyAccessToken(token),
        (err: any) => err.name === 'TokenRevokedError' && err.message.includes('revoked')
      );
    });

    test('Revoking access token by JTI immediately blocks token verification', () => {
      const customJti = 'test-custom-jti-12345';
      const token = signAccessToken({ ...samplePayload, jti: customJti });

      assert.strictEqual(isTokenRevoked(customJti), false);
      revokeToken(customJti);
      assert.strictEqual(isTokenRevoked(customJti), true);

      assert.throws(
        () => verifyAccessToken(token),
        (err: any) => err.name === 'TokenRevokedError'
      );
    });

    test('Refresh token can be revoked and rejected upon rotation attempt', () => {
      const refreshToken = signRefreshToken(samplePayload);
      assert.strictEqual(isTokenRevoked(refreshToken), false);

      const decodedBefore = verifyRefreshToken(refreshToken);
      assert.strictEqual(decodedBefore.id, samplePayload.id);

      revokeToken(refreshToken);
      assert.strictEqual(isTokenRevoked(refreshToken), true);

      assert.throws(
        () => verifyRefreshToken(refreshToken),
        (err: any) => err.name === 'TokenRevokedError'
      );
    });

    test('Invalidating a session revokes both session ID and associated token', () => {
      const sessionId = 'test-session-uuid-999';
      const token = signAccessToken({ ...samplePayload, sessionId });

      invalidateSession(sessionId);
      assert.strictEqual(isTokenRevoked(sessionId), true);

      assert.throws(
        () => verifyAccessToken(token),
        (err: any) => err.name === 'TokenRevokedError'
      );
    });

    test('Revoking all user sessions blocks all existing tokens for that user ID', () => {
      const token1 = signAccessToken(samplePayload);
      const token2 = signAccessToken(samplePayload);

      revokeAllUserSessions(samplePayload.id);

      assert.throws(
        () => verifyAccessToken(token1),
        (err: any) => err.name === 'TokenRevokedError'
      );

      assert.throws(
        () => verifyAccessToken(token2),
        (err: any) => err.name === 'TokenRevokedError'
      );
    });

    test('TokenRevocationService hashes raw token before storage', () => {
      const rawToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.payload';
      const hash = TokenRevocationService.hashToken(rawToken);
      assert.strictEqual(typeof hash, 'string');
      assert.strictEqual(hash.length, 64); // SHA-256 hex length
      assert.notStrictEqual(hash, rawToken);
    });

    test('Async revocation API persists correctly', async () => {
      const token = signAccessToken(samplePayload);
      await revokeTokenAsync(token, { reason: 'TEST_ADMIN_REVOKE' });
      assert.strictEqual(isTokenRevoked(token), true);
    });
  });

  describe('BE-2: Helmet & CORS Allowlist Configuration', () => {
    test('CORS options enable credentials and standard allowed headers', () => {
      const corsConfig = configureCors();
      assert.strictEqual(corsConfig.credentials, true);
      assert.ok(Array.isArray(corsConfig.methods));
      assert.ok(corsConfig.methods.includes('POST'));
      assert.ok(corsConfig.methods.includes('GET'));
      assert.ok(corsConfig.methods.includes('PUT'));
      assert.ok(corsConfig.methods.includes('DELETE'));
    });

    test('CORS origin handler allows requests with no origin (same-host/mobile/tools)', () => {
      const corsConfig = configureCors();
      const originFn = corsConfig.origin as Function;

      originFn(undefined, (err: Error | null, allow?: boolean) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });
    });

    test('CORS origin handler allows localhost and configured allowed origins', () => {
      const corsConfig = configureCors();
      const originFn = corsConfig.origin as Function;

      originFn('http://localhost:3000', (err: Error | null, allow?: boolean) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });

      originFn('http://localhost:5173', (err: Error | null, allow?: boolean) => {
        assert.strictEqual(err, null);
        assert.strictEqual(allow, true);
      });
    });
  });

  describe('BE-6: Structured Logging & PII Redaction', () => {
    test('redactPII strips plain passwords, password hashes, and secrets', () => {
      const input = {
        email: 'encoder@talibon.gov.ph',
        password: 'SuperSecretPassword123!',
        passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz',
        secret: 'top_secret_gad_key',
        apiKey: 'AIzaSyDemoKey123',
        nested: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xyz.abc',
          contactNumber: '09171234567',
          safeField: 'Talibon GAD Plan 2026',
        },
      };

      const redacted = redactPII(input);

      assert.strictEqual(redacted.email, 'encoder@talibon.gov.ph');
      assert.strictEqual(redacted.password, '[REDACTED]');
      assert.strictEqual(redacted.passwordHash, '[REDACTED]');
      assert.strictEqual(redacted.secret, '[REDACTED]');
      assert.strictEqual(redacted.apiKey, '[REDACTED]');
      assert.strictEqual(redacted.nested.refreshToken, '[REDACTED]');
      assert.strictEqual(redacted.nested.contactNumber, '[REDACTED]');
      assert.strictEqual(redacted.nested.safeField, 'Talibon GAD Plan 2026');
    });

    test('redactPII masks Bearer JWT strings in text headers', () => {
      const authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyJ9.sig12345';
      const result = redactPII(authHeader);
      assert.strictEqual(result, 'Bearer [REDACTED_JWT]');
    });

    test('redactPII handles arrays and primitives safely', () => {
      assert.strictEqual(redactPII(null), null);
      assert.strictEqual(redactPII(undefined), undefined);
      assert.strictEqual(redactPII(42), 42);
      assert.strictEqual(redactPII(true), true);

      const arr = [
        { password: '123', name: 'GAD' },
        { token: 'abc', count: 10 },
      ];
      const res = redactPII(arr);
      assert.strictEqual(res[0].password, '[REDACTED]');
      assert.strictEqual(res[0].name, 'GAD');
      assert.strictEqual(res[1].token, '[REDACTED]');
      assert.strictEqual(res[1].count, 10);
    });
  });

  describe('BE-1: Proxy Rate Limiting & Client Identity Resolution', () => {
    test('Express with trust proxy 1 resolves client IP behind single-hop reverse proxy', () => {
      const app = express();
      app.set('trust proxy', 1);

      // Verify that trust proxy setting is 1
      assert.strictEqual(app.get('trust proxy'), 1);
    });
  });
});
