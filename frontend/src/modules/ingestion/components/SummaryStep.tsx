import React from 'react';
import { IngestionExecutionSummary } from '../types';
import { DATASET_TYPE_LABELS } from '../constants';
import { Button } from '../../../components/ui/button';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import {
  CheckCircle2,
  Copy,
  Download,
  RotateCcw,
  Clock,
  Check,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

interface SummaryStepProps {
  summary: IngestionExecutionSummary;
  onReset: () => void;
  onClose: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  summary,
  onReset,
  onClose,
}) => {
  const [copiedBatchId, setCopiedBatchId] = React.useState(false);

  const handleCopyBatchId = () => {
    if (summary.batchId) {
      navigator.clipboard.writeText(summary.batchId);
      setCopiedBatchId(true);
      toast.success('Batch ID copied to clipboard');
      setTimeout(() => setCopiedBatchId(false), 2000);
    }
  };

  /**
   * Export structured Zero-PII error report
   */
  const handleDownloadErrorReport = () => {
    if (!summary.errors || summary.errors.length === 0) {
      toast.info('No row-level errors to export.');
      return;
    }

    // Zero-PII error report schema: rowNumber, field, errorReason
    const csvRows = ['Row Number,Field,Error Reason'];
    summary.errors.forEach((err) => {
      const sanitizedReason = `"${(err.message || 'Validation error').replace(/"/g, '""')}"`;
      csvRows.push(`${err.rowNumber},${err.field || 'General'},${sanitizedReason}`);
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `tagad-ingestion-errors-${summary.batchId || 'report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Zero-PII error report downloaded');
  };

  return (
    <div className="space-y-6 text-left">
      {/* Success Banner */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#111827]">Dataset Ingestion Complete</h3>
        <p className="text-xs text-[#6B7280]">
          The {DATASET_TYPE_LABELS[summary.datasetType]?.label || 'dataset'} has been processed and saved.
        </p>
      </div>

      {/* Batch Metadata Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-muted border border-border rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-semibold">Batch ID:</span>
          <code className="font-mono bg-card px-2 py-0.5 rounded border border-border text-foreground font-bold">
            {summary.batchId || 'N/A'}
          </code>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyBatchId}
            className="flex items-center gap-1 text-[11px] text-[#6366F1] font-semibold hover:underline"
          >
            {copiedBatchId ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedBatchId ? 'Copied' : 'Copy ID'}
          </button>
          <span className="text-foreground">|</span>
          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            {summary.processingTimeMs} ms
          </span>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
        <div className="p-3 bg-muted border border-border rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Total Rows</span>
          <span className="text-lg font-bold text-foreground">{summary.totalRows.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Inserted</span>
          <span className="text-lg font-bold text-emerald-800">{summary.insertedCount.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">Updated</span>
          <span className="text-lg font-bold text-blue-800">{summary.updatedCount.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-accent border border-primary rounded-xl">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5] block">Skipped</span>
          <span className="text-lg font-bold text-primary">{summary.skippedCount.toLocaleString()}</span>
        </div>
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 block">Errors</span>
          <span className="text-lg font-bold text-red-800">{summary.errorCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Error Report Download if Errors exist */}
      {summary.errorCount > 0 && (
        <Card className="border-red-200 bg-red-50/50 rounded-xl shadow-xs">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <div>
                <p className="font-bold text-red-900">{summary.errorCount} Rows Were Skipped Due to Validation Errors</p>
                <p className="text-[11px] text-red-700">
                  Download a structured, Zero-PII diagnostics report with exact line numbers and reasons.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadErrorReport}
              className="bg-card border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold gap-1.5 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Download Error Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onReset}
          className="w-full sm:w-auto rounded-lg text-xs font-semibold border-border gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Import Another Dataset
        </Button>

        <Button
          type="button"
          onClick={onClose}
          className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg font-bold px-8 py-2 shadow-xs text-xs"
        >
          Done / View Ingested Records
        </Button>
      </div>
    </div>
  );
};
