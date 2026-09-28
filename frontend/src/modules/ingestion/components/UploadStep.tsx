import React, { useState, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { MAX_FILE_SIZE_BYTES } from '../constants';
import {
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  AlertCircle,
  Loader2,
  FileCheck,
  Info,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface UploadStepProps {
  onFileLoaded: (file: File, csvContent: string) => void;
  isDiscovering: boolean;
  discoveryError: string | null;
  onClearError: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  onFileLoaded,
  isDiscovering,
  discoveryError,
  onClearError,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvPreviewContent, setCsvPreviewContent] = useState<string | null>(null);
  const [estimatedRows, setEstimatedRows] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = (file: File) => {
    setValidationError(null);
    onClearError();

    // 1. Extension & MIME check
    const isCsvExtension = file.name.toLowerCase().endsWith('.csv');
    if (!isCsvExtension && file.type && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setValidationError('Invalid file format. Please upload a standard comma-separated (.csv) file.');
      return;
    }

    // 2. File size check (5 MB maximum)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `File exceeds the 5 MB maximum limit (${formatFileSize(file.size)}). Please split large datasets or remove extraneous media.`
      );
      return;
    }

    if (file.size === 0) {
      setValidationError('The selected file is empty (0 bytes). Please upload a valid CSV with data.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content || !content.trim()) {
        setValidationError('The CSV file has no content. Please upload a non-empty dataset.');
        return;
      }

      // Simple light client-side estimate of row count for UX display (backend will perform authoritative profiling)
      const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
      const estRows = Math.max(0, lines.length - 1); // subtracting header line

      setSelectedFile(file);
      setCsvPreviewContent(content);
      setEstimatedRows(estRows);
    };

    reader.onerror = () => {
      setValidationError('Could not read the selected file. Please verify file permissions.');
    };

    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setCsvPreviewContent(null);
    setEstimatedRows(0);
    setValidationError(null);
    onClearError();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProceed = () => {
    if (selectedFile && csvPreviewContent) {
      onFileLoaded(selectedFile, csvPreviewContent);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-left">
        <h3 className="text-lg font-bold text-[#111827]">Upload CSV Dataset</h3>
        <p className="text-xs text-[#6B7280]">
          Select or drag your municipal GAD beneficiary, household survey, or program monitoring dataset.
        </p>
      </div>

      {/* Error Banners */}
      {(validationError || discoveryError) && (
        <div
          role="alert"
          className="flex items-start gap-3 p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-xs font-medium"
        >
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-800">Dataset Validation Notice</p>
            <p>{validationError || discoveryError}</p>
          </div>
        </div>
      )}

      {/* Upload Box */}
      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 bg-muted/50 hover:bg-accent/30 hover:border-[#6366F1]',
            dragActive ? 'border-[#6366F1] bg-accent/40 ring-4 ring-primary' : 'border-border'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileInputChange}
            className="hidden"
            id="csv-file-input"
            aria-label="Upload CSV File"
          />

          <div className="w-14 h-14 rounded-2xl bg-accent/70 text-[#6366F1] flex items-center justify-center shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-[#111827]">
              Click to select or drag and drop your CSV file here
            </p>
            <p className="text-xs text-[#6B7280]">
              Supports standard UTF-8 encoded <code className="text-primary font-mono">.csv</code> files up to 5 MB
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg font-semibold border-border hover:border-[#6366F1] hover:text-[#6366F1] text-xs pointer-events-none"
          >
            Browse from Computer
          </Button>
        </div>
      ) : (
        /* Selected File Card */
        <div className="border border-primary bg-accent/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shadow-sm">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-[#111827] truncate max-w-sm">
                  {selectedFile.name}
                </p>
                <div className="flex items-center gap-3 text-xs text-[#6B7280] mt-0.5">
                  <span className="font-medium">{formatFileSize(selectedFile.size)}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <FileCheck className="w-3.5 h-3.5" />
                    ~{estimatedRows.toLocaleString()} rows detected
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              disabled={isDiscovering}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs font-semibold gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Remove
            </Button>
          </div>

          <div className="bg-card/80 border border-primary rounded-xl p-3 flex items-center gap-2.5 text-xs text-[#4F46E5]">
            <Info className="w-4 h-4 shrink-0" />
            <span>Ready for schema analysis. Clicking continue will profile column types and infer canonical field mappings.</span>
          </div>
        </div>
      )}

      {/* Discovery Loading State */}
      {isDiscovering && (
        <div className="p-6 rounded-2xl bg-accent/60 border border-primary text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#6366F1] mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#111827]">Analyzing dataset schema...</p>
            <p className="text-xs text-[#6B7280]">
              Detecting columns, profiling data types, and checking Talibon reference readiness.
            </p>
          </div>
        </div>
      )}

      {/* Action CTA */}
      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          onClick={handleProceed}
          disabled={!selectedFile || isDiscovering}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg font-bold px-6 py-2 shadow-xs text-xs"
        >
          {isDiscovering ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Analyzing Schema...
            </>
          ) : (
            'Continue to Schema Mapping →'
          )}
        </Button>
      </div>
    </div>
  );
};
