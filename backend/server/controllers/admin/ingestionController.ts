import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { CsvDiscoveryService } from '../../services/CsvDiscoveryService';
import { CsvIngestionService } from '../../services/CsvIngestionService';
import { sendSuccess, sendError } from '../../lib/response';
import { ValidationError, UnauthorizedError } from '../../lib/errors';

export class IngestionController {
  /**
   * Phase 1: Discover and profile raw CSV schema without writing to database
   */
  public static async discoverSchema(req: AuthenticatedRequest, res: Response) {
    try {
      const { csvContent, filename } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        throw new ValidationError('csvContent is required as a raw CSV string');
      }

      const discoveryResult = CsvDiscoveryService.discoverSchema(csvContent, filename || 'dataset.csv');

      return sendSuccess(res, discoveryResult, { message: 'CSV Schema discovered successfully' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  /**
   * Phase 2 Step A: Generate Dry-Run Validation and Preview Matrix
   */
  public static async previewData(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const {
        csvContent,
        filename,
        datasetType,
        confirmedMappings,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId,
      } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        throw new ValidationError('csvContent is required as a raw CSV string');
      }

      const previewResult = await CsvIngestionService.generatePreview({
        csvContent,
        filename,
        datasetType,
        confirmedMappings,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId,
        actorUser: {
          id: req.user.id,
          role: req.user.role,
          officeId: req.user.officeId,
          email: req.user.email,
          fullName: req.user.fullName,
        },
      });

      return sendSuccess(res, previewResult, { message: 'CSV Preview generated successfully' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }

  /**
   * Phase 2 Step B: Execute Transactional Batch Ingestion
   */
  public static async executeIngestion(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }

      const {
        csvContent,
        filename,
        datasetType,
        confirmedMappings,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId,
      } = req.body;

      if (!csvContent || typeof csvContent !== 'string') {
        throw new ValidationError('csvContent is required as a raw CSV string');
      }

      const summary = await CsvIngestionService.executeIngestion(
        {
          csvContent,
          filename,
          datasetType,
          confirmedMappings,
          duplicateStrategy,
          ingestionMode,
          targetOfficeId,
          actorUser: {
            id: req.user.id,
            role: req.user.role,
            officeId: req.user.officeId,
            email: req.user.email,
            fullName: req.user.fullName,
          },
        },
        req
      );

      return sendSuccess(res, summary, { message: 'CSV Ingestion completed successfully' });
    } catch (err: any) {
      return sendError(res, err);
    }
  }
}
