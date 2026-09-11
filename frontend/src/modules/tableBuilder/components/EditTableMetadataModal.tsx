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
  TableDefinitionItem,
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  UpdateTablePayload,
} from '../../../types/tableBuilder';
import { updateTable } from '../../../api/tableBuilder';
import { toast } from 'sonner';
import { Edit3, Loader2, ShieldCheck, Lock } from 'lucide-react';

interface EditTableMetadataModalProps {
  isOpen: boolean;
  table: TableDefinitionItem | null;
  onClose: () => void;
  onSuccess: (updated: TableDefinitionItem) => void;
}

export const EditTableMetadataModal: React.FC<EditTableMetadataModalProps> = ({
  isOpen,
  table,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<UpdateTablePayload>({
    title: '',
    domain: '',
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: '',
    expectedUnit: '',
    rowGrain: '',
    dimensionsSummary: '',
    measureStructure: '',
    sourceFormat: '',
    verificationStatus: StatisticalVerificationStatus.UNVERIFIED,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (table) {
      setFormData({
        title: table.title || '',
        domain: table.domain || '',
        classification: table.classification || StatisticalTableClassification.AGGREGATED_STATISTICS,
        description: table.description || '',
        expectedUnit: table.expectedUnit || '',
        rowGrain: table.rowGrain || '',
        dimensionsSummary: table.dimensionsSummary || '',
        measureStructure: table.measureStructure || '',
        sourceFormat: table.sourceFormat || '',
        verificationStatus: table.verificationStatus || StatisticalVerificationStatus.UNVERIFIED,
      });
      setErrorMessage(null);
    }
  }, [table, isOpen]);

  if (!table) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title?.trim()) {
      setErrorMessage('Table title is required.');
      return;
    }
    if (!formData.domain?.trim()) {
      setErrorMessage('Statistical domain is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: UpdateTablePayload = {
        title: formData.title.trim(),
        domain: formData.domain.trim(),
        classification: formData.classification,
        description: formData.description?.trim() || null,
        expectedUnit: formData.expectedUnit?.trim() || null,
        rowGrain: formData.rowGrain?.trim() || null,
        dimensionsSummary: formData.dimensionsSummary?.trim() || null,
        measureStructure: formData.measureStructure?.trim() || null,
        sourceFormat: formData.sourceFormat?.trim() || null,
        verificationStatus: formData.verificationStatus,
      };

      const updated = await updateTable(table.id, payload);
      toast.success(`Table "${updated.tableCode}" metadata updated successfully.`);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to update table metadata:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to update table definition metadata.';
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
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Edit Table Metadata — {table.tableCode}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Update statistical attributes, domain categorization, and publication specs.
              </p>
            </div>
          </div>
        </DialogHeader>

        {table.isSystemTable && (
          <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">PSA Canonical System Table:</strong> The table code (
              <code>{table.tableCode}</code>) and canonical table number (
              <code>#{table.tableNumber}</code>) are permanently locked to preserve data governance integrity.
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-lg">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Read-Only System Identity Display */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Table Code:</span>{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">{table.tableCode}</strong>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Table Number:</span>{' '}
              <strong className="text-slate-800 dark:text-slate-200">#{table.tableNumber}</strong>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="edit-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Official Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          {/* Domain */}
          <div className="space-y-1">
            <Label htmlFor="edit-domain" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Thematic Domain <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="edit-domain"
              value={formData.domain}
              onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          {/* Classification & Verification Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <SelectItem value={StatisticalTableClassification.AGGREGATED_STATISTICS} className="text-xs">
                    Aggregated Statistics
                  </SelectItem>
                  <SelectItem value={StatisticalTableClassification.INDICATOR} className="text-xs">
                    Indicator Table
                  </SelectItem>
                  <SelectItem value={StatisticalTableClassification.DERIVED_METRIC} className="text-xs">
                    Derived Metric
                  </SelectItem>
                  <SelectItem value={StatisticalTableClassification.REFERENCE_DATA} className="text-xs">
                    Reference Data
                  </SelectItem>
                </SelectContent>
              </Select>
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
                  <SelectItem value={StatisticalVerificationStatus.UNVERIFIED} className="text-xs">
                    UNVERIFIED
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.PROVISIONAL} className="text-xs">
                    PROVISIONAL
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.VERIFIED} className="text-xs">
                    VERIFIED
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Expected Unit & Row Grain */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-unit" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Expected Unit
              </Label>
              <Input
                id="edit-unit"
                value={formData.expectedUnit || ''}
                onChange={(e) => setFormData({ ...formData, expectedUnit: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="edit-grain" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Row Grain
              </Label>
              <Input
                id="edit-grain"
                value={formData.rowGrain || ''}
                onChange={(e) => setFormData({ ...formData, rowGrain: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* Measure Structure */}
          <div className="space-y-1">
            <Label htmlFor="edit-measure" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Measure Structure
            </Label>
            <Input
              id="edit-measure"
              value={formData.measureStructure || ''}
              onChange={(e) => setFormData({ ...formData, measureStructure: e.target.value })}
              className="text-xs"
            />
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="edit-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description / Statistical Notes
            </Label>
            <textarea
              id="edit-desc"
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
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
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
