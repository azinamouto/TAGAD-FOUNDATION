import React from 'react';
import { Loader2, Database, ShieldCheck } from 'lucide-react';

export const ExecutionStep: React.FC = () => {
  return (
    <div className="py-12 px-6 text-center space-y-6">
      <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border-4 border-primary animate-pulse" />
        <div className="w-16 h-16 rounded-full bg-[#6366F1] text-white flex items-center justify-center shadow-lg">
          <Database className="w-8 h-8 animate-bounce" />
        </div>
      </div>

      <div className="space-y-2 max-w-md mx-auto">
        <h3 className="text-xl font-bold text-[#111827]">Processing Batch Ingestion...</h3>
        <p className="text-xs text-[#6B7280]">
          Your dataset is being validated and written in atomic database transaction chunks.
        </p>
      </div>

      {/* Indeterminate Animated Progress Bar */}
      <div className="max-w-md mx-auto space-y-2">
        <div className="h-2 w-full bg-accent rounded-full overflow-hidden relative">
          <div className="h-full bg-[#6366F1] rounded-full w-1/3 animate-[indeterminate_1.5s_infinite_linear]" />
        </div>
        <p className="text-[11px] text-[#4F46E5] font-semibold flex items-center justify-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Synchronizing records with Talibon reference registries...
        </p>
      </div>

      <div className="bg-muted border border-border rounded-xl p-3.5 max-w-sm mx-auto flex items-center gap-2 text-[11px] text-muted-foreground justify-center">
        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>Atomic rollback safety & zero-PII audit trail active</span>
      </div>
    </div>
  );
};
