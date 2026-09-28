/**
 * MOVAttachmentWidget
 *
 * Self-contained React component that handles listing, uploading, and downloading
 * MOV (Means of Verification) attachments for a single GAD Accomplishment record.
 *
 * Role behaviour:
 *   VIEWER          → read-only: list + download only
 *   ENCODER         → upload allowed (backend enforces office-scope isolation)
 *   ADMIN / SUPER   → full access
 *
 * The component is designed to be embedded inline — it manages its own data
 * fetching and upload state independently so the parent page stays clean.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Upload,
  Download,
  FileText,
  FileImage,
  FileSpreadsheet,
  Film,
  Loader2,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  listMOVAttachments,
  uploadMOVAttachment,
  getMOVDownloadUrl,
  validateMOVFile,
  MOVAttachmentMeta,
  MOV_ALLOWED_EXTENSIONS,
  MOV_MAX_FILE_SIZE_BYTES,
} from '../../../api/movAttachments';

// ─── Props ────────────────────────────────────────────────────────────────────

interface MOVAttachmentWidgetProps {
  /** The GAD Accomplishment ID these attachments belong to. */
  accomplishmentId: string;
  /** Whether the current user may upload files (false for VIEWER role). */
  canUpload: boolean;
  /** Optional label shown above the panel. Defaults to "Means of Verification". */
  label?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/'))
    return <FileImage className="w-4 h-4 text-indigo-500 shrink-0" />;
  if (mimeType === 'application/pdf')
    return <FileText className="w-4 h-4 text-red-400 shrink-0" />;
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('ms-excel')
  )
    return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (mimeType.startsWith('video/'))
    return <Film className="w-4 h-4 text-purple-400 shrink-0" />;
  return <FileText className="w-4 h-4 text-slate-400 shrink-0" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MOVAttachmentWidget: React.FC<MOVAttachmentWidgetProps> = ({
  accomplishmentId,
  canUpload,
  label = 'Means of Verification',
}) => {
  const [attachments, setAttachments] = useState<MOVAttachmentMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);

  // Download state — tracks which attachment ID is being fetched
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Data loading ─────────────────────────────────────────────────────────

  const loadAttachments = useCallback(async () => {
    if (!accomplishmentId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listMOVAttachments(accomplishmentId);
      setAttachments(list);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load MOV attachments.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [accomplishmentId]);

  // Load when panel is expanded for the first time
  useEffect(() => {
    if (expanded) {
      loadAttachments();
    }
  }, [expanded, loadAttachments]);

  // ─── File selection ───────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setValidationError(null);
    if (file) {
      const err = validateMOVFile(file);
      if (err) {
        setValidationError(err);
        setSelectedFile(null);
      }
    }
    // Reset input so same file can be re-selected after a failed upload
    e.target.value = '';
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setValidationError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Upload ───────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;

    const validErr = validateMOVFile(selectedFile);
    if (validErr) {
      setValidationError(validErr);
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      await uploadMOVAttachment(accomplishmentId, selectedFile, setUploadProgress);
      toast.success(`"${selectedFile.name}" uploaded successfully.`);
      clearSelectedFile();
      await loadAttachments();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Upload failed. Please try again.';
      toast.error(msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const handleDownload = async (att: MOVAttachmentMeta) => {
    setDownloadingId(att.id);
    try {
      const result = await getMOVDownloadUrl(accomplishmentId, att.id);
      // Open in new tab — the browser will either preview or download the file
      window.open(result.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || 'Failed to generate download link. Try again.';
      toast.error(msg);
    } finally {
      setDownloadingId(null);
    }
  };

  // ─── Drag-and-drop support ────────────────────────────────────────────────

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canUpload || isUploading) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const err = validateMOVFile(file);
    if (err) {
      setValidationError(err);
      setSelectedFile(null);
    } else {
      setSelectedFile(file);
      setValidationError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // ─── Render ───────────────────────────────────────────────────────────────

  const attachmentCount = attachments.length;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header — always visible, toggles panel */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors group"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Paperclip className="w-4 h-4 text-indigo-500 shrink-0" />
          <span className="text-sm font-semibold text-slate-700 truncate">{label}</span>
          {!loading && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 ml-1 shrink-0">
              {attachmentCount}
            </span>
          )}
          {loading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 ml-1 shrink-0" />
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-600 transition-colors" />
        )}
      </button>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100 text-xs text-red-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
              <button
                onClick={loadAttachments}
                className="ml-auto underline font-medium hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Attachment list */}
          <div className="px-4 py-2 space-y-1 max-h-48 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-6 text-slate-400 text-xs gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading attachments…
              </div>
            )}
            {!loading && attachments.length === 0 && !error && (
              <p className="text-center py-5 text-xs text-slate-400 italic">
                No attachments yet.
              </p>
            )}
            {!loading &&
              attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors group/row"
                >
                  <FileTypeIcon mimeType={att.fileType} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{att.fileName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {formatBytes(att.fileSizeBytes)} ·{' '}
                      {new Date(att.uploadedAt).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    disabled={downloadingId === att.id}
                    title={`Download ${att.fileName}`}
                    className="opacity-0 group-hover/row:opacity-100 p-1.5 rounded-md text-indigo-600 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-wait"
                  >
                    {downloadingId === att.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
          </div>

          {/* Upload area — only for non-VIEWER roles */}
          {canUpload && (
            <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-2">
              {/* Drop zone / file picker */}
              {!selectedFile ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 hover:border-indigo-300 rounded-lg py-4 cursor-pointer transition-colors group/drop"
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  aria-label="Click or drag a file here to attach"
                >
                  <Upload className="w-5 h-5 text-slate-300 group-hover/drop:text-indigo-400 transition-colors" />
                  <span className="text-[11px] text-slate-400 group-hover/drop:text-indigo-500 font-medium transition-colors">
                    Click or drag to attach a file
                  </span>
                  <span className="text-[10px] text-slate-300">
                    Images, PDF, Word, Excel, Video · max {MOV_MAX_FILE_SIZE_BYTES / 1024 / 1024} MB
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept={MOV_ALLOWED_EXTENSIONS}
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                /* Selected file preview + upload button */
                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <FileTypeIcon mimeType={selectedFile.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[10px] text-indigo-500">{formatBytes(selectedFile.size)}</p>
                    </div>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={clearSelectedFile}
                        className="p-1 rounded text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
                        title="Remove selected file"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Upload progress bar */}
                  {isUploading && uploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 text-center">
                        Uploading… {uploadProgress}%
                      </p>
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Upload File
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Validation error */}
              {validationError && (
                <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  {validationError}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
