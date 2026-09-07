import prisma, { isDatabaseConnected } from '../lib/prisma';
import { Request } from 'express';

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeState?: any;
  afterState?: any;
  req?: Request;
}

const MEMORY_AUDIT_LOGS: any[] = [];

export class AuditService {
  public static async logActionTx(tx: any, params: AuditLogParams) {
    const ipAddress = params.req?.headers
      ? (params.req.headers['x-forwarded-for'] as string) || params.req.socket?.remoteAddress || null
      : null;

    const userAgent = params.req?.headers ? (params.req.headers['user-agent'] as string) || null : null;

    if (!isDatabaseConnected() || !tx) {
      MEMORY_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        beforeState: params.beforeState ? JSON.parse(JSON.stringify(params.beforeState)) : null,
        afterState: params.afterState ? JSON.parse(JSON.stringify(params.afterState)) : null,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        createdAt: new Date(),
      });
      return;
    }

    try {
      await tx.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          beforeState: params.beforeState ? JSON.parse(JSON.stringify(params.beforeState)) : null,
          afterState: params.afterState ? JSON.parse(JSON.stringify(params.afterState)) : null,
          ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
          userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        },
      });
    } catch (error) {
      // In transaction context, we log warning so callers know if audit log failed
      console.warn('AuditService.logActionTx error:', error);
    }
  }

  public static async logAction(params: AuditLogParams) {
    const ipAddress = params.req?.headers
      ? (params.req.headers['x-forwarded-for'] as string) || params.req.socket?.remoteAddress || null
      : null;

    const userAgent = params.req?.headers ? (params.req.headers['user-agent'] as string) || null : null;

    if (!isDatabaseConnected()) {
      MEMORY_AUDIT_LOGS.unshift({
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        beforeState: params.beforeState ? JSON.parse(JSON.stringify(params.beforeState)) : null,
        afterState: params.afterState ? JSON.parse(JSON.stringify(params.afterState)) : null,
        ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        createdAt: new Date(),
      });
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          userId: params.userId || null,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId || null,
          beforeState: params.beforeState ? JSON.parse(JSON.stringify(params.beforeState)) : null,
          afterState: params.afterState ? JSON.parse(JSON.stringify(params.afterState)) : null,
          ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
          userAgent: userAgent ? String(userAgent).slice(0, 255) : null,
        },
      });
    } catch {
      // Non-blocking error logging for audit logs so main business transaction does not abort
    }
  }

  public static async getLogs(params: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    entityType?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;

    if (!isDatabaseConnected()) {
      let filtered = [...MEMORY_AUDIT_LOGS];
      if (params.userId) filtered = filtered.filter((l) => l.userId === params.userId);
      if (params.action) filtered = filtered.filter((l) => l.action.toLowerCase().includes(params.action!.toLowerCase()));
      if (params.entityType) filtered = filtered.filter((l) => l.entityType === params.entityType);

      const total = filtered.length;
      const logs = filtered.slice((page - 1) * limit, page * limit);
      return {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    const where: any = {};
    if (params.userId) where.userId = params.userId;
    if (params.action) where.action = { contains: params.action, mode: 'insensitive' };
    if (params.entityType) where.entityType = params.entityType;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
