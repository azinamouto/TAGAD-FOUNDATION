import React, { useState, useEffect } from 'react';
import {
  IngestionStep,
  IngestionDatasetType,
  DuplicateStrategy,
  IngestionMode,
  CsvDiscoveryResult,
  IngestionPreviewResult,
  IngestionExecutionSummary,
  ReferenceOffice,
} from '../types';
import { ingestionApi } from '../ingestionApi';
import { StepIndicator } from './StepIndicator';
import { UploadStep } from './UploadStep';
import { MappingStep } from './MappingStep';
import { PreviewStep } from './PreviewStep';
import { ConfirmationStep } from './ConfirmationStep';
import { ExecutionStep } from './ExecutionStep';
import { SummaryStep } from './SummaryStep';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole?: string;
  userOfficeName?: string | null;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  userRole = 'ENCODER',
  userOfficeName,
}) => {
  // Wizard State Machine
  const [step, setStep] = useState<IngestionStep>('UPLOAD');

  // CSV Ingestion State (in-memory only; no localStorage / sessionStorage persistence)
  const [filename, setFilename] = useState<string>('dataset.csv');
  const [rawCsvContent, setRawCsvContent] = useState<string | null>(null);
  const [datasetType, setDatasetType] = useState<IngestionDatasetType>('BENEFICIARY_REGISTRY');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('SKIP');
  const [ingestionMode, setIngestionMode] = useState<IngestionMode>('STRICT');
  const [targetOfficeId, setTargetOfficeId] = useState<string | null>(null);

  // Reference data
  const [offices, setOffices] = useState<ReferenceOffice[]>([]);

  // Async API Results
  const [discoveryResult, setDiscoveryResult] = useState<CsvDiscoveryResult | null>(null);
  const [previewResult, setPreviewResult] = useState<IngestionPreviewResult | null>(null);
  const [executionSummary, setExecutionSummary] = useState<IngestionExecutionSummary | null>(null);

  // Loading and Error States
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  // Load reference offices on mount if admin
  useEffect(() => {
    if (isOpen) {
      ingestionApi.getOffices().then(setOffices).catch(() => {});
    }
  }, [isOpen]);

  // Clean reset of all transient state
  const resetAllState = () => {
    setStep('UPLOAD');
    setFilename('dataset.csv');
    setRawCsvContent(null);
    setDatasetType('BENEFICIARY_REGISTRY');
    setMappings({});
    setDuplicateStrategy('SKIP');
    setIngestionMode('STRICT');
    setTargetOfficeId(null);
    setDiscoveryResult(null);
    setPreviewResult(null);
    setExecutionSummary(null);
    setIsLoading(false);
    setErrorMessage(null);
    setIsForbidden(false);
  };

  const handleModalClose = () => {
    if (step === 'EXECUTING') {
      toast.warning('Ingestion is currently executing. Please wait for completion.');
      return;
    }
    resetAllState();
    onClose();
  };

  const handleSuccessClose = () => {
    resetAllState();
    onSuccess();
    onClose();
  };

  // STEP 1 -> 2: Upload to Discovery
  const handleFileLoaded = async (file: File, csvContent: string) => {
    setFilename(file.name);
    setRawCsvContent(csvContent);
    setIsLoading(true);
    setErrorMessage(null);
    setIsForbidden(false);
    setStep('DISCOVERY');

    try {
      const discovery = await ingestionApi.discoverSchema(csvContent, file.name);
      setDiscoveryResult(discovery);

      // Auto-set dataset type guess
      if (
        discovery.summary.datasetTypeGuess &&
        discovery.summary.datasetTypeGuess !== 'UNKNOWN'
      ) {
        setDatasetType(discovery.summary.datasetTypeGuess as IngestionDatasetType);
      } else {
        setDatasetType('BENEFICIARY_REGISTRY');
      }

      // Populate initial mappings from discovered schema
      const initialMap: Record<string, string> = {};
      discovery.schemaMapping.forEach((m) => {
        if (m.tagadDestinationField) {
          initialMap[m.sourceColumn] = m.tagadDestinationField;
        }
      });
      // For any columns not in schemaMapping, check column profile
      discovery.rawHeaders.forEach((h) => {
        if (!initialMap[h]) {
          const colProf = discovery.columns[h];
          if (colProf?.inferredTargetField) {
            initialMap[h] = colProf.inferredTargetField;
          } else {
            initialMap[h] = '__IGNORE__';
          }
        }
      });

      setMappings(initialMap);
      setStep('MAPPING');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsForbidden(true);
        setErrorMessage('You do not have permission to perform CSV schema discovery.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to profile dataset schema. Please check CSV formatting.';
        setErrorMessage(msg);
      }
      setStep('UPLOAD');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 -> 3: Mapping to Preview
  const handleProceedToPreview = async () => {
    if (!rawCsvContent) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formattedMappings = Object.entries(mappings).map(([sourceColumn, targetField]) => ({
        sourceColumn,
        targetField: String(targetField),
      }));

      const preview = await ingestionApi.generatePreview({
        csvContent: rawCsvContent,
        filename,
        datasetType,
        confirmedMappings: formattedMappings,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId,
      });

      setPreviewResult(preview);
      setStep('PREVIEW');
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsForbidden(true);
        setErrorMessage('You do not have permission to perform ingestion preview.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Failed to generate validation preview matrix.';
        setErrorMessage(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3 -> 4: Preview to Confirmation
  const handleProceedToConfirm = () => {
    setStep('CONFIRM');
  };

  // STEP 4: Execute Ingestion
  const handleExecute = async () => {
    if (!rawCsvContent) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStep('EXECUTING');

    try {
      const formattedMappings = Object.entries(mappings).map(([sourceColumn, targetField]) => ({
        sourceColumn,
        targetField: String(targetField),
      }));

      const summary = await ingestionApi.executeIngestion({
        csvContent: rawCsvContent,
        filename,
        datasetType,
        confirmedMappings: formattedMappings,
        duplicateStrategy,
        ingestionMode,
        targetOfficeId,
      });

      setExecutionSummary(summary);
      setStep('SUCCESS');
      toast.success(`Successfully ingested ${summary.insertedCount} records!`);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setIsForbidden(true);
        setErrorMessage('You do not have permission to perform CSV ingestion.');
      } else {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Ingestion transaction failed. Rolled back state safely.';
        setErrorMessage(msg);
        toast.error(msg);
      }
      setStep('ERROR');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (sourceCol: string, targetField: string) => {
    setMappings((prev) => ({
      ...prev,
      [sourceCol]: targetField,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8 border-border shadow-2xl bg-card">
        {/* Modal Header with Step Indicator */}
        <DialogHeader className="space-y-4 pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-[#111827]">
                TAGAD Batch Ingestion Wizard
              </DialogTitle>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Standardized multi-stage ingestion pipeline with Talibon reference validation & audit tracking.
              </p>
            </div>
          </div>

          <StepIndicator currentStep={step} />
        </DialogHeader>

        {/* Global Error Banner */}
        {errorMessage && step !== 'UPLOAD' && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs mt-4"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-900">
                {isForbidden ? 'Authorization Notice (403)' : 'Ingestion Pipeline Error'}
              </p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Wizard Steps Rendering */}
        <div className="py-4">
          {/* STEP 1: UPLOAD & DISCOVERY */}
          {(step === 'UPLOAD' || step === 'DISCOVERY') && (
            <UploadStep
              onFileLoaded={handleFileLoaded}
              isDiscovering={isLoading}
              discoveryError={errorMessage}
              onClearError={() => setErrorMessage(null)}
            />
          )}

          {/* STEP 2: SCHEMA MAPPING */}
          {step === 'MAPPING' && discoveryResult && (
            <MappingStep
              discovery={discoveryResult}
              datasetType={datasetType}
              onDatasetTypeChange={setDatasetType}
              mappings={mappings}
              onMappingChange={handleMappingChange}
              offices={offices}
              targetOfficeId={targetOfficeId}
              onTargetOfficeChange={setTargetOfficeId}
              userRole={userRole}
              userOfficeName={userOfficeName}
              onBack={() => setStep('UPLOAD')}
              onProceedToPreview={handleProceedToPreview}
              isPreviewing={isLoading}
            />
          )}

          {/* STEP 3: VALIDATION PREVIEW */}
          {step === 'PREVIEW' && previewResult && (
            <PreviewStep
              preview={previewResult}
              duplicateStrategy={duplicateStrategy}
              onDuplicateStrategyChange={setDuplicateStrategy}
              ingestionMode={ingestionMode}
              onIngestionModeChange={setIngestionMode}
              onBack={() => setStep('MAPPING')}
              onProceedToConfirm={handleProceedToConfirm}
            />
          )}

          {/* STEP 4A: PRE-EXECUTION CONFIRMATION */}
          {step === 'CONFIRM' && previewResult && (
            <ConfirmationStep
              preview={previewResult}
              datasetType={datasetType}
              duplicateStrategy={duplicateStrategy}
              ingestionMode={ingestionMode}
              targetOfficeName={
                targetOfficeId
                  ? offices.find((o) => o.id === targetOfficeId)?.name
                  : userOfficeName
              }
              onBack={() => setStep('PREVIEW')}
              onExecute={handleExecute}
              isExecuting={isLoading}
            />
          )}

          {/* STEP 4B: EXECUTING SPINNER */}
          {step === 'EXECUTING' && <ExecutionStep />}

          {/* STEP 4C: SUMMARY RESULT */}
          {step === 'SUCCESS' && executionSummary && (
            <SummaryStep
              summary={executionSummary}
              onReset={resetAllState}
              onClose={handleSuccessClose}
            />
          )}

          {/* ERROR STATE WITH RETRY / RESET */}
          {step === 'ERROR' && (
            <div className="py-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="text-lg font-bold text-red-900">Ingestion Execution Failed</h4>
                <p className="text-xs text-muted-foreground">
                  {errorMessage || 'The database transaction could not be completed.'}
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStep('CONFIRM')}
                  className="rounded-lg text-xs font-semibold border-border"
                >
                  Back to Confirmation
                </Button>
                <Button
                  type="button"
                  onClick={resetAllState}
                  className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg text-xs font-bold gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset and Upload Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
