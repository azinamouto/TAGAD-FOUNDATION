import prisma, { isDatabaseConnected } from '../lib/prisma';
import { AppError, ConflictError, ForbiddenError, NotFoundError } from '../lib/errors';
import { ActorContext } from './TableBuilderService';

export class FeedbackService {
  private static requireDatabase() {
    if (!isDatabaseConnected()) throw new AppError('Feedback storage temporarily unavailable', 503, 'FEEDBACK_UNAVAILABLE');
  }
  private static requireReviewer(actor: ActorContext) {
    if (!actor || !['ADMIN', 'SUPER_ADMIN'].includes(actor.role)) throw new ForbiddenError('Administrator access required');
    this.requireDatabase();
  }
  static async submit(data: { name: string; email: string; subject: string; message: string }) {
    this.requireDatabase();
    return prisma.$transaction(async tx => {
      const feedback = await tx.citizenFeedback.create({ data, select: { id: true } });
      await tx.auditLog.create({ data: {
        action: 'PUBLIC_FEEDBACK_SUBMITTED', entityType: 'Feedback', entityId: feedback.id,
        afterState: { status: 'NEW' },
      } });
      return feedback;
    });
  }
  static async list(actor: ActorContext, status: string | undefined, page: number, limit: number) {
    this.requireReviewer(actor);
    const where = status ? { status } : {};
    const [total, feedback] = await prisma.$transaction([
      prisma.citizenFeedback.count({ where }),
      prisma.citizenFeedback.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit,
        select: { id: true, subject: true, status: true, createdAt: true, updatedAt: true } }),
    ]);
    return { feedback, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
  static async detail(actor: ActorContext, id: string) {
    this.requireReviewer(actor);
    return prisma.$transaction(async tx => {
      const feedback = await tx.citizenFeedback.findUnique({ where: { id } });
      if (!feedback) throw new NotFoundError('Feedback');
      await tx.auditLog.create({ data: { userId: actor.id, action: 'FEEDBACK_VIEWED', entityType: 'Feedback', entityId: id } });
      return feedback;
    });
  }
  static async review(actor: ActorContext, id: string, data: { status: string; reviewNote: string; expectedUpdatedAt: string }) {
    this.requireReviewer(actor);
    return prisma.$transaction(async tx => {
      const before = await tx.citizenFeedback.findUnique({ where: { id }, select: { status: true } });
      if (!before) throw new NotFoundError('Feedback');
      const changed = await tx.citizenFeedback.updateMany({
        where: { id, updatedAt: new Date(data.expectedUpdatedAt) },
        data: { status: data.status, reviewNote: data.reviewNote, reviewedById: actor.id, reviewedAt: new Date(),
          updatedAt: new Date(Math.max(Date.now(), new Date(data.expectedUpdatedAt).getTime() + 1)) },
      });
      if (changed.count !== 1) throw new ConflictError('Feedback changed or no longer exists. Refresh before saving.');
      await tx.auditLog.create({ data: { userId: actor.id, action: 'FEEDBACK_REVIEWED', entityType: 'Feedback', entityId: id,
        beforeState: { status: before.status }, afterState: { status: data.status } } });
      return tx.citizenFeedback.findUniqueOrThrow({ where: { id } });
    });
  }
}
