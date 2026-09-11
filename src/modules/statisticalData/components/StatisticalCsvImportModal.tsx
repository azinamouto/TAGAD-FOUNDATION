import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  TableDefinitionItem,
  DatasetItem,
} from '../../../types/statisticalData';
import {
  discoverStatisticalCsv,
  previewStatisticalCsv,
  executeStatisticalCsv,
} from '../../../api/statisticalData';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Check,
  Info,
  ShieldCheck,
  Lock,
} from 'lucide-react';

export interface StatisticalCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: TableDefinitionItem;
  dataset: DatasetItem | null;
  onSuccess: () => void;
}

type Step = 'UPLOAD' | 'DISCOVERY' | 'MAPPING' | 'PREVIEW' | 'EXECUTING' | 'SUCCESS';

export const StatisticalCsvImportModal: React.FC<StatisticalCsvImportModalProps> = ({
  isOpen,
  onClose,
  table,
  dataset,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [filename, setFilename] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Discovery & Configuration state
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [ingestionMode, setIngestionMode] = useState<'RECORD_PER_ROW' | 'MEASURE_COLUMNS'>('RECORD_PER_ROW');
  const [duplicateStrategy, setDuplicateStrategy] = useState<'REJECT' | 'SKIP' | 'OVERWRITE'>('REJECT');

  // Mappings
  const [periodColumn, setPeriodColumn] = useState('');
  const [barangayColumn, setBarangayColumn] = useState('');
  const [numericValueColumn, setNumericValueColumn] = useState('');
  const [selectedIndicatorId, setSelectedIndicatorId] = useState('');
  const [dimensionMappings, setDimensionMappings] = useState<Record<string, { sourceColumn?: string; constantValue?: string }>>({});

  // Preview & Execution state
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [executionSummary, setExecutionSummary] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('UPLOAD');
    setFilename('');
    setCsvContent('');
    setLoading(false);
    setErrorMessage(null);
    setDiscoveryResult(null);
    setIngestionMode('RECORD_PER_ROW');
    setDuplicateStrategy('REJECT');
    setPeriodColumn('');
    setBarangayColumn('');
    setNumericValueColumn('');
    setSelectedIndicatorId(table.indicators?.[0]?.id || '');
    setDimensionMappings({});
    setPreviewResult(null);
    setExecutionSummary(null);
  };

  const handleModalClose = () => {
    resetState();
    onClose();
  };

  // Step 1: File selection & upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a standard .csv file');
      return;
    }

    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text || text.trim().length === 0) {
        toast.error('The selected CSV file is empty');
        return;
      }
      setCsvContent(text);
      await runDiscovery(text, file.name);
    };
    reader.onerror = () => {
      toast.error('Failed to read CSV file');
    };
    reader.readAsText(file);
  };

  // Step 2: Discovery call
  const runDiscovery = async (rawCsv: string, name: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await discoverStatisticalCsv({
        csvContent: rawCsv,
        filename: name,
        tableId: table.id,
        datasetId: dataset?.id,
      });

      setDiscoveryResult(result);

      // Auto-apply candidate mappings
      const candidates = result.candidateMappings || {};
      if (candidates.period?.sourceColumn) {
        setPeriodColumn(candidates.period.sourceColumn);
      } else if (result.headers?.length > 0) {
        setPeriodColumn(result.headers[0]);
      }

      if (candidates.barangay?.sourceColumn) {
        setBarangayColumn(candidates.barangay.sourceColumn);
      } else {
        const brgyHeader = result.headers?.find((h: string) => h.toLowerCase().includes('barangay') || h.toLowerCase().includes('brgy'));
        if (brgyHeader) setBarangayColumn(brgyHeader);
      }

      if (candidates.numericValueColumn?.sourceColumn) {
        setNumericValueColumn(candidates.numericValueColumn.sourceColumn);
      } else {
        const valHeader = result.headers?.find((h: string) => h.toLowerCase().includes('value') || h.toLowerCase().includes('count') || h.toLowerCase().includes('total'));
        if (valHeader) setNumericValueColumn(valHeader);
      }

      // Default first indicator
      if (table.indicators && table.indicators.length > 0) {
        setSelectedIndicatorId(table.indicators[0].id);
      }

      // Dimensions candidate mappings
      const dimMaps: Record<string, { sourceColumn?: string; constantValue?: string }> = {};
      const bindings = table.dimensionBindings || [];
      bindings.forEach((binding: any) => {
        const dimCode = binding.dimensionCode;
        if (candidates.dimensions?.[dimCode]?.sourceColumn) {
          dimMaps[dimCode] = { sourceColumn: candidates.dimensions[dimCode].sourceColumn };
        } else {
          // Check if header contains dim code
          const matchedHeader = result.headers?.find((h: string) => h.toLowerCase().includes(dimCode.toLowerCase().replace('dim_', '')));
          if (matchedHeader) {
            dimMaps[dimCode] = { sourceColumn: matchedHeader };
          }
        }
      });
      setDimensionMappings(dimMaps);

      setStep('MAPPING');
    } catch (err: any) {
      console.error('Discovery failed:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Failed to analyze CSV structure.';
      setErrorMessage(msg);
      toast.error(msg);
      setStep('UPLOAD');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Run Preview
  const handleProceedToPreview = async () => {
    if (!csvContent) return;

    if (!periodColumn) {
      toast.error('Please map the Reporting Period column');
      return;
    }

    if (!barangayColumn) {
      toast.error('Please map the Barangay column');
      return;
    }

    if (ingestionMode === 'RECORD_PER_ROW' && !numericValueColumn) {
      toast.error('Please map the Numeric Value column');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const mappingConfig: any = {
      period: { sourceColumn: periodColumn },
      barangay: { sourceColumn: barangayColumn },
      dimensions: dimensionMappings,
    };

    if (ingestionMode === 'RECORD_PER_ROW') {
      mappingConfig.numericValueColumn = numericValueColumn;
      if (selectedIndicatorId) {
        mappingConfig.indicator = { constantIndicatorId: selectedIndicatorId };
      }
    } else {
      // In MEASURE_COLUMNS mode
      const measureColumns = (table.indicators || []).map((ind: any) => ({
        columnName: ind.indicatorCode,
        indicatorId: ind.id,
      }));
      mappingConfig.measureColumns = measureColumns;
    }

    try {
      const preview = await previewStatisticalCsv({
        csvContent,
        filename,
        tableId: table.id,
        datasetId: dataset?.id,
        ingestionMode,
        mapping: mappingConfig,
        duplicateStrategy,
      });

      setPreviewResult(preview);
      setStep('PREVIEW');
    } catch (err: any) {
      console.error('Preview failed:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Validation preview failed.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Execute Transactional Import
  const handleExecute = async () => {
    if (!csvContent || !dataset) return;

    setLoading(true);
    setErrorMessage(null);
    setStep('EXECUTING');

    const mappingConfig: any = {
      period: { sourceColumn: periodColumn },
      barangay: { sourceColumn: barangayColumn },
      dimensions: dimensionMappings,
    };

    if (ingestionMode === 'RECORD_PER_ROW') {
      mappingConfig.numericValueColumn = numericValueColumn;
      if (selectedIndicatorId) {
        mappingConfig.indicator = { constantIndicatorId: selectedIndicatorId };
      }
    } else {
      const measureColumns = (table.indicators || []).map((ind: any) => ({
        columnName: ind.indicatorCode,
        indicatorId: ind.id,
      }));
      mappingConfig.measureColumns = measureColumns;
    }

    try {
      const summary = await executeStatisticalCsv({
        csvContent,
        filename,
        tableId: table.id,
        datasetId: dataset.id,
        ingestionMode,
        mapping: mappingConfig,
        duplicateStrategy,
        methodologyNotes: `Imported via Web Ingestion UI into table ${table.tableCode}`,
      });

      setExecutionSummary(summary);
      setStep('SUCCESS');
      toast.success(`Successfully imported ${summary.insertedCount} observations!`);
      onSuccess();
    } catch (err: any) {
      console.error('Execution failed:', err);
      const msg = err.response?.data?.error?.message || err.message || 'Import execution failed.';
      setErrorMessage(msg);
      toast.error(msg);
      setStep('PREVIEW');
    } finally {
      setLoading(false);
    }
  };

  const headers = discoveryResult?.headers || [];
  const dimBindings = table.dimensionBindings || [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900">
        {/* Header */}
        <DialogHeader className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Import Statistical Observations from CSV</span>
              </DialogTitle>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <span>Table: <strong className="text-slate-700 dark:text-slate-300 font-mono">{table.tableCode}</strong></span>
                <span>•</span>
                <span>Dataset: <strong className="text-slate-700 dark:text-slate-300">{dataset?.name || 'None selected'}</strong></span>
                {dataset?.publicationStatus && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono">
                    {dataset.publicationStatus}
                  </Badge>
                )}
              </div>
            </div>

            {/* Stepper Pill Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <span className={`px-2 py-0.5 rounded-full ${step === 'UPLOAD' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>1. Upload</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 'MAPPING' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>2. Map</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 'PREVIEW' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>3. Preview</span>
              <span className={`px-2 py-0.5 rounded-full ${step === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>4. Done</span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Import Issue</p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              {!dataset ? (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
                  <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="font-semibold">No Target Dataset Selected</p>
                    <p>Please select an editable draft dataset before importing statistical observations.</p>
                  </div>
                </div>
              ) : dataset.publicationStatus === 'OFFICIAL' || dataset.publicationStatus === 'PUBLISHED' ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs">
                  <Lock className="w-5 h-5 shrink-0 text-rose-600" />
                  <div>
                    <p className="font-semibold">Dataset is Locked ({dataset.publicationStatus})</p>
                    <p>Datasets in OFFICIAL or PUBLISHED status are immutable. Please choose a DRAFT dataset to import new records.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/50 hover:bg-indigo-50/20"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Click to upload or drag & drop CSV file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports comma-separated CSV with headers (e.g. Year, Barangay, Sex, Count)
                    </p>
                  </div>

                  {/* Sample Format Guide */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-500" />
                      Expected CSV Columns for Table {table.tableCode}:
                    </p>
                    <div className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto text-[11px]">
                      Year,Barangay,{dimBindings.map((b: any) => b.dimensionCode.replace('DIM_', '')).join(',')},Value
                      <br />
                      2024,Poblacion,{dimBindings.map((b: any) => (b.allowedValues?.[0] || 'MALE')).join(',')},1250
                      <br />
                      2024,San Roque,{dimBindings.map((b: any) => (b.allowedValues?.[1] || 'FEMALE')).join(',')},980
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: MAPPING */}
          {step === 'MAPPING' && discoveryResult && (
            <div className="space-y-6">
              {/* File summary pill */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{filename}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {discoveryResult.totalRows} data rows
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {discoveryResult.totalColumns} columns
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setStep('UPLOAD')}
                  className="h-7 text-xs text-slate-500"
                >
                  Change File
                </Button>
              </div>

              {/* Mode & Strategy Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Ingestion Mode</Label>
                  <Select
                    value={ingestionMode}
                    onValueChange={(val: any) => setIngestionMode(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RECORD_PER_ROW" className="text-xs">
                        Record per Row (1 row = 1 observation)
                      </SelectItem>
                      <SelectItem value="MEASURE_COLUMNS" className="text-xs">
                        Measure Columns (Unpivot multiple metrics)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Duplicate Coordinate Strategy</Label>
                  <Select
                    value={duplicateStrategy}
                    onValueChange={(val: any) => setDuplicateStrategy(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REJECT" className="text-xs">
                        REJECT (Strict error on collision)
                      </SelectItem>
                      <SelectItem value="SKIP" className="text-xs">
                        SKIP (Keep existing, ignore duplicate)
                      </SelectItem>
                      <SelectItem value="OVERWRITE" className="text-xs">
                        OVERWRITE (Update existing record)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Column Mapping Form */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Target Coordinate Mappings
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Period */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Reporting Period / Year Column *</Label>
                    <Select value={periodColumn} onValueChange={setPeriodColumn}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h: string) => (
                          <SelectItem key={h} value={h} className="text-xs">
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Barangay */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Barangay Column *</Label>
                    <Select value={barangayColumn} onValueChange={setBarangayColumn}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select column..." />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h: string) => (
                          <SelectItem key={h} value={h} className="text-xs">
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Numeric Value (in RECORD_PER_ROW mode) */}
                  {ingestionMode === 'RECORD_PER_ROW' && (
                    <>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Numeric Value Column *</Label>
                        <Select value={numericValueColumn} onValueChange={setNumericValueColumn}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select column..." />
                          </SelectTrigger>
                          <SelectContent>
                            {headers.map((h: string) => (
                              <SelectItem key={h} value={h} className="text-xs">
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Target Indicator</Label>
                        <Select value={selectedIndicatorId} onValueChange={setSelectedIndicatorId}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select indicator..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(table.indicators || []).map((ind: any) => (
                              <SelectItem key={ind.id} value={ind.id} className="text-xs">
                                {ind.name || ind.title} ({ind.indicatorCode})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {/* Dimension Mappings */}
                {dimBindings.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Table Dimension Vocabulary Mappings:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {dimBindings.map((binding: any) => {
                        const dimCode = binding.dimensionCode;
                        const currentMapping = dimensionMappings[dimCode]?.sourceColumn || '';
                        return (
                          <div key={dimCode} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {dimCode}
                              </span>
                              {binding.allowedValues && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  [{binding.allowedValues.join(', ')}]
                                </span>
                              )}
                            </div>
                            <Select
                              value={currentMapping}
                              onValueChange={(val) => {
                                setDimensionMappings((prev) => ({
                                  ...prev,
                                  [dimCode]: { sourceColumn: val },
                                }));
                              }}
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue placeholder="Select CSV column..." />
                              </SelectTrigger>
                              <SelectContent>
                                {headers.map((h: string) => (
                                  <SelectItem key={h} value={h} className="text-xs">
                                    {h}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW MATRIX */}
          {step === 'PREVIEW' && previewResult && (
            <div className="space-y-4">
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-lg text-center">
                  <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                  <p className="text-lg font-black text-slate-900 dark:text-slate-100">{previewResult.totalRows}</p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Valid Rows</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{previewResult.validRows}</p>
                </div>

                <div className={`p-3 rounded-lg border text-center ${previewResult.invalidRows > 0 ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'}`}>
                  <p className="text-xs text-slate-500 font-medium">Invalid Rows</p>
                  <p className={`text-lg font-black ${previewResult.invalidRows > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}`}>
                    {previewResult.invalidRows}
                  </p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Collisions</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                    {previewResult.duplicateRowsWithinFile + previewResult.existingCoordinateCollisions}
                  </p>
                </div>
              </div>

              {/* Blocking Errors Alert */}
              {previewResult.blockingErrors?.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Duplicate Coordinate Collisions (REJECT Strategy Active)
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                    {previewResult.blockingErrors.slice(0, 5).map((err: string, idx: number) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview Rows Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0">
                      <tr>
                        <th className="p-2.5">Row</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Period</th>
                        <th className="p-2.5">Barangay</th>
                        <th className="p-2.5">Value</th>
                        <th className="p-2.5">Dimensions</th>
                        <th className="p-2.5">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {(previewResult.rows || []).slice(0, 50).map((row: any) => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2.5 font-mono text-slate-500">#{row.rowNumber}</td>
                          <td className="p-2.5">
                            {row.status === 'VALID' ? (
                              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[10px]">
                                VALID
                              </Badge>
                            ) : row.status === 'INVALID' ? (
                              <Badge className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 text-[10px]">
                                INVALID
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 text-[10px]">
                                {row.status}
                              </Badge>
                            )}
                          </td>
                          <td className="p-2.5 font-mono">{row.coordinate?.period || '—'}</td>
                          <td className="p-2.5 font-medium">{row.coordinate?.barangayName || (row.coordinate?.barangayId === null ? 'Talibon (Municipal)' : '—')}</td>
                          <td className="p-2.5 font-mono font-semibold">{row.numericValue !== null ? row.numericValue : '—'}</td>
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">
                            {JSON.stringify(row.coordinate?.dimensions || {})}
                          </td>
                          <td className="p-2.5 text-[11px] text-rose-600 dark:text-rose-400">
                            {row.errors?.join('; ') || 'OK'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: EXECUTING */}
          {step === 'EXECUTING' && (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Executing Transactional Import...
              </p>
              <p className="text-xs text-slate-500 max-w-sm">
                Generating provenance tracking, writing observations, and committing audit trail events safely.
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 'SUCCESS' && executionSummary && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Statistical Import Completed!
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All observations have been committed to dataset <strong className="font-mono text-slate-700 dark:text-slate-300">{executionSummary.datasetCode}</strong>.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 w-full max-w-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs">
                <div>
                  <p className="text-slate-500">Inserted</p>
                  <p className="text-lg font-black text-emerald-600">{executionSummary.insertedCount}</p>
                </div>
                <div>
                  <p className="text-slate-500">Updated</p>
                  <p className="text-lg font-black text-indigo-600">{executionSummary.updatedCount}</p>
                </div>
                <div>
                  <p className="text-slate-500">Skipped</p>
                  <p className="text-lg font-black text-amber-600">{executionSummary.skippedCount}</p>
                </div>
              </div>

              {executionSummary.provenanceId && (
                <p className="text-[11px] font-mono text-slate-400">
                  Provenance ID: {executionSummary.provenanceId}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-row items-center justify-between">
          <div>
            {step === 'MAPPING' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('UPLOAD')}
                disabled={loading}
                className="h-8 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            )}

            {step === 'PREVIEW' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep('MAPPING')}
                disabled={loading}
                className="h-8 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Edit Mapping
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleModalClose}
              disabled={loading && step === 'EXECUTING'}
              className="h-8 text-xs"
            >
              {step === 'SUCCESS' ? 'Close' : 'Cancel'}
            </Button>

            {step === 'MAPPING' && (
              <Button
                size="sm"
                onClick={handleProceedToPreview}
                disabled={loading}
                className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5 mr-1" />}
                Generate Preview
              </Button>
            )}

            {step === 'PREVIEW' && (
              <Button
                size="sm"
                onClick={handleExecute}
                disabled={
                  loading ||
                  previewResult?.invalidRows > 0 ||
                  previewResult?.blockingErrors?.length > 0 ||
                  !dataset
                }
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                Confirm & Import Observations ({previewResult?.validRows || 0})
              </Button>
            )}

            {step === 'SUCCESS' && (
              <Button
                size="sm"
                onClick={handleModalClose}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Done
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
