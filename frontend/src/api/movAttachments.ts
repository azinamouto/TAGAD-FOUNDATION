/**
 * MOV (Means of Verification) Attachment API Client
 *
 * All requests go through the authenticated Axios instance (JWT Bearer header).
 * The backend proxies uploads to Supabase Storage — the service-role key is
 * never exposed to the frontend.
 *
 * Endpoints (all scoped under /api/admin/accomplishments/:accomplishmentId/mov):
 *   GET    /            → list attachments for an accomplishment
 *   POST   /            → upload a new MOV file (multipart/form-data, field: "file")
 *   GET    /:id/download → get a 15-min signed download URL
 */

import api from './axios';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MOVAttachmentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

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

// ─── Client-side validation constants (mirrors server-side rules) ─────────

/** Maximum file size allowed — must match server MAX_FILE_SIZE_BYTES (20 MB). */
export const MOV_MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Allowed MIME types — must be a subset of the server ALLOWED_MIME_TYPES set. */
export const MOV_ALLOWED_MIME_TYPES = new Set([
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

export const MOV_ALLOWED_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.mp4,.mov';

// ─── Validation helper ───────────────────────────────────────────────────

/**
 * Validates a File object client-side before attempting upload.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateMOVFile(file: File): string | null {
  if (!MOV_ALLOWED_MIME_TYPES.has(file.type)) {
    return `File type "${file.type}" is not allowed. Permitted: images (JPEG, PNG, GIF, WebP), PDF, Word, Excel, MP4, MOV.`;
  }
  if (file.size > MOV_MAX_FILE_SIZE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `File size ${mb} MB exceeds the 20 MB limit.`;
  }
  return null;
}

// ─── API functions ────────────────────────────────────────────────────────

const movBase = (accomplishmentId: string) =>
  `/admin/accomplishments/${accomplishmentId}/mov`;

/**
 * List all MOV attachments for an accomplishment (metadata only, no file content).
 */
export const listMOVAttachments = async (
  accomplishmentId: string
): Promise<MOVAttachmentMeta[]> => {
  const response = await api.get(movBase(accomplishmentId));
  return response.data?.data ?? response.data ?? [];
};

/**
 * Upload a MOV file to an accomplishment.
 * Sends multipart/form-data with field name "file".
 *
 * @param onUploadProgress - optional callback for tracking upload progress (0–100)
 */
export const uploadMOVAttachment = async (
  accomplishmentId: string,
  file: File,
  onUploadProgress?: (percent: number) => void
): Promise<MOVUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post(movBase(accomplishmentId), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onUploadProgress
      ? (evt) => {
          if (evt.total) {
            onUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        }
      : undefined,
  });

  return response.data?.data ?? response.data;
};

/**
 * Get a 15-minute signed download URL for a MOV attachment.
 * Open the returned `signedUrl` in a new tab to download the file.
 */
export const getMOVDownloadUrl = async (
  accomplishmentId: string,
  attachmentId: string
): Promise<MOVDownloadResult> => {
  const response = await api.get(
    `${movBase(accomplishmentId)}/${attachmentId}/download`
  );
  return response.data?.data ?? response.data;
};
