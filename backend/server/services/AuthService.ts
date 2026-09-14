import { TokenRevocationService } from './TokenRevocationService';
import { AppError } from '../lib/errors';
import bcrypt from 'bcryptjs';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  revokeToken,
  invalidateSession,
} from '../lib/jwt';
import { UnauthorizedError, NotFoundError } from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { logger } from '../lib/logger';

const DEMO_PASSWORD_ENV_BY_ROLE: Record<string, string> = {
  SUPER_ADMIN: 'DEMO_SUPER_ADMIN_PASSWORD',
  ADMIN: 'DEMO_ADMIN_PASSWORD',
  ENCODER: 'DEMO_ENCODER_PASSWORD',
  VIEWER: 'DEMO_VIEWER_PASSWORD',
};

export function isDemoModeEnabled(): boolean {
  return process.env.DEMO_MODE === 'true';
}

export function validateDemoModeConfig(): void {
  if (!isDemoModeEnabled()) return;

  const missing = Object.values(DEMO_PASSWORD_ENV_BY_ROLE).filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(
      `DEMO_MODE=true requires these environment variables: ${missing.join(', ')}`
    );
  }
}

export function logDemoModeWarning(): void {
  if (isDemoModeEnabled()) {
    logger.error('!!! DEMO_MODE ENABLED: DEMO CREDENTIALS ARE ACTIVE !!!', {
      warning: 'Disable DEMO_MODE in any real deployment.',
    });
  }
}

export const DEMO_USERS: any[] = [
  {
    id: 'usr-superadmin-01',
    email: 'superadmin@talibon.gov.ph',
    fullName: 'TAGAD Super Administrator',
    role: 'SUPER_ADMIN',
    officeId: null,
    office: null,
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-admin-01',
    email: 'admin@talibon.gov.ph',
    fullName: 'System Administrator',
    role: 'ADMIN',
    officeId: 'off-mpdc',
    office: { id: 'off-mpdc', code: 'MPDC', name: 'Municipal Planning and Development Coordinator' },
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-encoder-01',
    email: 'encoder@talibon.gov.ph',
    fullName: 'GAD Encoder (MSWDO)',
    role: 'ENCODER',
    officeId: 'off-mswdo',
    office: { id: 'off-mswdo', code: 'MSWDO', name: 'Municipal Social Welfare and Development Office' },
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-encoder-02',
    email: 'mswdo@talibon.gov.ph',
    fullName: 'MSWDO GAD Encoder',
    role: 'ENCODER',
    officeId: 'off-mswdo',
    office: { id: 'off-mswdo', code: 'MSWDO', name: 'Municipal Social Welfare and Development Office' },
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-encoder-03',
    email: 'encoder.mswdo@talibon.gov.ph',
    fullName: 'MSWDO Secondary Encoder',
    role: 'ENCODER',
    officeId: 'off-mswdo',
    office: { id: 'off-mswdo', code: 'MSWDO', name: 'Municipal Social Welfare and Development Office' },
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-encoder-mpdc',
    email: 'mpdc_encoder@talibon.gov.ph',
    fullName: 'MPDC GAD Encoder',
    role: 'ENCODER',
    officeId: 'off-mpdc',
    office: { id: 'off-mpdc', code: 'MPDC', name: 'Municipal Planning and Development Coordinator' },
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: 'usr-viewer-01',
    email: 'viewer@talibon.gov.ph',
    fullName: 'Municipal Auditor / Viewer',
    role: 'VIEWER',
    officeId: null,
    office: null,
    barangayId: null,
    barangay: null,
    isActive: true,
    createdAt: new Date(),
  },
];

