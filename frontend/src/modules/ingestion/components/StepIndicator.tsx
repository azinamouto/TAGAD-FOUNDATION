import React from 'react';
import { IngestionStep } from '../types';
import { Check, UploadCloud, FileSpreadsheet, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface StepIndicatorProps {
  currentStep: IngestionStep;
}

const STEPS = [
  { id: 1, label: 'Upload CSV', icon: UploadCloud, activeSteps: ['UPLOAD', 'DISCOVERY'] },
  { id: 2, label: 'Schema Mapping', icon: FileSpreadsheet, activeSteps: ['MAPPING'] },
  { id: 3, label: 'Validation Preview', icon: Eye, activeSteps: ['PREVIEW', 'CONFIRM'] },
  { id: 4, label: 'Execution & Summary', icon: CheckCircle2, activeSteps: ['EXECUTING', 'SUCCESS'] },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep }) => {
  const getStepStatus = (stepIndex: number) => {
    const step = STEPS[stepIndex];
    if (step.activeSteps.includes(currentStep)) {
      return 'current';
    }
    // Check if completed:
    if (stepIndex === 0 && ['MAPPING', 'PREVIEW', 'CONFIRM', 'EXECUTING', 'SUCCESS'].includes(currentStep)) return 'completed';
    if (stepIndex === 1 && ['PREVIEW', 'CONFIRM', 'EXECUTING', 'SUCCESS'].includes(currentStep)) return 'completed';
    if (stepIndex === 2 && ['EXECUTING', 'SUCCESS'].includes(currentStep)) return 'completed';
    if (stepIndex === 3 && currentStep === 'SUCCESS') return 'completed';
    return 'upcoming';
  };

  return (
    <nav aria-label="Ingestion Progress" className="w-full py-2">
      <ol className="flex items-center justify-between w-full">
        {STEPS.map((step, index) => {
          const status = getStepStatus(index);
          const Icon = step.icon;

          return (
            <li key={step.id} className="relative flex flex-1 items-center last:flex-none">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all shadow-xs shrink-0',
                    status === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : status === 'current'
                      ? 'bg-[#6366F1] text-white ring-4 ring-primary'
                      : 'bg-muted text-muted-foreground border border-border'
                  )}
                  aria-current={status === 'current' ? 'step' : undefined}
                >
                  {status === 'completed' ? (
                    <Check className="w-4 h-4 stroke-[3]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Step 0{step.id}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold whitespace-nowrap',
                      status === 'current'
                        ? 'text-[#111827]'
                        : status === 'completed'
                        ? 'text-emerald-700'
                        : 'text-muted-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-[2px] mx-4 transition-colors',
                    getStepStatus(index) === 'completed' ? 'bg-emerald-500' : 'bg-background'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
