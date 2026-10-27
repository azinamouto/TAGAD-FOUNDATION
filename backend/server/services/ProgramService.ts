import { requireReadScope, ReadActor } from '../lib/readScope';
import prisma, { isDatabaseConnected } from '../lib/prisma';
import { ProgramStatus, Role } from '@prisma/client';
import { AppError, NotFoundError, OfficeScopeError } from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import { FALLBACK_PROGRAMS } from '../lib/fallbackStore';

export const MEMORY_PROGRAMS: any[] = [...FALLBACK_PROGRAMS];

export class ProgramService {
  public static async getPrograms(
    params: {
      year?: number;
      officeId?: string;
      office?: string;
      sector?: string;
      status?: string;
      search?: string;
    },
    actorUser?: { id: string; role: Role; officeId: string | null },
    options: { strict?: boolean } = {}
  ) {
    if (options.strict) requireReadScope(actorUser);
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Program source unavailable', 503, 'DATA_UNAVAILABLE');
      let filtered = [...MEMORY_PROGRAMS];
      if (params.year) filtered = filtered.filter((p) => p.fiscalYear === Number(params.year));
      if (params.officeId) filtered = filtered.filter((p) => p.officeId === params.officeId);
      if (params.sector) filtered = filtered.filter((p) => p.sector === params.sector);
      if (params.status) filtered = filtered.filter((p) => p.status === params.status);
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((p) => (p.title && p.title.toLowerCase().includes(s)) || (p.description && p.description.toLowerCase().includes(s)));
      }
      if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
        filtered = filtered.filter((p) => p.officeId === actorUser.officeId);
      }
      return filtered;
    }

    const where: any = {};

    if (params.year) {
      where.fiscalYear = Number(params.year);
    }

    if (params.officeId) {
      where.officeId = params.officeId;
    } else if (params.office) {
      where.office = {
        OR: [{ code: params.office }, { name: params.office }, { id: params.office }],
      };
    }

    if (params.sector) {
      where.sector = params.sector;
    }

    if (params.status) {
      where.status = params.status as ProgramStatus;
    }

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Role-based scoping: ENCODER sees only own office programs when filtering admin view
    if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
      where.officeId = actorUser.officeId;
    }

    try {
      const programs = await prisma.program.findMany({
        where,
        include: {
          office: { select: { id: true, code: true, name: true } },
          createdBy: { select: { id: true, fullName: true } },
          accomplishments: {
            include: { attachments: true },
          },
        },
        orderBy: [{ fiscalYear: 'desc' }, { createdAt: 'desc' }],
      });

      return programs.map((p) => ({
        ...p,
        budget: Number(p.budgetTarget),
        budgetTarget: Number(p.budgetTarget),
        budgetActual: Number(p.budgetActual),
        year: p.fiscalYear,
        office: p.office?.code || p.office?.name || '',
        officeName: p.office?.name || '',
        createdByName: p.createdBy?.fullName || 'System',
      }));
    } catch {
      if (options.strict) throw new AppError('Program source unavailable', 503, 'DATA_UNAVAILABLE');
      let filtered = [...MEMORY_PROGRAMS];
      if (params.year) filtered = filtered.filter((p) => p.fiscalYear === Number(params.year));
      if (params.officeId) filtered = filtered.filter((p) => p.officeId === params.officeId);
      if (params.status) filtered = filtered.filter((p) => p.status === params.status);
      if (actorUser && actorUser.role === Role.ENCODER && actorUser.officeId) {
        filtered = filtered.filter((p) => p.officeId === actorUser.officeId);
      }
      return filtered;
    }
  }

  public static async getProgramById(id: string, actorUser?: ReadActor, options: { strict?: boolean } = {}) {
    const officeScope = options.strict ? requireReadScope(actorUser) : null;
    if (!isDatabaseConnected()) {
      if (options.strict) throw new AppError('Program source unavailable', 503, 'DATA_UNAVAILABLE');
      const prog = MEMORY_PROGRAMS.find((p) => p.id === id);
      if (!prog) throw new NotFoundError('Program');
      return prog;
    }

    try {
      const program = await prisma.program.findUnique({
        where: { id },
        include: {
          office: true,
          createdBy: { select: { id: true, fullName: true, email: true } },
          gadPlanItems: true,
          accomplishments: {
            include: { attachments: true },
          },
        },
      });

      if (!program || (officeScope && program.officeId !== officeScope)) {
        throw new NotFoundError('Program');
      }

      return {
        ...program,
        budget: Number(program.budgetTarget),
        budgetTarget: Number(program.budgetTarget),
        budgetActual: Number(program.budgetActual),
        year: program.fiscalYear,
        office: program.office?.code || program.office?.name || '',
      };
    } catch (err: any) {
      if (err instanceof NotFoundError) throw err;
      if (options.strict) throw new AppError('Program source unavailable', 503, 'DATA_UNAVAILABLE');
      const prog = MEMORY_PROGRAMS.find((p) => p.id === id);
      if (!prog) throw new NotFoundError('Program');
      return prog;
    }
  }

  public static async createProgram(
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    let effectiveOfficeId = data.officeId;

    if (actorUser.role === Role.ENCODER) {
      effectiveOfficeId = actorUser.officeId;
    }

    if (!isDatabaseConnected()) {
      const created = {
        id: `prog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: data.title.trim(),
        description: data.description || null,
        sector: data.sector || 'General',
        fiscalYear: parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10),
        officeId: effectiveOfficeId || 'off-mswdo',
        office: effectiveOfficeId || 'MSWDO',
        officeName: 'Municipal Office',
        budgetTarget: parseFloat(String(data.budgetTarget || data.budget || '0')),
        budgetActual: parseFloat(String(data.budgetActual || '0')),
        budget: parseFloat(String(data.budgetTarget || data.budget || '0')),
        status: (data.status as ProgramStatus) || ProgramStatus.ACTIVE,
        targetMale: parseInt(String(data.targetMale || '0'), 10),
        targetFemale: parseInt(String(data.targetFemale || '0'), 10),
        actualMale: parseInt(String(data.actualMale || '0'), 10),
        actualFemale: parseInt(String(data.actualFemale || '0'), 10),
        createdById: actorUser.id,
        createdAt: new Date(),
      };
      MEMORY_PROGRAMS.unshift(created);
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'PROGRAM_CREATED',
        entityType: 'Program',
        entityId: created.id,
        afterState: { id: created.id, title: created.title },
        req,
      });
      return created;
    }

    if (!effectiveOfficeId && data.office) {
      const found = await prisma.office.findFirst({
        where: { OR: [{ code: data.office }, { name: data.office }] },
      });
      if (found) effectiveOfficeId = found.id;
    }

    if (!effectiveOfficeId) {
      const defaultOffice = await prisma.office.findFirst();
      effectiveOfficeId = defaultOffice?.id;
    }

    const program = await prisma.$transaction(async (tx) => {
      const prog = await tx.program.create({
        data: {
          title: data.title.trim(),
          description: data.description || null,
          sector: data.sector || 'General',
          fiscalYear: parseInt(String(data.fiscalYear || data.year || new Date().getFullYear()), 10),
          officeId: effectiveOfficeId!,
          budgetTarget: parseFloat(String(data.budgetTarget || data.budget || '0')),
          budgetActual: parseFloat(String(data.budgetActual || '0')),
          status: (data.status as ProgramStatus) || ProgramStatus.ACTIVE,
          targetMale: parseInt(String(data.targetMale || '0'), 10),
          targetFemale: parseInt(String(data.targetFemale || '0'), 10),
          actualMale: parseInt(String(data.actualMale || '0'), 10),
          actualFemale: parseInt(String(data.actualFemale || '0'), 10),
          createdById: actorUser.id,
        },
        include: { office: true },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'PROGRAM_CREATED',
        entityType: 'Program',
        entityId: prog.id,
        afterState: { id: prog.id, title: prog.title, fiscalYear: prog.fiscalYear, budgetTarget: Number(prog.budgetTarget) },
        req,
      });

      return prog;
    });

    return {
      ...program,
      budget: Number(program.budgetTarget),
      budgetTarget: Number(program.budgetTarget),
      budgetActual: Number(program.budgetActual),
      year: program.fiscalYear,
      office: program.office?.code || program.office?.name || '',
    };
  }

  public static async updateProgram(
    id: string,
    data: any,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      const idx = MEMORY_PROGRAMS.findIndex((p) => p.id === id);
      if (idx === -1) throw new NotFoundError('Program');
      const existing = MEMORY_PROGRAMS[idx];
      if (actorUser.role === Role.ENCODER && existing.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders can only modify programs belonging to their own office');
      }
      MEMORY_PROGRAMS[idx] = { ...existing, ...data };
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'PROGRAM_UPDATED',
        entityType: 'Program',
        entityId: id,
        req,
      });
      return MEMORY_PROGRAMS[idx];
    }

    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Program');
    }

    if (actorUser.role === Role.ENCODER && existing.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders can only modify programs belonging to their own office');
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.fiscalYear !== undefined || data.year !== undefined) {
      updateData.fiscalYear = parseInt(String(data.fiscalYear || data.year), 10);
    }
    if (data.budgetTarget !== undefined || data.budget !== undefined) {
      updateData.budgetTarget = parseFloat(String(data.budgetTarget ?? data.budget));
    }
    if (data.budgetActual !== undefined) {
      updateData.budgetActual = parseFloat(String(data.budgetActual));
    }
    if (data.status !== undefined) updateData.status = data.status as ProgramStatus;
    if (data.targetMale !== undefined) updateData.targetMale = parseInt(String(data.targetMale), 10);
    if (data.targetFemale !== undefined) updateData.targetFemale = parseInt(String(data.targetFemale), 10);
    if (data.actualMale !== undefined) updateData.actualMale = parseInt(String(data.actualMale), 10);
    if (data.actualFemale !== undefined) updateData.actualFemale = parseInt(String(data.actualFemale), 10);

    if (actorUser.role === Role.ADMIN && data.officeId) {
      updateData.officeId = data.officeId;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const prog = await tx.program.update({
        where: { id },
        data: updateData,
        include: { office: true },
      });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'PROGRAM_UPDATED',
        entityType: 'Program',
        entityId: prog.id,
        beforeState: { id: existing.id, title: existing.title, status: existing.status },
        afterState: { id: prog.id, title: prog.title, status: prog.status },
        req,
      });

      return prog;
    });

    return {
      ...updated,
      budget: Number(updated.budgetTarget),
      budgetTarget: Number(updated.budgetTarget),
      budgetActual: Number(updated.budgetActual),
      year: updated.fiscalYear,
      office: updated.office?.code || updated.office?.name || '',
    };
  }

  public static async deleteProgram(
    id: string,
    actorUser: { id: string; role: Role; officeId: string | null },
    req?: Request
  ) {
    if (!isDatabaseConnected()) {
      const idx = MEMORY_PROGRAMS.findIndex((p) => p.id === id);
      if (idx === -1) throw new NotFoundError('Program');
      const existing = MEMORY_PROGRAMS[idx];
      if (actorUser.role === Role.ENCODER && existing.officeId !== actorUser.officeId) {
        throw new OfficeScopeError('Encoders cannot delete programs of other offices');
      }
      MEMORY_PROGRAMS.splice(idx, 1);
      await AuditService.logActionTx(null, {
        userId: actorUser.id,
        action: 'PROGRAM_DELETED',
        entityType: 'Program',
        entityId: id,
        req,
      });
      return { message: 'Program deleted successfully' };
    }

    const existing = await prisma.program.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError('Program');
    }

    if (actorUser.role === Role.ENCODER && existing.officeId !== actorUser.officeId) {
      throw new OfficeScopeError('Encoders cannot delete programs of other offices');
    }

    await prisma.$transaction(async (tx) => {
      await tx.program.delete({ where: { id } });

      await AuditService.logActionTx(tx, {
        userId: actorUser.id,
        action: 'PROGRAM_DELETED',
        entityType: 'Program',
        entityId: id,
        beforeState: existing,
        req,
      });
    });

    return { message: 'Program deleted successfully' };
  }

  /**
   * Public Program listing (only Active/Completed, sanitized)
   */
  public static async getPublicPrograms(params?: { year?: number; sector?: string }) {
    if (!isDatabaseConnected()) {
      throw new AppError('Public source unavailable', 503, 'DATA_UNAVAILABLE');
    }

    try {
      const where: any = {
        status: { in: [ProgramStatus.ACTIVE, ProgramStatus.COMPLETED] },
      };

      if (params?.year) {
        where.fiscalYear = Number(params.year);
      }
      if (params?.sector) {
        where.sector = params.sector;
      }

      const programs = await prisma.program.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          sector: true,
          fiscalYear: true,
          status: true,
          budgetTarget: true,
          budgetActual: true,
          targetMale: true,
          targetFemale: true,
          actualMale: true,
          actualFemale: true,
          office: { select: { code: true, name: true } },
        },
        orderBy: [{ fiscalYear: 'desc' }, { title: 'asc' }],
      });

      return programs.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        sector: p.sector,
        fiscalYear: p.fiscalYear,
        status: p.status,
        budgetTarget: Number(p.budgetTarget),
        budgetActual: Number(p.budgetActual),
        targetMale: p.targetMale,
        targetFemale: p.targetFemale,
        actualMale: p.actualMale,
        actualFemale: p.actualFemale,
        office: p.office.code || p.office.name,
        officeName: p.office.name,
      }));
    } catch {
      throw new AppError('Public source unavailable', 503, 'DATA_UNAVAILABLE');
    }
  }
}
