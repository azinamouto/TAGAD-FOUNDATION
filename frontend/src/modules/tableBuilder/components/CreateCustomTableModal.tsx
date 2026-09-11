import React, { useState } from 'react';
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
  StatisticalTableClassification,
  CreateTablePayload,
} from '../../../types/tableBuilder';
import { createTable } from '../../../api/tableBuilder';
import { toast } from 'sonner';
import { PlusCircle, Loader2, Sparkles } from 'lucide-react';

interface CreateCustomTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTable: any) => void;
}

const CANONICAL_DOMAINS = [
  'Demographics & Population Dynamics',
  'Health, Nutrition & Vital Statistics',
  'Education, Literacy & Skills Development',
  'Economic Development & Livelihood',
  'Agriculture, Fisheries & Food Security',
  'Social Welfare, Protection & Vulnerable Sectors',
  'Peace, Order, Safety & Disaster Risk Reduction',
  'Governance, Public Administration & Institutional GAD',
  'Environmental Management, Natural Resources & Climate Change',
  'Other / Custom Thematic Domain',
];

export const CreateCustomTableModal: React.FC<CreateCustomTableModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreateTablePayload>({
    title: '',
    domain: CANONICAL_DOMAINS[0],
    classification: StatisticalTableClassification.AGGREGATED_STATISTICS,
    description: '',
    expectedUnit: 'Households',
    rowGrain: 'BARANGAY',
    dimensionsSummary: '',
    measureStructure: '',
    sourceFormat: 'CBMS Standard Portal / Tabular Entry',
  });

  const [customDomainInput, setCustomDomainInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDomainChange = (val: string) => {
    if (val === 'Other / Custom Thematic Domain') {
      setFormData((prev) => ({ ...prev, domain: customDomainInput || 'Custom Thematic Domain' }));
    } else {
      setFormData((prev) => ({ ...prev, domain: val }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrorMessage('Table title is required.');
      return;
    }
    if (!formData.domain.trim()) {
      setErrorMessage('Statistical domain is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreateTablePayload = {
        title: formData.title.trim(),
        domain: formData.domain.trim(),
        classification: formData.classification,
        description: formData.description?.trim() || null,
        expectedUnit: formData.expectedUnit?.trim() || null,
        rowGrain: formData.rowGrain?.trim() || 'BARANGAY',
        dimensionsSummary: formData.dimensionsSummary?.trim() || null,
        measureStructure: formData.measureStructure?.trim() || null,
        sourceFormat: formData.sourceFormat?.trim() || null,
      };

      const created = await createTable(payload);
      toast.success(`Custom table "${created.title}" successfully created (${created.tableCode}).`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      console.error('Failed to create custom table:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create custom statistical table.';
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
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Create Custom Statistical Table
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register a new thematic tabulation. System table numbers 1–69 are strictly reserved for PSA canonical tables.
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
          {/* Title */}
          <div className="space-y-1">
            <Label htmlFor="create-title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Table Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="create-title"
              placeholder="e.g. Disaggregated Solo Parents by Barangay & Assistance Category"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="text-xs"
            />
          </div>

          {/* Domain */}
          <div className="space-y-1">
            <Label htmlFor="create-domain" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Thematic Domain <span className="text-rose-500">*</span>
            </Label>
            <Select
              value={
                CANONICAL_DOMAINS.includes(formData.domain)
                  ? formData.domain
                  : 'Other / Custom Thematic Domain'
              }
              onValueChange={handleDomainChange}
            >
              <SelectTrigger id="create-domain" className="text-xs">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {CANONICAL_DOMAINS.map((dom) => (
                  <SelectItem key={dom} value={dom} className="text-xs">
                    {dom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(!CANONICAL_DOMAINS.slice(0, 9).includes(formData.domain) ||
              formData.domain === 'Other / Custom Thematic Domain') && (
              <Input
                placeholder="Enter custom domain name"
                value={customDomainInput}
                onChange={(e) => {
                  setCustomDomainInput(e.target.value);
                  setFormData({ ...formData, domain: e.target.value });
                }}
                className="mt-2 text-xs"
              />
            )}
          </div>

          {/* Classification & Unit Grid */}
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
              <Label htmlFor="create-unit" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Expected Unit
              </Label>
              <Input
                id="create-unit"
                placeholder="e.g. Persons, Households, Cases, PHP"
                value={formData.expectedUnit || ''}
                onChange={(e) => setFormData({ ...formData, expectedUnit: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          {/* Row Grain & Measure Structure */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="create-grain" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Row Grain
              </Label>
              <Input
                id="create-grain"
                placeholder="e.g. BARANGAY, MUNICIPALITY, PROGRAM"
                value={formData.rowGrain || ''}
                onChange={(e) => setFormData({ ...formData, rowGrain: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="create-measure" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Measure Structure
              </Label>
              <Input
                id="create-measure"
                placeholder="e.g. Count (Total, Male, Female)"
                value={formData.measureStructure || ''}
                onChange={(e) =>
                  setFormData({ ...formData, measureStructure: e.target.value })
                }
                className="text-xs"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Label htmlFor="create-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Description & Statistical Methodology
            </Label>
            <textarea
              id="create-desc"
              rows={3}
              placeholder="Describe the tabulation scope, target demographic, and analytical purpose..."
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
                  Creating...
                </>
              ) : (
                'Create Table'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
