import React from 'react';
import {
  StatisticalTableCatalogItem,
  StatisticalVerificationStatus,
  StatisticalTableClassification,
} from '../../../types/statisticalCatalog';
import {
  X,
  Database,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Hash,
  Activity,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface TableDetailModalProps {
  table: StatisticalTableCatalogItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TableDetailModal: React.FC<TableDetailModalProps> = ({
  table,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !table) return null;

  const handleCopySpec = () => {
    const spec = JSON.stringify(table, null, 2);
    navigator.clipboard.writeText(spec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isVerified = table.verificationStatus === StatisticalVerificationStatus.VERIFIED;
  const isIndicator = table.classification === StatisticalTableClassification.INDICATOR;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card dark:bg-background border border-border dark:border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border dark:border-border flex items-start justify-between gap-4 bg-muted/50 dark:bg-muted/30">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-accent text-primary dark:bg-accent/50 dark:text-primary">
                {table.tableCode}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted dark:bg-muted text-foreground dark:text-foreground">
                PSA Table #{table.tableNumber}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                  isVerified
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {isVerified ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    [VERIFIED]
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    [UNVERIFIED]
                  </>
                )}
              </span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  isIndicator
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                }`}
              >
                {isIndicator ? 'Analytical Indicator' : 'Aggregated Statistics'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-foreground dark:text-foreground leading-snug">
              {table.title}
            </h2>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Canonical Domain:{' '}
              <strong className="text-foreground dark:text-foreground">
                {table.domain}
              </strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground dark:hover:text-foreground hover:bg-muted dark:hover:bg-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Verification Audit Note */}
          <div
            className={`p-3.5 rounded-lg border text-xs ${
              isVerified
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200'
                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div className="font-semibold flex items-center gap-1.5 mb-1">
              <HelpCircle className="w-4 h-4 shrink-0" />
              Contract Verification Status: {isVerified ? 'VERIFIED' : 'UNVERIFIED — SPECIFICATION ONLY'}
            </div>
            <p className="leading-relaxed opacity-90">
              {isVerified
                ? 'This table definition has undergone physical row grain calibration and verified schema ingestion.'
                : 'The thematic dimensions, indicators, and metadata reflect the official PSA CBMS tabulation plan. Physical column offsets remain pending authentic survey batch upload.'}
            </p>
          </div>

          {/* Description Section */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
              Description & Statistical Intent
            </h3>
            <p className="text-foreground dark:text-foreground leading-relaxed text-sm">
              {table.description || 'No detailed descriptive narrative provided.'}
            </p>
          </div>

          {/* Specifications Matrix Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
              Technical Layout Contract
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border dark:border-border bg-muted/50 dark:bg-muted/40 space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-primary" />
                  Expected Unit of Measure
                </div>
                <div className="text-xs font-semibold text-foreground dark:text-foreground">
                  {table.expectedUnit || 'Unspecified count'}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border dark:border-border bg-muted/50 dark:bg-muted/40 space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-primary" />
                  Expected Source Format
                </div>
                <div className="text-xs font-semibold text-foreground dark:text-foreground">
                  {table.sourceFormat || 'PSA Tabulation Matrix (.xlsx / .csv)'}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border dark:border-border bg-muted/50 dark:bg-muted/40 space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Expected Row Grain
                </div>
                <div className="text-xs font-semibold text-foreground dark:text-foreground">
                  {table.rowGrain || 'Barangay Spatial Unit'}
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border dark:border-border bg-muted/50 dark:bg-muted/40 space-y-1">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  Analytical Dimensions
                </div>
                <div className="text-xs font-semibold text-foreground dark:text-foreground">
                  {table.dimensionsSummary || 'Standard demographic & spatial dimensions'}
                </div>
              </div>
            </div>
          </div>

          {/* Indicators Section (if available) */}
          {table.indicators && table.indicators.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-purple-500" />
                Linked GAD / SDG Indicators ({table.indicators.length})
              </h3>
              <div className="space-y-2">
                {table.indicators.map((ind, idx) => (
                  <div
                    key={ind.id || idx}
                    className="p-3 rounded-lg border border-border dark:border-border bg-card dark:bg-background space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                        {ind.indicatorCode}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                        {ind.unit || 'Rate / Percent'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-foreground dark:text-foreground">
                      {ind.name || ind.title}
                    </div>
                    {ind.formula && (
                      <div className="text-[11px] font-mono text-muted-foreground bg-muted dark:bg-muted/60 p-1.5 rounded">
                        Formula: {ind.formula}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border dark:border-border bg-muted/50 dark:bg-muted/30 flex items-center justify-between gap-3">
          <button
            onClick={handleCopySpec}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground dark:text-foreground hover:text-foreground dark:hover:text-white hover:bg-background/60 dark:hover:bg-muted rounded-md border border-border dark:border-border transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied JSON
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Contract JSON
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
