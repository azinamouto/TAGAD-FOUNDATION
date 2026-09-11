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
  DimensionItem,
  StatisticalVerificationStatus,
  BindDimensionPayload,
  CreateDimensionPayload,
} from '../../../types/tableBuilder';
import {
  getDimensionDictionary,
  bindDimension,
  createDimension,
} from '../../../api/tableBuilder';
import { toast } from 'sonner';
import {
  SlidersHorizontal,
  Search,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Loader2,
  BookOpen,
  Check,
} from 'lucide-react';

interface BindDimensionModalProps {
  isOpen: boolean;
  table: TableDefinitionItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BindDimensionModal: React.FC<BindDimensionModalProps> = ({
  isOpen,
  table,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'dictionary' | 'create'>('dictionary');

  // Dictionary State
  const [dictionary, setDictionary] = useState<DimensionItem[]>([]);
  const [loadingDict, setLoadingDict] = useState(false);
  const [dictSearch, setDictSearch] = useState('');
  const [dictStatusFilter, setDictStatusFilter] = useState('ALL');
  const [selectedDimId, setSelectedDimId] = useState<string | null>(null);

  // Binding Configuration State
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isRequired, setIsRequired] = useState<boolean>(true);
  const [allowedValuesInput, setAllowedValuesInput] = useState<string>('');

  // Inline Dimension Creation State
  const [newDimCode, setNewDimCode] = useState('');
  const [newDimName, setNewDimName] = useState('');
  const [newDimDesc, setNewDimDesc] = useState('');
  const [newDimDataType, setNewDimDataType] = useState('string');
  const [newDimVocabSource, setNewDimVocabSource] = useState('');
  const [newDimStatus, setNewDimStatus] = useState<StatisticalVerificationStatus>(
    StatisticalVerificationStatus.VERIFIED
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch dictionary
  const fetchDictionary = async () => {
    setLoadingDict(true);
    setErrorMessage(null);
    try {
      const data = await getDimensionDictionary({
        search: dictSearch || undefined,
        verificationStatus: dictStatusFilter !== 'ALL' ? dictStatusFilter : undefined,
      });
      setDictionary(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to fetch dimension dictionary:', err);
      toast.error('Unable to fetch dimension dictionary.');
    } finally {
      setLoadingDict(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDictionary();
      if (table) {
        setDisplayOrder((table.dimensionBindings?.length || 0) + 1);
      }
      setSelectedDimId(null);
      setErrorMessage(null);
      setActiveTab('dictionary');
    }
  }, [isOpen, table]);

  // Already bound dimension IDs on this table
  const boundDimIds = new Set(table?.dimensionBindings?.map((b) => b.dimensionId) || []);

  const filteredDictionary = dictionary.filter((dim) => {
    if (dictStatusFilter !== 'ALL' && dim.verificationStatus !== dictStatusFilter) {
      return false;
    }
    if (dictSearch.trim()) {
      const term = dictSearch.toLowerCase().trim();
      const codeMatch = dim.dimensionCode.toLowerCase().includes(term);
      const nameMatch = dim.name.toLowerCase().includes(term);
      const descMatch = dim.description ? dim.description.toLowerCase().includes(term) : false;
      return codeMatch || nameMatch || descMatch;
    }
    return true;
  });

  // Handle Bind Existing
  const handleBindExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;
    if (!selectedDimId) {
      setErrorMessage('Please select a dimension from the dictionary to bind.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let allowedValuesParsed: any = null;
      if (allowedValuesInput.trim()) {
        try {
          allowedValuesParsed = JSON.parse(allowedValuesInput);
        } catch {
          // If not valid JSON, treat as comma-separated or plain string array
          allowedValuesParsed = allowedValuesInput.split(',').map((s) => s.trim()).filter(Boolean);
        }
      }

      const payload: BindDimensionPayload = {
        dimensionId: selectedDimId,
        displayOrder: Number(displayOrder) || 1,
        isRequired,
        allowedValues: allowedValuesParsed,
      };

      await bindDimension(table.id, payload);
      toast.success('Dimension bound to table successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to bind dimension:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to bind dimension to table.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Inline Creation & Binding
  const handleCreateAndBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table) return;
    if (!newDimCode.trim() || !newDimName.trim()) {
      setErrorMessage('Dimension code and name are required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const createPayload: CreateDimensionPayload = {
        dimensionCode: newDimCode.trim().toUpperCase(),
        name: newDimName.trim(),
        description: newDimDesc.trim() || null,
        dataType: newDimDataType.trim() || 'string',
        vocabularySource: newDimVocabSource.trim() || null,
        verificationStatus: newDimStatus,
      };

      // 1. Create Dimension
      const createdDim = await createDimension(createPayload);
      toast.success(`Dimension "${createdDim.dimensionCode}" created in dictionary.`);

      // 2. Bind to current table
      const bindPayload: BindDimensionPayload = {
        dimensionId: createdDim.id,
        displayOrder: Number(displayOrder) || 1,
        isRequired,
        allowedValues: null,
      };

      await bindDimension(table.id, bindPayload);
      toast.success(`Dimension "${createdDim.dimensionCode}" bound to table.`);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create and bind dimension:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to create or bind dimension.';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!table) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Bind Analytical Dimension — {table.tableCode}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Attach disaggregation dimensions (e.g., Sex, Barangay, Age Bracket) to configure table grain.
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 pt-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('dictionary');
              setErrorMessage(null);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'dictionary'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Dimension Dictionary ({dictionary.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('create');
              setErrorMessage(null);
            }}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create New Dimension Inline
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* ========================================================================= */}
        {/* Tab 1: Dictionary Selection */}
        {/* ========================================================================= */}
        {activeTab === 'dictionary' && (
          <form onSubmit={handleBindExisting} className="space-y-4 py-2">
            {/* Search & Filter bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dimensions by code or name..."
                  value={dictSearch}
                  onChange={(e) => setDictSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <select
                value={dictStatusFilter}
                onChange={(e) => setDictStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">All Statuses</option>
                <option value={StatisticalVerificationStatus.VERIFIED}>Verified Only</option>
                <option value={StatisticalVerificationStatus.UNVERIFIED}>Unverified</option>
              </select>
            </div>

            {/* Dictionary List */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {loadingDict ? (
                <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  Loading dimension dictionary...
                </div>
              ) : filteredDictionary.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No dimensions found matching criteria. You can create one inline in the "Create New Dimension" tab.
                </div>
              ) : (
                filteredDictionary.map((dim) => {
                  const isBound = boundDimIds.has(dim.id);
                  const isSelected = selectedDimId === dim.id;
                  const isVerified =
                    dim.verificationStatus === StatisticalVerificationStatus.VERIFIED;

                  return (
                    <div
                      key={dim.id}
                      onClick={() => !isBound && setSelectedDimId(dim.id)}
                      className={`p-3 text-xs flex items-center justify-between gap-3 transition-colors ${
                        isBound
                          ? 'bg-slate-50 dark:bg-slate-800/30 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-l-4 border-indigo-600 cursor-pointer'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            {dim.dimensionCode}
                          </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {dim.name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {dim.verificationStatus}
                          </span>
                          {isBound && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                              ALREADY BOUND
                            </span>
                          )}
                        </div>
                        {dim.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-[11px] truncate">
                            {dim.description}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center">
                        {!isBound && (
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Binding Parameters */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Binding Properties
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="bind-order" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Display Order Sequence
                  </Label>
                  <Input
                    id="bind-order"
                    type="number"
                    min={1}
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Required for Disaggregation
                  </Label>
                  <div className="flex items-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="isRequired"
                        checked={isRequired === true}
                        onChange={() => setIsRequired(true)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Mandatory (Required)</span>
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="isRequired"
                        checked={isRequired === false}
                        onChange={() => setIsRequired(false)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span>Optional</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="bind-allowed" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Allowed Values / Filter Enum (Optional JSON or comma-separated)
                </Label>
                <Input
                  id="bind-allowed"
                  placeholder='e.g. ["Male", "Female"] or Male, Female, Both'
                  value={allowedValuesInput}
                  onChange={(e) => setAllowedValuesInput(e.target.value)}
                  className="text-xs"
                />
              </div>
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
                disabled={isSubmitting || !selectedDimId}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Binding...
                  </>
                ) : (
                  'Bind Selected Dimension'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* ========================================================================= */}
        {/* Tab 2: Create Inline Dimension */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateAndBind} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-dim-code" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dimension Code <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="new-dim-code"
                  placeholder="e.g. DIM_INDIGENOUS_GROUP"
                  value={newDimCode}
                  onChange={(e) => setNewDimCode(e.target.value)}
                  required
                  className="text-xs font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-dim-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dimension Name <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id="new-dim-name"
                  placeholder="e.g. Indigenous Group Affiliation"
                  value={newDimName}
                  onChange={(e) => setNewDimName(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="new-dim-type" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Data Type
                </Label>
                <Input
                  id="new-dim-type"
                  placeholder="e.g. string, integer, boolean"
                  value={newDimDataType}
                  onChange={(e) => setNewDimDataType(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="new-dim-vocab" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Vocabulary Source
                </Label>
                <Input
                  id="new-dim-vocab"
                  placeholder="e.g. NCIP Official Tribal Registry"
                  value={newDimVocabSource}
                  onChange={(e) => setNewDimVocabSource(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="new-dim-desc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Description
              </Label>
              <textarea
                id="new-dim-desc"
                rows={2}
                placeholder="Describe standard classification options and analytical purpose..."
                value={newDimDesc}
                onChange={(e) => setNewDimDesc(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Verification Status
              </Label>
              <Select
                value={newDimStatus}
                onValueChange={(val: any) => setNewDimStatus(val)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={StatisticalVerificationStatus.VERIFIED} className="text-xs">
                    VERIFIED (Authoritative Standard)
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.PROVISIONAL} className="text-xs">
                    PROVISIONAL (Under Review)
                  </SelectItem>
                  <SelectItem value={StatisticalVerificationStatus.UNVERIFIED} className="text-xs">
                    UNVERIFIED (Custom/Ad-hoc)
                  </SelectItem>
                </SelectContent>
              </Select>
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
                    Creating & Binding...
                  </>
                ) : (
                  'Create & Bind to Table'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
