/**
 * MOV (Means of Verification) Attachment Service
 *
 * Handles server-side upload to Supabase Storage and signed-URL generation
 * for MOV files attached to GAD accomplishment records.
 *
 * Security rules:
 * - The Supabase service-role key is NEVER sent to the frontend.
 * - Signed URLs expire in 15 minutes by default.
 * - File type and size validation is enforced server-side before upload.
 * - Office-scope isolation: ENCODER may only access attachments belonging
 *   to accomplishments owned by their assigned office.
 */

import prisma, { isDatabaseConnected } from '../lib/prisma';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { Role } from '@prisma/client';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  AppError,
} from '../lib/errors';
import { AuditService } from './AuditService';
import { Request } from 'express';
import path from 'path';

// Storage bucket name — configure in Supabase dashboard before use
const STORAGE_BUCKET = process.env.SUPABASE_MOV_BUCKET || 'mov-attachments';

// Allowed MIME types for MOV files
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'video/quicktime',
]);

// Max file size: 20 MB
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export interface MOVUploadResult {
  id: string;
  accomplishmentId: string;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedById: string | null;
  uploadedAt: string;
}

export interface MOVDownloadResult {
  signedUrl: string;
  expiresInSeconds: number;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
}

export class MOVAttachmentService {
  /**
   * Validates and uploads a MOV file to Supabase Storage,
   * then records the attachment metadata in the database.
   */
  public static async upload(
    accomplishmentId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    actor: { id: string; role: Role; officeId: string | null },
    req?: Request
  ): Promise<MOVUploadResult> {
    // 1. Server-side file type validation
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ValidationError(
        `File type '${file.mimetype}' is not allowed. Permitted types: images (JPEG, PNG, GIF, WebP), PDF, Word, Excel, MP4, MOV.`
      );
    }

