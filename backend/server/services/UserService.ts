import bcrypt from 'bcryptjs';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { Role } from '@prisma/client';
import { NotFoundError, ConflictError, AppError } from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { DEMO_USERS } from './AuthService';

const DEMO_USERS_LIST = DEMO_USERS;

export class UserService {
  public static async getUsers(params?: { search?: string; role?: string; officeId?: string }, options: { strict?: boolean } = {}) {
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Account source unavailable', 503, 'DATA_UNAVAILABLE');
      let users = DEMO_USERS_LIST;
      if (params?.role) {
        users = users.filter((u) => u.role === params.role);
      }
      if (params?.officeId) {
        users = users.filter((u) => u.officeId === params.officeId);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        users = users.filter((u) => u.fullName.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
      }
      return users.map((u) => ({
        ...u,
        name: u.fullName,
        office: u.office?.code || u.office?.name || '',
      }));
    }

    try {
      const where: any = {};
      if (params?.search) {
        where.OR = [
          { fullName: { contains: params.search, mode: 'insensitive' } },
          { email: { contains: params.search, mode: 'insensitive' } },
        ];
      }
      if (params?.role) {
        where.role = params.role as Role;
      }
      if (params?.officeId) {
        where.officeId = params.officeId;
      }

      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          officeId: true,
          barangayId: true,
          isActive: true,
          createdAt: true,
          office: { select: { id: true, code: true, name: true } },
          barangay: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return users.map((u) => ({
        ...u,
        name: u.fullName,
        office: u.office?.code || u.office?.name || '',
      }));
    } catch {
      if (options.strict) throw new AppError('Account source unavailable', 503, 'DATA_UNAVAILABLE');
      return DEMO_USERS_LIST.map((u) => ({
        ...u,
        name: u.fullName,
        office: u.office?.code || u.office?.name || '',
      }));
    }
  }

  public static async getUserById(id: string, options: { strict?: boolean } = {}) {
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Account source unavailable', 503, 'DATA_UNAVAILABLE');
      const user = DEMO_USERS_LIST.find((u) => u.id === id || u.email === id);
      if (user) {
        return {
          ...user,
          name: user.fullName,
          office: user.office?.code || user.office?.name || '',
        };
      }
      throw new NotFoundError('User');
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          office: true,
          barangay: true,
        },
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      const { passwordHash: _, ...safeUser } = user;
      return {
        ...safeUser,
        name: user.fullName,
        office: user.office?.code || user.office?.name || '',
      };
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      if (options.strict) throw new AppError('Account source unavailable', 503, 'DATA_UNAVAILABLE');
      const user = DEMO_USERS_LIST.find((u) => u.id === id || u.email === id);
      if (user) {
        return {
          ...user,
          name: user.fullName,
          office: user.office?.code || user.office?.name || '',
        };
      }
      throw new NotFoundError('User');
    }
  }

  public static async createUser(data: any, actorUserId?: string, req?: Request) {
    if (!isDatabaseConnected()) {
      const newUser = {
        id: `usr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        email: data.email.toLowerCase().trim(),
        fullName: data.fullName || data.name || 'System User',
        role: data.role || 'ENCODER',
        officeId: data.officeId || 'off-mswdo',
        barangayId: data.barangayId || null,
        isActive: true,
        createdAt: new Date(),
        office: { id: 'off-mswdo', code: 'MSWDO', name: 'Municipal Social Welfare and Development Office' },
        barangay: null,
      };
      DEMO_USERS_LIST.unshift(newUser);
      await AuditService.logActionTx(null, {
        userId: actorUserId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: newUser.id,
        afterState: newUser,
        req,
      });
      return {
        ...newUser,
        name: newUser.fullName,
        office: newUser.office?.code || newUser.office?.name || '',
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    // Resolve office ID if passed as string code/name
    let resolvedOfficeId = data.officeId;
    if (data.office && !resolvedOfficeId) {
      const found = await prisma.office.findFirst({
        where: { OR: [{ code: data.office }, { name: data.office }] },
      });
      if (found) resolvedOfficeId = found.id;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          passwordHash: hashedPassword,
          fullName: data.fullName || data.name || 'System User',
          role: (data.role as Role) || Role.ENCODER,
          officeId: resolvedOfficeId || null,
          barangayId: data.barangayId || null,
          isActive: true,
        },
        include: {
          office: true,
          barangay: true,
        },
      });

      const { passwordHash: _, ...safeUser } = created;

      await AuditService.logActionTx(tx, {
        userId: actorUserId,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: created.id,
        afterState: safeUser,
        req,
      });

      return created;
    });

    const { passwordHash: _, ...safeUser } = user;

    return {
      ...safeUser,
      name: user.fullName,
      office: user.office?.code || user.office?.name || '',
    };
  }

  public static async updateUser(id: string, data: any, actorUserId?: string, req?: Request) {
    if (!isDatabaseConnected()) {
      const idx = DEMO_USERS_LIST.findIndex((u) => u.id === id || u.email === id);
      if (idx === -1) throw new NotFoundError('User');
      DEMO_USERS_LIST[idx] = { ...DEMO_USERS_LIST[idx], ...data };
      await AuditService.logActionTx(null, {
        userId: actorUserId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: id,
        req,
      });
      return {
        ...DEMO_USERS_LIST[idx],
        name: DEMO_USERS_LIST[idx].fullName,
        office: DEMO_USERS_LIST[idx].office?.code || '',
      };
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    const updateData: any = {};
    if (data.fullName || data.name) updateData.fullName = data.fullName || data.name;
    if (data.email) updateData.email = data.email.toLowerCase().trim();
    if (data.role) updateData.role = data.role as Role;
    if (data.officeId !== undefined) updateData.officeId = data.officeId || null;
    if (data.barangayId !== undefined) updateData.barangayId = data.barangayId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    const { safeUpdated } = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: updateData,
        include: { office: true, barangay: true },
      });

      const { passwordHash: _, ...safeUp } = updated;
      const { passwordHash: __, ...safeExisting } = existing;

      await AuditService.logActionTx(tx, {
        userId: actorUserId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: updated.id,
        beforeState: safeExisting,
        afterState: safeUp,
        req,
      });

      return { safeUpdated: safeUp, fullUpdated: updated };
    });

    return {
      ...safeUpdated,
      name: safeUpdated.fullName,
      office: safeUpdated.office?.code || safeUpdated.office?.name || '',
    };
  }

  public static async deactivateUser(id: string, actorUserId?: string, req?: Request) {
    if (!isDatabaseConnected()) {
      const idx = DEMO_USERS_LIST.findIndex((u) => u.id === id || u.email === id);
      if (idx === -1) throw new NotFoundError('User');
      DEMO_USERS_LIST[idx].isActive = false;
      await AuditService.logActionTx(null, {
        userId: actorUserId,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: id,
        req,
      });
      return { message: 'User account deactivated successfully' };
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('User');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { isActive: false },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUserId,
        action: 'USER_DEACTIVATED',
        entityType: 'User',
        entityId: id,
        beforeState: { isActive: true },
        afterState: { isActive: false },
        req,
      });
    });

    return { message: 'User account deactivated successfully' };
  }
}