export class AuthService {
  public static getDemoUser(idOrEmail: string) {
    if (!isDemoModeEnabled()) return null;
    if (!idOrEmail) return null;
    const clean = idOrEmail.toLowerCase().trim();
    return DEMO_USERS.find((u) => u.id === idOrEmail || u.email?.toLowerCase().trim() === clean) || null;
  }
  public static async login(email: string, passwordPlain: string, req?: Request) {
    const cleanEmail = email.toLowerCase().trim();

    if (isDatabaseConnected()) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: cleanEmail },
          include: {
            office: { select: { id: true, code: true, name: true } },
            barangay: { select: { id: true, code: true, name: true } },
          },
        });

        if (user) {
          const isMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
          if (!isMatch) {
            throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
          }

          if (!user.isActive) {
            throw new UnauthorizedError('Account has been deactivated. Please contact the administrator.', 'ACCOUNT_INACTIVE');
          }

          const tokenPayload = {
            id: user.id,
            email: user.email,
            role: user.role,
            officeId: user.officeId,
            barangayId: user.barangayId,
          };

          const accessToken = signAccessToken(tokenPayload);
          const refreshToken = signRefreshToken(tokenPayload);

          await AuditService.logAction({
            userId: user.id,
            action: 'USER_LOGIN',
            entityType: 'User',
            entityId: user.id,
            req,
          });

          return {
            token: accessToken,
            accessToken,
            refreshToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.fullName,
              fullName: user.fullName,
              role: user.role,
              officeId: user.officeId,
              office: user.office?.code || user.office?.name || '',
              officeDetails: user.office,
              barangayId: user.barangayId,
              barangayDetails: user.barangay,
            },
          };
        }
      } catch (err: any) {
        if (err instanceof UnauthorizedError) throw err;
      }
    }

    // Fallback demo authentication is opt-in and requires role-specific secrets.
    if (!isDemoModeEnabled()) {
      throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    validateDemoModeConfig();
    const demoUser = this.getDemoUser(cleanEmail);
    if (demoUser) {
      const passwordEnvName = DEMO_PASSWORD_ENV_BY_ROLE[demoUser.role];
      const isDemoPasswordValid = passwordEnvName
        ? passwordPlain === process.env[passwordEnvName]
        : false;

      if (isDemoPasswordValid) {
        const tokenPayload = {
          id: demoUser.id,
          email: demoUser.email,
          role: demoUser.role,
          officeId: demoUser.officeId,
          barangayId: demoUser.barangayId,
        };

        const accessToken = signAccessToken(tokenPayload);
        const refreshToken = signRefreshToken(tokenPayload);

        return {
          token: accessToken,
          accessToken,
          refreshToken,
          user: {
            id: demoUser.id,
            email: demoUser.email,
            name: demoUser.fullName,
            fullName: demoUser.fullName,
            role: demoUser.role,
            officeId: demoUser.officeId,
            office: demoUser.office?.code || demoUser.office?.name || '',
            officeDetails: demoUser.office,
            barangayId: demoUser.barangayId,
            barangayDetails: demoUser.barangay,
          },
        };
      }
    }

    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  public static async refreshToken(token: string) {
    if (process.env.NODE_ENV === 'production') {
      await TokenRevocationService.hydrateFromDatabase();
      if (!TokenRevocationService.isReady()) throw new AppError('Authentication temporarily unavailable', 503, 'AUTH_NOT_READY');
    }
    try {
      const decoded = verifyRefreshToken(token);

      // Invalidate the old refresh token immediately (rotation & single-use guarantee)
      if (decoded.jti) {
        revokeToken(decoded.jti);
      }
      revokeToken(token);

      let user: any = null;

      if (isDatabaseConnected()) {
        try {
          user = await prisma.user.findUnique({
            where: { id: decoded.id },
          });
        } catch {
          user = this.getDemoUser(decoded.id);
        }
      }

      if (!user) {
        user = this.getDemoUser(decoded.id);
      }

      if (!user || !user.isActive) {
        throw new UnauthorizedError('User account not found or inactive', 'INVALID_REFRESH_TOKEN');
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        officeId: user.officeId,
        barangayId: user.barangayId,
      };

      const newAccessToken = signAccessToken(tokenPayload);
      const newRefreshToken = signRefreshToken(tokenPayload);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid, expired, or already rotated refresh token', 'INVALID_REFRESH_TOKEN');
    }
  }

  public static async getMe(userId: string) {
    if (isDatabaseConnected()) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            office: true,
            barangay: true,
          },
        });

        if (user) {
          return {
            id: user.id,
            email: user.email,
            name: user.fullName,
            fullName: user.fullName,
            role: user.role,
            officeId: user.officeId,
            office: user.office?.code || user.office?.name || '',
            officeDetails: user.office,
            barangayId: user.barangayId,
            barangayDetails: user.barangay,
            isActive: user.isActive,
            createdAt: user.createdAt,
          };
        }
      } catch {
        // Fallback to demo user below
      }
    }

    const demo = this.getDemoUser(userId);
    if (demo) {
      return {
        id: demo.id,
        email: demo.email,
        name: demo.fullName,
        fullName: demo.fullName,
        role: demo.role,
        officeId: demo.officeId,
        office: demo.office?.code || demo.office?.name || '',
        officeDetails: demo.office,
        barangayId: demo.barangayId,
        barangayDetails: demo.barangay,
        isActive: demo.isActive,
        createdAt: demo.createdAt,
      };
    }

    throw new NotFoundError('User profile');
  }

  public static async logout(userId?: string, req?: Request, tokenToRevoke?: string) {
    // Invalidate request access token if present
    const authHeader = req?.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      revokeToken(token);
    }

    if (tokenToRevoke) {
      revokeToken(tokenToRevoke);
    }

    // Invalidate body refresh token if supplied
    if (req?.body?.refreshToken) {
      revokeToken(req.body.refreshToken);
    }

    if (userId) {
      await AuditService.logAction({
        userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        req,
      });
    }
    return { message: 'Logged out successfully' };
  }
}
