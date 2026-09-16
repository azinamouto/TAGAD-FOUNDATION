import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { StatisticalObservationIngestionService } from '../../services/StatisticalObservationIngestionService';
import { sendSuccess, sendError } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';
import { ActorContext } from '../../services/TableBuilderService';

export class StatisticalImportController {
  public static async discover(req: AuthenticatedRequest, res: Response) {
    try {
      const { csvContent, filename, tableId, datasetId } = req.body;
      const actor: ActorContext | undefined = req.user
        ? {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role as any,
            officeId: req.user.officeId,
          }
        : undefined;

      const result = await StatisticalObservationIngestionService.discover(
        { csvContent, filename, tableId, datasetId, csvLayout: req.body.csvLayout },
        actor
      );

      return sendSuccess(res, result, { message: 'Statistical CSV structure discovered successfully' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  public static async preview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const actor: ActorContext = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role as any,
        officeId: req.user.officeId,
      };

      const { csvContent, filename, datasetId, tableId, ingestionMode, mapping, duplicateStrategy } = req.body;
      const result = await StatisticalObservationIngestionService.preview(
        { csvContent, filename, datasetId, tableId, ingestionMode, mapping, duplicateStrategy, csvLayout: req.body.csvLayout },
        actor
      );

      return sendSuccess(res, result, { message: 'Statistical CSV import preview generated successfully' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  public static async execute(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const actor: ActorContext = {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role as any,
        officeId: req.user.officeId,
      };

      const {
        csvContent,
        filename,
        datasetId,
        tableId,
        ingestionMode,
        mapping,
        duplicateStrategy,
        methodologyNotes,
        sourceUrl,
      } = req.body;

      const result = await StatisticalObservationIngestionService.execute(
        {
          csvContent,
          csvLayout: req.body.csvLayout,
          filename,
          datasetId,
          tableId,
          ingestionMode,
          mapping,
          duplicateStrategy,
          methodologyNotes,
          sourceUrl,
        },
        actor,
        req
      );

      return sendSuccess(res, result, { message: 'Statistical CSV imported successfully' }, 201);
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
