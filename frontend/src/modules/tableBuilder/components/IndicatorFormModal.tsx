import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  TableIndicatorItem,
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  CreateIndicatorPayload,
  UpdateIndicatorPayload,
} from '../../../types/tableBuilder';
import { createIndicator, updateIndicator } from '../../../api/tableBuilder';
import { toast } from 'sonner';
import { Activity, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface IndicatorFormModalProps {
  isOpen: boolean;
  tableId: string;
  tableCode: string;
  indicator: TableIndicatorItem | null; // null for Create, object for Edit
  onClose: () => void;
  onSuccess: () => void;
}

export const IndicatorFormModal: React.FC<IndicatorFormModalProps> = ({
  isOpen,
  tableId,
  tableCode,
  indicator,
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(indicator);

  const [formData, setFormData] = useState<{
    indicatorCode: string;
    name: string;
    title: string;
    description: string;
    unit: string;
    classification: StatisticalTableClassification;
    formula: string;
    numeratorDefinition: string;
    denominatorDefinition: string;
    verificationStatus: StatisticalVerificationStatus;
  }>({
    indicatorCode: '',
    name: '',
    title: '',
    description: '',
    unit: '%',
    classification: StatisticalTableClassification.INDICATOR,
    formula: '',
    numeratorDefinition: '',
    denominatorDefinition: '',
    verificationStatus: StatisticalVerificationStatus.VERIFIED,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (indicator) {
      setFormData({
        indicatorCode: indicator.indicatorCode || '',
        name: indicator.name || '',
        title: indicator.title || '',
        description: indicator.description || '',
        unit: indicator.unit || '',
        classification: indicator.classification || StatisticalTableClassification.INDICATOR,
        formula: indicator.formula || '',
        numeratorDefinition: indicator.numeratorDefinition || '',
        denominatorDefinition: indicator.denominatorDefinition || '',
        verificationStatus: indicator.verificationStatus || StatisticalVerificationStatus.VERIFIED,
      });
      setErrorMessage(null);
    } else {
      setFormData({
        indicatorCode: '',
        name: '',
        title: '',
        description: '',
        unit: '%',
        classification: StatisticalTableClassification.INDICATOR,
        formula: '',
        numeratorDefinition: '',
        denominatorDefinition: '',
        verificationStatus: StatisticalVerificationStatus.VERIFIED,
      });
      setErrorMessage(null);
    }
  }, [indicator, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Indicator name is required.');
      return;
    }
    if (!formData.title.trim()) {
      setErrorMessage('Indicator title is required.');
      return;
    }
    if (!isEditing && !formData.indicatorCode.trim()) {
      setErrorMessage('Indicator code is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isEditing && indicator) {
        const updatePayload: UpdateIndicatorPayload = {
          name: formData.name.trim(),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          unit: formData.unit.trim() || null,
          classification: formData.classification,
          formula: formData.formula.trim() || null,
          numeratorDefinition: formData.numeratorDefinition.trim() || null,
          denominatorDefinition: formData.denominatorDefinition.trim() || null,
          verificationStatus: formData.verificationStatus,
        };

        await updateIndicator(indicator.id, updatePayload);
        toast.success(`Indicator "${indicator.indicatorCode}" updated successfully.`);
      } else {
        const createPayload: CreateIndicatorPayload = {
          indicatorCode: formData.indicatorCode.trim().toUpperCase(),
          name: formData.name.trim(),
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          unit: formData.unit.trim() || null,
          classification: formData.classification,
          formula: formData.formula.trim() || null,
          numeratorDefinition: formData.numeratorDefinition.trim() || null,
          denominatorDefinition: formData.denominatorDefinition.trim() || null,
          verificationStatus: formData.verificationStatus,
        };

        await createIndicator(tableId, createPayload);
        toast.success(`Indicator "${createPayload.indicatorCode}" created successfully.`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Indicator operation failed:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to save indicator definition.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? `Edit Indicator — ${indicator?.indicatorCode}` : `Add Analytical Indicator to ${tableCode}`}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Define computed gender metrics, formulas, units, and methodological definitions.
              </p>
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Indicator Code & Classification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ind-code" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Indicator Code <span className="text-rose-500">*</span>
              </Label>
              <Input
                id="ind-code"
                placeholder="e.g. IND_SOLO_PARENT_FEMALE_PCT"
                value={formData.indicatorCode}
                onChange={(e) => setFormData({ ...formData, indicatorCode: e.target.value })}
                disabled={isEditing}
                required
                className="text-xs font-mono uppercase"
              />
              {isEditing && (
                <p className="text-[10px] text-slate-500">Indicator code is permanent once assigned.</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Classification
              </Label>
              <Select
                value={formData.classification}
                onValueChange={(val: any) =>
                  setFormData({ ...formData, classification: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatisticalTableClassification.INDICATOR} className="text-xs">
                    Analytical Indicator
                  </SelectItem>
                  <SelectItem value={StatisticalTableClassification.DERIVED_METRIC} className="text-xs">
                    Derived Metric
                  </SelectItem>
                  <SelectItem value={StatisticalTableClassification.AGGREGATED_STATISTICS} className="text-xs">
                    Aggregated Statistics
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Name & Title */}
          <div className="space-y-1">
            <Label htmlFor="ind-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Short Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="ind-name"
              placeholder="e.g. Female Solo Parent Ratio"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="ind-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Full Official Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="ind-title"
              placeholder="e.g. Percentage of Female-Headed Solo Parent Households to Total Solo Parents"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          {/* Unit & Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ind-unit" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Measurement Unit
              </Label>
              <Input
                id="ind-unit"
                placeholder="e.g. %, Ratio, Index, PHP"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Verification Status
              </Label>
              <Select
                value={formData.verificationStatus}
                onValueChange={(val: any) =>
                  setFormData({ ...formData, verificationStatus: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatisticalVerificationStatus.VERIFIED} className="text-xs">
                    VERIFIED (PSA Canonical Standard)
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.PROVISIONAL} className="text-xs">
                    PROVISIONAL (LGU Defined)
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.UNVERIFIED} className="text-xs">
                    UNVERIFIED
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Formula */}
          <div className="space-y-1">
            <Label htmlFor="ind-formula" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Mathematical Formula
            </Label>
            <Input
              id="ind-formula"
              placeholder="e.g. (Female Solo Parents / Total Solo Parents) * 100"
              value={formData.formula}
              onChange={(e) => setFormData({ ...formData, formula: e.target.value })}
              className="text-xs font-mono"
            />
          </div>

          {/* Numerator & Denominator definitions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ind-num" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Numerator Definition
              </Label>
              <textarea
                id="ind-num"
                rows={2}
                placeholder="e.g. Count of female solo parents registered under RA 8972"
                value={formData.numeratorDefinition}
                onChange={(e) =>
                  setFormData({ ...formData, numeratorDefinition: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="ind-den" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Denominator Definition
              </Label>
              <textarea
                id="ind-den"
                rows={2}
                placeholder="e.g. Total count of registered solo parents in barangay"
                value={formData.denominatorDefinition}
                onChange={(e) =>
                  setFormData({ ...formData, denominatorDefinition: e.target.value })
                }
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="ind-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Methodological Description
            </Label>
            <textarea
              id="ind-desc"
              rows={2}
              placeholder="Provide policy context, analytical interpretation, and target thresholds..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Saving...
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Add Indicator'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
