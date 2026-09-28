import React, { useState } from 'react';
import {
  IngestionPreviewResult,
  DuplicateStrategy,
  IngestionMode,
  RowValidationIssue,
  IngestionPreviewRow,
} from '../types';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent } from '../../../components/ui/card';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  ChevronLeft,
  ArrowRight,
  Info,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface PreviewStepProps {
  preview: IngestionPreviewResult;
  duplicateStrategy: DuplicateStrategy;
  onDuplicateStrategyChange: (strategy: DuplicateStrategy) => void;
  ingestionMode: IngestionMode;
  onIngestionModeChange: (mode: IngestionMode) => void;
  onBack: () => void;
  onProceedToConfirm: () => void;
}

export const PreviewStep: React.FC<PreviewStepProps> = ({
  preview,
  duplicateStrategy,
  onDuplicateStrategyChange,
  ingestionMode,
  onIngestionModeChange,
  onBack,
  onProceedToConfirm,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const hasCriticalErrors = preview.errorRows > 0;
  const isStrictBlocked = ingestionMode === 'STRICT' && hasCriticalErrors;

  const toggleRowExpand = (rowNum: number) => {
    setExpandedRow(expandedRow === rowNum ? null : rowNum);
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div>
        <h3 className="text-lg font-bold text-[#111827]">Dry-Run Validation Preview</h3>
        <p className="text-xs text-[#6B7280]">
          Inspect canonicalized rows, detected anomalies, and configure duplicate & execution strategies.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Valid Rows */}
        <Card className="border-emerald-200 bg-emerald-50/40 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Valid Rows</span>
              <p className="text-xl font-bold text-emerald-900">{preview.validRows.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="border-amber-200 bg-amber-50/40 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Warnings</span>
              <p className="text-xl font-bold text-amber-900">{preview.warningRows.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Errors */}
        <Card className="border-red-200 bg-red-50/40 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">Errors</span>
              <p className="text-xl font-bold text-red-900">{preview.errorRows.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Duplicates */}
        <Card className="border-primary bg-accent/40 rounded-xl shadow-xs">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#4F46E5]">Duplicates</span>
              <p className="text-xl font-bold text-primary">{preview.duplicateRows.toLocaleString()}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-accent text-[#6366F1] flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strict Mode Block Notice */}
      {isStrictBlocked && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/90 border border-red-200 text-red-800 text-xs">
          <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-900">Strict Ingestion Safeguard Active</p>
            <p>
              There are {preview.errorRows} critical validation errors in this dataset. In <strong>STRICT</strong> mode,
              the batch transaction will be aborted. Switch to <strong>TOLERANT</strong> mode below to commit valid rows and export the error report, or correct the CSV source.
            </p>
          </div>
        </div>
      )}

      {/* Preview Sample Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-xs">
        <div className="bg-muted/80 px-4 py-3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
            Representative Preview (Showing Sample of {preview.sampleRows.length} Rows)
          </span>
          <span className="text-[11px] text-muted-foreground">
            Click any row to inspect canonical fields and diagnostics
          </span>
        </div>

        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-[8%] text-center">Row</th>
                <th className="py-2.5 px-4 w-[28%]">Name / Identifier</th>
                <th className="py-2.5 px-3 w-[12%]">Sex / Type</th>
                <th className="py-2.5 px-4 w-[20%]">Barangay / Location</th>
                <th className="py-2.5 px-4 w-[18%]">Sector / Budget</th>
                <th className="py-2.5 px-4 w-[14%] text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {preview.sampleRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground italic">
                    No preview rows available
                  </td>
                </tr>
              ) : (
                preview.sampleRows.map((row) => {
                  const isExpanded = expandedRow === row.rowNumber;
                  const c = row.canonicalData || {};
                  const displayName =
                    c.fullName ||
                    (c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.title || c.householdNo || c.programTitle || '—');

                  return (
                    <React.Fragment key={row.rowNumber}>
                      <tr
                        onClick={() => toggleRowExpand(row.rowNumber)}
                        className={cn(
                          'hover:bg-accent/30 transition-colors cursor-pointer',
                          row.status === 'ERROR' && 'bg-red-50/20',
                          row.status === 'WARNING' && 'bg-amber-50/20',
                          row.status === 'DUPLICATE' && 'bg-accent/20'
                        )}
                      >
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-muted-foreground">
                          {row.rowNumber}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground truncate max-w-[200px]">
                          {displayName}
                        </td>
                        <td className="py-2.5 px-3">
                          {c.sex ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-bold',
                                c.sex === 'MALE' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                              )}
                            >
                              {c.sex}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-foreground truncate max-w-[150px]">
                          {c.barangay || c.barangayName || c.barangayCode || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-foreground truncate max-w-[150px]">
                          {c.sector || (c.budgetTarget ? `₱${Number(c.budgetTarget).toLocaleString()}` : c.is4Ps ? '4Ps Household' : '—')}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {row.status === 'VALID' && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                ✓ Valid
                              </Badge>
                            )}
                            {row.status === 'WARNING' && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
                                ⚠ Warning
                              </Badge>
                            )}
                            {row.status === 'ERROR' && (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold">
                                ✕ Error
                              </Badge>
                            )}
                            {row.status === 'DUPLICATE' && (
                              <Badge variant="outline" className="bg-accent text-primary border-primary text-[10px] font-bold">
                                ⎘ Duplicate
                              </Badge>
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Diagnostics */}
                      {isExpanded && (
                        <tr className="bg-muted/90 border-y border-border">
                          <td colSpan={6} className="p-4 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Canonical Data Details */}
                              <div className="bg-card p-3 rounded-lg border border-border space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Resolved Canonical Payload
                                </span>
                                <pre className="text-[11px] font-mono text-foreground bg-muted p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap">
                                  {JSON.stringify(c, null, 2)}
                                </pre>
                              </div>

                              {/* Validation Diagnostics / Issues */}
                              <div className="bg-card p-3 rounded-lg border border-border space-y-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Row Diagnostics ({row.issues.length} Issues)
                                </span>
                                {row.issues.length === 0 ? (
                                  <p className="text-xs text-emerald-700 font-medium flex items-center gap-1 mt-2">
                                    <CheckCircle2 className="w-4 h-4" /> All canonical validations passed cleanly.
                                  </p>
                                ) : (
                                  <ul className="space-y-1.5 mt-1 max-h-32 overflow-y-auto">
                                    {row.issues.map((iss, idx) => (
                                      <li
                                        key={idx}
                                        className={cn(
                                          'text-[11px] p-1.5 rounded flex items-start gap-1.5',
                                          iss.severity === 'ERROR' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                                        )}
                                      >
                                        <span className="font-bold">[{iss.field}]:</span>
                                        <span>{iss.message}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategies Control Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {/* Duplicate Strategy Selector */}
        <Card className="border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-4 space-y-3">
            <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <Copy className="w-4 h-4 text-[#6366F1]" />
              Duplicate Resolution Strategy
            </label>

            <div className="space-y-2">
              {[
                {
                  id: 'SKIP',
                  label: 'SKIP (Recommended)',
                  desc: 'Keep existing record and skip duplicate rows without modification.',
                },
                {
                  id: 'UPDATE',
                  label: 'UPDATE',
                  desc: 'Update mutable demographic and sector fields on existing records.',
                },
                {
                  id: 'APPEND',
                  label: 'APPEND',
                  desc: 'Create an additional distinct record for the duplicate entry.',
                },
              ].map((strat) => (
                <label
                  key={strat.id}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                    duplicateStrategy === strat.id
                      ? 'border-[#6366F1] bg-accent/40 ring-2 ring-primary font-semibold'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="duplicateStrategy"
                    value={strat.id}
                    checked={duplicateStrategy === strat.id}
                    onChange={() => onDuplicateStrategyChange(strat.id as DuplicateStrategy)}
                    className="mt-0.5 text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">{strat.label}</span>
                    <p className="text-[11px] text-muted-foreground font-normal">{strat.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ingestion Mode Selector */}
        <Card className="border-border shadow-xs bg-card rounded-xl">
          <CardContent className="p-4 space-y-3">
            <label className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#6366F1]" />
              Transaction Ingestion Mode
            </label>

            <div className="space-y-2">
              {[
                {
                  id: 'STRICT',
                  label: 'STRICT (Default)',
                  desc: 'Any critical validation failure aborts the affected batch transaction.',
                },
                {
                  id: 'TOLERANT',
                  label: 'TOLERANT',
                  desc: 'Valid rows are committed while invalid rows are skipped and reported.',
                },
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={cn(
                    'flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all',
                    ingestionMode === mode.id
                      ? 'border-[#6366F1] bg-accent/40 ring-2 ring-primary font-semibold'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="ingestionMode"
                    value={mode.id}
                    checked={ingestionMode === mode.id}
                    onChange={() => onIngestionModeChange(mode.id as IngestionMode)}
                    className="mt-0.5 text-[#6366F1] focus:ring-[#6366F1]"
                  />
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">{mode.label}</span>
                    <p className="text-[11px] text-muted-foreground font-normal">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-lg text-xs font-semibold border-border"
        >
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          Back to Mapping
        </Button>

        <Button
          type="button"
          onClick={onProceedToConfirm}
          disabled={isStrictBlocked}
          className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg font-bold px-6 py-2 shadow-xs text-xs flex items-center gap-2"
        >
          Proceed to Confirmation
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
