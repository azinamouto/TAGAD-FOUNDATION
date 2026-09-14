/**
 * MOV (Means of Verification) Attachment Routes
 *
 * STOR-1: POST  /api/admin/accomplishments/:accomplishmentId/mov
 *   Upload a MOV file (multipart/form-data, field name: "file")
 *   Enforces file type allowlist and 20 MB size limit server-side.
 *   Proxies upload to Supabase Storage via the service-role client (never exposed to frontend).
 *
 * STOR-2: GET   /api/admin/accomplishments/:accomplishmentId/mov/:attachmentId/download
 *   Returns a short-lived (15 min) signed Supabase Storage URL.
 *   Checks office-scope before signing.
 *
 *   GET   /api/admin/accomplishments/:accomplishmentId/mov
 *   Lists attachment metadata for an accomplishment (no file content).
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { requireRole } from '../../middleware/authMiddleware';
import { MOVAttachmentService } from '../../services/MOVAttachmentService';
import { sendSuccess, sendError } from '../../lib/response';
import { AuthenticatedRequest } from '../../middleware/authMiddleware';
import { Role } from '@prisma/client';

const router = Router({ mergeParams: true });

// Parse multipart uploads into memory (max 20 MB enforced at multer level too)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ─── STOR-1: Upload a MOV file ──────────────────────────────────────────────

router.post(
  '/',
  requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ENCODER),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded. Use multipart/form-data with field name "file".' });
      }

      const { accomplishmentId } = req.params;

      const result = await MOVAttachmentService.upload(
        accomplishmentId,
        {
          buffer: req.file.buffer,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        },
        req.user,
        req
      );

      return sendSuccess(res, result, undefined, 201);
    } catch (error: any) {
      return sendError(res, error, error.statusCode || 500);
    }
  }
);

// ─── List attachments for an accomplishment ─────────────────────────────────

router.get(
  '/',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { accomplishmentId } = req.params;
      const list = await MOVAttachmentService.listByAccomplishment(accomplishmentId, req.user);
      return sendSuccess(res, list);
    } catch (error: any) {
      return sendError(res, error, error.statusCode || 500);
    }
  }
);

// ─── STOR-2: Get a short-lived signed download URL ──────────────────────────

router.get(
  '/:attachmentId/download',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const { attachmentId } = req.params;
      const result = await MOVAttachmentService.getSignedUrl(attachmentId, req.user);
      return sendSuccess(res, result);
    } catch (error: any) {
      return sendError(res, error, error.statusCode || 500);
    }
  }
);

export default router;
