import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TableDefinitionItem,
  DimensionBindingItem,
  TableIndicatorItem,
  StatisticalTableClassification,
  StatisticalVerificationStatus,
  DimensionReorderItem,
} from '../../../types/tableBuilder';
import {
  getTableById,
  deleteOrArchiveTable,
  unbindDimension,
  reorderDimensions,
  deleteIndicator,
} from '../../../api/tableBuilder';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../../components/ui/button';
import { EditTableMetadataModal } from './EditTableMetadataModal';
import { BindDimensionModal } from './BindDimensionModal';
import { IndicatorFormModal } from './IndicatorFormModal';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Lock,
  Sparkles,
  Edit3,
  Trash2,
  PlusCircle,
  SlidersHorizontal,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  MoveUp,
  MoveDown,
  Unlink,
  Copy,
  Check,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Calendar,
  Database,
  Hash,
  HelpCircle,
  Shield,
} from 'lucide-react';

interface TableDetailViewProps {
  tableId: string;
  onBack: () => void;
}

export const TableDetailView: React.FC<TableDetailViewProps> = ({
  tableId,
  onBack,
}) => {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin } = useAuth();
  const canMutate = isAdmin || isSuperAdmin;

  const [table, setTable] = useState<TableDefinitionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedSpec, setCopiedSpec] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'specs' | 'dimensions' | 'indicators'>(
    'specs'
  );

  // Modals state
  const [isEditMetaOpen, setIsEditMetaOpen] = useState(false);
  const [isBindDimOpen, setIsBindDimOpen] = useState(false);
  const [indicatorModalState, setIndicatorModalState] = useState<{
    isOpen: boolean;
    indicator: TableIndicatorItem | null;
  }>({
    isOpen: false,
    indicator: null,
  });

  // Delete / Action Confirmation Dialog state
  const [confirmDialogState, setConfirmDialogState] = useState<{
    isOpen: boolean;
    type: 'delete_table' | 'unbind_dim' | 'delete_indicator' | null;
    title: string;
    description: string;
    itemName?: string;
    targetId?: string;
    isLoading: boolean;
    errorMessage: string | null;
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    isLoading: false,
    errorMessage: null,
  });

  // Fetch Table Detail
  const fetchTableDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTableById(tableId);
      setTable(data);
    } catch (err: any) {
      console.error('Failed to load table detail:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to fetch table definition detail.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tableId) {
      fetchTableDetail();
    }
  }, [tableId]);

  const handleCopySpec = () => {
    if (!table) return;
    navigator.clipboard.writeText(JSON.stringify(table, null, 2));
    setCopiedSpec(true);
    toast.success('Table schema specification copied to clipboard.');
    setTimeout(() => setCopiedSpec(false), 2000);
  };

  // Reorder dimensions up or down
  const handleReorder = async (currentIndex: number, direction: 'up' | 'down') => {
    if (!table || !table.dimensionBindings) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= table.dimensionBindings.length) return;

    const list = [...table.dimensionBindings];
    const temp = list[currentIndex];
    list[currentIndex] = list[targetIndex];
    list[targetIndex] = temp;

    const reorderedPayload: DimensionReorderItem[] = list.map((binding, idx) => ({
      dimensionId: binding.dimensionId,
      displayOrder: idx + 1,
    }));

    try {
      const updated = await reorderDimensions(table.id, reorderedPayload);
      setTable(updated);
      toast.success('Dimension sequence updated.');
    } catch (err: any) {
      console.error('Failed to reorder dimensions:', err);
      toast.error(
        err?.response?.data?.error || 'Failed to update dimension order.'
      );
      fetchTableDetail();
    }
  };

  // Trigger Delete Table Confirmation
  const promptDeleteTable = () => {
    if (!table) return;
    if (table.isSystemTable) {
      toast.error('PSA Canonical System Tables cannot be deleted.');
      return;
    }
    setConfirmDialogState({
      isOpen: true,
      type: 'delete_table',
      title: 'Delete Custom Table Definition',
      description:
        'Are you sure you want to delete this custom statistical table? This action removes the schema definition from the active registry.',
      itemName: `${table.tableCode} — ${table.title}`,
      isLoading: false,
      errorMessage: null,
    });
  };

  // Trigger Unbind Dimension Confirmation
  const promptUnbindDimension = (binding: DimensionBindingItem) => {
    if (!table) return;
    setConfirmDialogState({
      isOpen: true,
      type: 'unbind_dim',
      title: 'Unbind Analytical Dimension',
      description:
        'Are you sure you want to unbind this dimension from the table? This removes the disaggregation grain from future data entries.',
      itemName: `${binding.dimension?.dimensionCode || 'Dimension'} (${binding.dimension?.name || ''})`,
      targetId: binding.dimensionId,
      isLoading: false,
      errorMessage: null,
    });
  };

  // Trigger Delete Indicator Confirmation
  const promptDeleteIndicator = (ind: TableIndicatorItem) => {
    if (!table) return;
    setConfirmDialogState({
      isOpen: true,
      type: 'delete_indicator',
      title: 'Delete Analytical Indicator',
      description:
        'Are you sure you want to delete this indicator definition? If observations or published reports depend on this indicator, deletion will be safely rejected.',
      itemName: `${ind.indicatorCode} — ${ind.name}`,
      targetId: ind.id,
      isLoading: false,
      errorMessage: null,
    });
  };

  // Confirm Action Handler
  const handleConfirmAction = async () => {
    if (!table || !confirmDialogState.type) return;

    setConfirmDialogState((prev) => ({ ...prev, isLoading: true, errorMessage: null }));

    try {
      if (confirmDialogState.type === 'delete_table') {
        await deleteOrArchiveTable(table.id);
        toast.success(`Table "${table.tableCode}" successfully deleted.`);
        setConfirmDialogState((prev) => ({ ...prev, isOpen: false }));
        onBack();
      } else if (confirmDialogState.type === 'unbind_dim' && confirmDialogState.targetId) {
        await unbindDimension(table.id, confirmDialogState.targetId);
        toast.success('Dimension unbound successfully.');
        setConfirmDialogState((prev) => ({ ...prev, isOpen: false }));
        fetchTableDetail();
      } else if (confirmDialogState.type === 'delete_indicator' && confirmDialogState.targetId) {
        await deleteIndicator(confirmDialogState.targetId);
        toast.success('Indicator definition deleted.');
        setConfirmDialogState((prev) => ({ ...prev, isOpen: false }));
        fetchTableDetail();
      }
    } catch (err: any) {
      console.error('Confirmation action failed:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Operation failed. Check if dependent records exist.';
      setConfirmDialogState((prev) => ({
        ...prev,
        isLoading: false,
        errorMessage: msg,
      }));
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-16 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading statistical table specification...</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-4">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-5 h-5" />
          <h2 className="text-base font-bold">Error Loading Table</h2>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {error || 'The requested table could not be found or access is restricted.'}
        </p>
        <Button size="sm" variant="outline" onClick={onBack} className="text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Back to Table Catalog
        </Button>
      </div>
    );
  }

  const isVerified = table.verificationStatus === StatisticalVerificationStatus.VERIFIED;
  const isIndicator = table.classification === StatisticalTableClassification.INDICATOR;
  const boundDimensions = table.dimensionBindings || [];
  const indicators = table.indicators || [];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="text-xs w-fit bg-white dark:bg-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Table Catalog
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopySpec}
            className="text-xs bg-white dark:bg-slate-900"
          >
            {copiedSpec ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                Copied JSON
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy Spec
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTableDetail}
            className="text-xs bg-white dark:bg-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => navigate(`/admin/statistical-data/${table.id}`)}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Enter Observations
          </Button>

          {canMutate && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditMetaOpen(true)}
                className="text-xs bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Edit Metadata
              </Button>

              {!table.isSystemTable && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={promptDeleteTable}
                  className="text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete Table
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Table Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
            {table.tableCode}
          </span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            Table #{table.tableNumber}
          </span>
          {table.isSystemTable ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
              <Lock className="w-3 h-3" />
              PSA Canonical System Table
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              <Sparkles className="w-3 h-3" />
              Custom Statistical Tabulation
            </span>
          )}
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
              isVerified
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isVerified ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                VERIFIED (Authoritative Standard)
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-600" />
                {table.verificationStatus}
              </>
            )}
          </span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              isIndicator
                ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            {isIndicator ? 'Analytical Indicator' : 'Aggregated Statistics'}
          </span>
        </div>

        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {table.title}
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 mt-1">
            Canonical Domain:{' '}
            <strong className="text-slate-900 dark:text-white font-semibold">
              {table.domain}
            </strong>
          </p>
        </div>

        {table.isSystemTable && (
          <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">PSA System Immutability Protection:</strong> Table code{' '}
              <code>{table.tableCode}</code> and table index #{table.tableNumber} are locked in the database to guarantee canonical comparability across LGU annual reporting cycles.
            </div>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 rounded-t-xl">
        <button
          type="button"
          onClick={() => setActiveTab('specs')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'specs'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          Table Specifications
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('dimensions')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'dimensions'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Bound Dimensions ({boundDimensions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('indicators')}
          className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'indicators'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          Analytical Indicators ({indicators.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: Table Specifications */}
      {/* ========================================================================= */}
      {activeTab === 'specs' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl p-6 shadow-xs space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Statistical Grain & Scope
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Row Grain:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.rowGrain || 'BARANGAY (25 Official Administrative Units)'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400">Expected Unit of Measure:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.expectedUnit || 'Persons / Households'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400">Measure Structure:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.measureStructure || 'Aggregated Count Disaggregated by Sex & Age Cohort'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Data Collection & Ingestion
              </h3>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Source Format:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.sourceFormat || 'PSA Census / CBMS Administrative Records'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400">Dimensions Summary:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.dimensionsSummary || `${boundDimensions.length} dimension(s) configured`}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400">Verification Standard:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {table.verificationStatus}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Methodological Description */}
          {table.description && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Methodological Description & Scope
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {table.description}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
            <span>Created: {table.createdAt ? new Date(table.createdAt).toLocaleDateString() : 'System Boot'}</span>
            <span>Last Updated: {table.updatedAt ? new Date(table.updatedAt).toLocaleDateString() : 'N/A'}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: Bound Dimensions */}
      {/* ========================================================================= */}
      {activeTab === 'dimensions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Bound Disaggregation Dimensions
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dimensions control the structural hierarchy and breakdown axes when reporting data for this table.
              </p>
            </div>

            {canMutate && (
              <Button
                size="sm"
                onClick={() => setIsBindDimOpen(true)}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Bind Dimension
              </Button>
            )}
          </div>

          {boundDimensions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <SlidersHorizontal className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No dimensions bound to this table yet
              </p>
              <p className="max-w-md mx-auto text-slate-400">
                Bind canonical dimensions such as Sex (Male/Female), Age Group cohorts, or Barangay geographic hierarchy to configure data grain.
              </p>
              {canMutate && (
                <Button
                  size="sm"
                  onClick={() => setIsBindDimOpen(true)}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Bind First Dimension
                </Button>
              )}
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Order</th>
                    <th className="py-3 px-4 w-36">Dimension Code</th>
                    <th className="py-3 px-4">Name & Description</th>
                    <th className="py-3 px-4 w-28">Data Type</th>
                    <th className="py-3 px-4 w-28">Requirement</th>
                    <th className="py-3 px-4 w-32">Status</th>
                    {canMutate && <th className="py-3 px-4 w-32 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {boundDimensions.map((binding, idx) => {
                    const dim = binding.dimension;
                    const isFirst = idx === 0;
                    const isLast = idx === boundDimensions.length - 1;

                    return (
                      <tr
                        key={binding.id || binding.dimensionId}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Order Sequence with Up/Down buttons */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-700 dark:text-slate-300">
                            <span>#{binding.displayOrder}</span>
                            {canMutate && boundDimensions.length > 1 && (
                              <div className="flex flex-col ml-1">
                                <button
                                  type="button"
                                  disabled={isFirst}
                                  onClick={() => handleReorder(idx, 'up')}
                                  title="Move Up"
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 p-0.5"
                                >
                                  <MoveUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={isLast}
                                  onClick={() => handleReorder(idx, 'down')}
                                  title="Move Down"
                                  className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 disabled:hover:text-slate-400 p-0.5"
                                >
                                  <MoveDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Code */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            {dim?.dimensionCode || 'DIM_CUSTOM'}
                          </span>
                        </td>

                        {/* Name & Desc */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {dim?.name || 'Dimension'}
                            </div>
                            {dim?.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {dim.description}
                              </p>
                            )}
                            {binding.allowedValues && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Allowed:{' '}
                                {typeof binding.allowedValues === 'object'
                                  ? JSON.stringify(binding.allowedValues)
                                  : String(binding.allowedValues)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Data Type */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                            {dim?.dataType || 'string'}
                          </span>
                        </td>

                        {/* Requirement */}
                        <td className="py-3 px-4">
                          {binding.isRequired ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                              Optional
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                              dim?.verificationStatus === StatisticalVerificationStatus.VERIFIED
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {dim?.verificationStatus || 'VERIFIED'}
                          </span>
                        </td>

                        {/* Actions */}
                        {canMutate && (
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => promptUnbindDimension(binding)}
                              className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              title="Unbind dimension from table"
                            >
                              <Unlink className="w-3.5 h-3.5 mr-1" />
                              Unbind
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: Analytical Indicators */}
      {/* ========================================================================= */}
      {activeTab === 'indicators' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-b-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Computed Analytical Indicators
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Formulas and derived gender metrics computed from this statistical tabulation.
              </p>
            </div>

            {canMutate && (
              <Button
                size="sm"
                onClick={() =>
                  setIndicatorModalState({ isOpen: true, indicator: null })
                }
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Add Indicator
              </Button>
            )}
          </div>

          {indicators.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                No indicators registered for this table yet
              </p>
              <p className="max-w-md mx-auto text-slate-400">
                You can attach computed ratios (e.g., Sex Ratio, Dependency Ratio, Literacy Rate) with mathematical formulas.
              </p>
              {canMutate && (
                <Button
                  size="sm"
                  onClick={() =>
                    setIndicatorModalState({ isOpen: true, indicator: null })
                  }
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
                >
                  <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                  Add First Indicator
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {indicators.map((ind) => {
                const isIndVerified =
                  ind.verificationStatus === StatisticalVerificationStatus.VERIFIED;

                return (
                  <div
                    key={ind.id || ind.indicatorCode}
                    className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-100 dark:bg-purple-950/60 px-2 py-0.5 rounded">
                          {ind.indicatorCode}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {ind.unit && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                              Unit: {ind.unit}
                            </span>
                          )}
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              isIndVerified
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            }`}
                          >
                            {ind.verificationStatus}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {ind.title || ind.name}
                        </h4>
                        {ind.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {ind.description}
                          </p>
                        )}
                      </div>

                      {ind.formula && (
                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 text-[11px]">
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">
                            Formula
                          </span>
                          <code className="text-purple-600 dark:text-purple-300 font-mono">
                            {ind.formula}
                          </code>
                        </div>
                      )}

                      {(ind.numeratorDefinition || ind.denominatorDefinition) && (
                        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
                          {ind.numeratorDefinition && (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded">
                              <span className="font-semibold block text-slate-500">Numerator:</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {ind.numeratorDefinition}
                              </span>
                            </div>
                          )}
                          {ind.denominatorDefinition && (
                            <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded">
                              <span className="font-semibold block text-slate-500">Denominator:</span>
                              <span className="text-slate-700 dark:text-slate-300">
                                {ind.denominatorDefinition}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {canMutate && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setIndicatorModalState({ isOpen: true, indicator: ind })
                          }
                          className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => promptDeleteIndicator(ind)}
                          className="text-xs h-7 px-2 text-rose-600 hover:text-rose-700 dark:text-rose-400"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Metadata Modal */}
      <EditTableMetadataModal
        isOpen={isEditMetaOpen}
        table={table}
        onClose={() => setIsEditMetaOpen(false)}
        onSuccess={(updated) => {
          setTable(updated);
        }}
      />

      {/* Bind Dimension Modal */}
      <BindDimensionModal
        isOpen={isBindDimOpen}
        table={table}
        onClose={() => setIsBindDimOpen(false)}
        onSuccess={() => {
          fetchTableDetail();
        }}
      />

      {/* Indicator Form Modal (Create or Edit) */}
      <IndicatorFormModal
        isOpen={indicatorModalState.isOpen}
        tableId={table.id}
        tableCode={table.tableCode}
        indicator={indicatorModalState.indicator}
        onClose={() =>
          setIndicatorModalState({ isOpen: false, indicator: null })
        }
        onSuccess={() => {
          fetchTableDetail();
        }}
      />

      {/* Delete / Action Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={confirmDialogState.isOpen}
        title={confirmDialogState.title}
        description={confirmDialogState.description}
        itemName={confirmDialogState.itemName}
        confirmLabel={
          confirmDialogState.type === 'delete_table'
            ? 'Delete Table'
            : confirmDialogState.type === 'unbind_dim'
            ? 'Unbind Dimension'
            : 'Delete Indicator'
        }
        isLoading={confirmDialogState.isLoading}
        errorMessage={confirmDialogState.errorMessage}
        onClose={() =>
          setConfirmDialogState((prev) => ({ ...prev, isOpen: false, errorMessage: null }))
        }
        onConfirm={handleConfirmAction}
      />
    </div>
  );
};