    // 2. Server-side file size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const maxMb = MAX_FILE_SIZE_BYTES / (1024 * 1024);
      throw new ValidationError(
        `File size ${(file.size / (1024 * 1024)).toFixed(1)} MB exceeds the maximum allowed size of ${maxMb} MB.`
      );
    }

    // 3. Verify accomplishment exists and actor has office-scope access
    await this.assertAccomplishmentAccess(accomplishmentId, actor, 'write');

    if (!isSupabaseConfigured() || !supabaseAdmin) {
      throw new AppError(
        'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable MOV uploads.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    // 4. Build storage path: <accomplishmentId>/<timestamp>_<safeName>
    const ext = path.extname(file.originalname) || '';
    const safeName = path.basename(file.originalname, ext)
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 80);
    const storagePath = `${accomplishmentId}/${Date.now()}_${safeName}${ext}`;

    // 5. Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      throw new AppError(
        `Supabase Storage upload failed: ${uploadError.message}`,
        502,
        'STORAGE_UPLOAD_FAILED'
      );
    }

    // 6. Record in database
    if (!isDatabaseConnected()) {
      // In-memory path for testing without a real database
      const attachment: MOVUploadResult = {
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        accomplishmentId,
        storagePath,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        uploadedById: actor.id,
        uploadedAt: new Date().toISOString(),
      };

      await AuditService.logActionTx(null, {
        userId: actor.id,
        action: 'MOV_ATTACHMENT_UPLOADED',
        entityType: 'MOVAttachment',
        entityId: attachment.id,
        afterState: { storagePath, fileName: file.originalname, fileType: file.mimetype, fileSizeBytes: file.size },
        req,
      });

      return attachment;
    }

    const record = await prisma.mOVAttachment.create({
      data: {
        accomplishmentId,
        storagePath,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        uploadedById: actor.id,
      },
    });

    await AuditService.logActionTx(null, {
      userId: actor.id,
      action: 'MOV_ATTACHMENT_UPLOADED',
      entityType: 'MOVAttachment',
      entityId: record.id,
      afterState: { storagePath, fileName: record.fileName, fileType: record.fileType },
      req,
    });

    return {
      id: record.id,
      accomplishmentId: record.accomplishmentId,
      storagePath: record.storagePath,
      fileName: record.fileName,
      fileType: record.fileType,
      fileSizeBytes: record.fileSizeBytes,
      uploadedById: record.uploadedById,
      uploadedAt: record.uploadedAt.toISOString(),
    };
  }

  /**
   * Generates a short-lived signed URL for downloading a MOV attachment.
   * Validates office-scope before signing.
   */
  public static async getSignedUrl(
    attachmentId: string,
    actor: { id: string; role: Role; officeId: string | null }
  ): Promise<MOVDownloadResult> {
    if (!isSupabaseConfigured() || !supabaseAdmin) {
      throw new AppError(
        'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable MOV downloads.',
        503,
        'STORAGE_NOT_CONFIGURED'
      );
    }

    // Fetch attachment record
    let attachment: {
      id: string;
      storagePath: string;
      fileName: string;
      fileType: string;
      fileSizeBytes: number;
      accomplishmentId: string;
    } | null = null;

    if (isDatabaseConnected()) {
      attachment = await prisma.mOVAttachment.findUnique({
        where: { id: attachmentId },
        select: {
          id: true,
          storagePath: true,
          fileName: true,
          fileType: true,
          fileSizeBytes: true,
          accomplishmentId: true,
        },
      });
    }

    if (!attachment) {
      throw new NotFoundError(`MOV Attachment '${attachmentId}'`);
    }

    // Validate office-scope access before signing
    await this.assertAccomplishmentAccess(attachment.accomplishmentId, actor, 'read');

    const SIGNED_URL_EXPIRY_SECONDS = 15 * 60; // 15 minutes

    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(attachment.storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (error || !data?.signedUrl) {
      throw new AppError(
        `Failed to generate signed URL: ${error?.message ?? 'Unknown storage error'}`,
        502,
        'STORAGE_SIGN_FAILED'
      );
    }

    return {
      signedUrl: data.signedUrl,
      expiresInSeconds: SIGNED_URL_EXPIRY_SECONDS,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
      fileSizeBytes: attachment.fileSizeBytes,
    };
  }

  /**
   * Lists all MOV attachments for an accomplishment, with office-scope check.
   */
  public static async listByAccomplishment(
    accomplishmentId: string,
    actor: { id: string; role: Role; officeId: string | null }
  ): Promise<Array<{ id: string; fileName: string; fileType: string; fileSizeBytes: number; uploadedAt: string }>> {
    await this.assertAccomplishmentAccess(accomplishmentId, actor, 'read');

    if (!isDatabaseConnected()) {
      return [];
    }

    const records = await prisma.mOVAttachment.findMany({
      where: { accomplishmentId },
      orderBy: { uploadedAt: 'asc' },
      select: {
        id: true,
        fileName: true,
        fileType: true,
        fileSizeBytes: true,
        uploadedAt: true,
      },
    });

    return records.map((r) => ({
      id: r.id,
      fileName: r.fileName,
      fileType: r.fileType,
      fileSizeBytes: r.fileSizeBytes,
      uploadedAt: r.uploadedAt.toISOString(),
    }));
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private static async assertAccomplishmentAccess(
    accomplishmentId: string,
    actor: { id: string; role: Role; officeId: string | null },
    mode: 'read' | 'write'
  ): Promise<void> {
    if (!isDatabaseConnected()) {
      // In-memory/test path — always allow (no real DB to check office scope)
      return;
    }

    const accomplishment = await prisma.gADAccomplishment.findUnique({
      where: { id: accomplishmentId },
      include: {
        program: { select: { officeId: true } },
        gadPlanItem: { select: { gadPlan: { select: { officeId: true } } } },
      },
    });

    if (!accomplishment) {
      throw new NotFoundError(`GAD Accomplishment '${accomplishmentId}'`);
    }

    if (actor.role === Role.VIEWER && mode === 'write') {
      throw new ForbiddenError('VIEWER role cannot upload or delete MOV attachments.');
    }

    if (actor.role === Role.ENCODER) {
      const accomplishmentOfficeId =
        accomplishment.program?.officeId ??
        accomplishment.gadPlanItem?.gadPlan?.officeId ??
        null;

      if (accomplishmentOfficeId && accomplishmentOfficeId !== actor.officeId) {
        throw new ForbiddenError(
          'Encoders cannot access MOV attachments belonging to accomplishments of other offices.'
        );
      }
    }
  }
}
