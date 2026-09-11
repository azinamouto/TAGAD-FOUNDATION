import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { CreateDatasetPayload, DatasetItem } from '../../../types/statisticalData';
import { createDataset } from '../../../api/statisticalData';
import { toast } from 'sonner';
import { Loader2, Database, AlertCircle } from 'lucide-react';

interface CreateDatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (dataset: DatasetItem) => void;
  defaultYear?: number;
}

export const CreateDatasetModal: React.FC<CreateDatasetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultYear = new Date().getFullYear(),
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateDatasetPayload>({
    datasetCode: `DS-${defaultYear}-DRAFT`,
    name: `${defaultYear} Municipal Statistical Survey (Draft)`,
    description: 'Working dataset for municipal statistical table data encoding.',
    sourceAgency: 'Municipal Planning and Development Coordinator (MPDC)',
    reportingYear: defaultYear,
    reportingPeriod: 'ANNUAL',
    surveyRound: 'Round 1',
    geographicLevel: 'MUNICIPALITY',
  });

  const handleChange = (field: keyof CreateDatasetPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.datasetCode.trim() || !formData.name.trim()) {
      setError('Dataset code and name are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newDataset = await createDataset({
        ...formData,
        reportingYear: formData.reportingYear ? Number(formData.reportingYear) : undefined,
      });
      toast.success(`Dataset "${newDataset.name}" created successfully in DRAFT state.`);
      onSuccess(newDataset);
      onClose();
    } catch (err: any) {
      console.error('Failed to create dataset:', err);
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create dataset. Please check validation rules.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Create New Statistical Dataset</DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Create a new DRAFT dataset container for statistical observation encoding.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Dataset Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={formData.datasetCode}
                onChange={(e) => handleChange('datasetCode', e.target.value)}
                placeholder="e.g. CBMS-2024-DEMOG"
                required
                className="h-9 text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reporting Year</Label>
              <Input
                type="number"
                value={formData.reportingYear || ''}
                onChange={(e) => handleChange('reportingYear', e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g. 2024"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Dataset Name / Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g. 2024 Municipal GAD Statistical Baseline"
              required
              className="h-9 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Source Agency / Office</Label>
              <Input
                value={formData.sourceAgency || ''}
                onChange={(e) => handleChange('sourceAgency', e.target.value)}
                placeholder="e.g. MPDC / MSWDO / MHO"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reporting Period</Label>
              <Input
                value={formData.reportingPeriod || ''}
                onChange={(e) => handleChange('reportingPeriod', e.target.value)}
                placeholder="e.g. ANNUAL, Q1, 2024"
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Description / Scope</Label>
            <Input
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Optional notes or methodological context"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
              Create DRAFT Dataset
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
