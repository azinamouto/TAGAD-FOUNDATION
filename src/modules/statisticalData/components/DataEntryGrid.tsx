import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TableDefinitionItem,
  StatisticalObservationItem,
  GridRowData,
  DatasetItem,
  BarangayItem,
} from '../../../types/statisticalData';
import {
  listObservations,
  createObservation,
  updateObservation,
  deleteObservation,
  bulkSaveObservations,
  getBarangays,
} from '../../../api/statisticalData';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Plus,
  Trash2,
  Save,
  RotateCcw,
  Clipboard,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Table as TableIcon,
  HelpCircle,
  Lock,
  Download,
  Upload,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../auth/AuthContext';
import { StatisticalCsvImportModal } from './StatisticalCsvImportModal';

interface DataEntryGridProps {
  table: TableDefinitionItem;
  dataset: DatasetItem | null;
  onRefreshTable?: () => void;
}

export const DataEntryGrid: React.FC<DataEntryGridProps> = ({
  table,
  dataset,
  onRefreshTable,
}) => {
  const { user, hasRole, isAdmin, isSuperAdmin } = useAuth();
  const [rows, setRows] = useState<GridRowData[]>([]);
  const [barangays, setBarangays] = useState<BarangayItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [pasteModalOpen, setPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);

  // Active cell coordinate for keyboard navigation
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colKey: string } | null>(null);
  const cellRefs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null>>({});

  const isViewer = !isAdmin && !isSuperAdmin && !hasRole('ENCODER');
  const isDatasetLocked = dataset?.publicationStatus !== 'DRAFT';
  const isReadOnly = isViewer || isDatasetLocked || !dataset;

  // Derive bound dimensions
  const dimensionBindings = table.dimensionBindings || [];
  const indicators = table.indicators || [];

  // 1. Fetch Barangays
  useEffect(() => {
    getBarangays().then((list) => setBarangays(list));
  }, []);

  // 2. Fetch observations when table or dataset changes
  const loadObservations = useCallback(async () => {
    if (!dataset?.id) {
      setRows([]);
      return;
    }

    try {
      setLoading(true);
      const res = await listObservations(table.id, {
        datasetId: dataset.id,
        limit: 500,
      });

      const gridRows: GridRowData[] = res.observations.map((obs) => {
        const dimMap: Record<string, string> = {};
        if (obs.dimensions && typeof obs.dimensions === 'object') {
          Object.entries(obs.dimensions).forEach(([k, v]) => {
            dimMap[k] = v !== null && v !== undefined ? String(v) : '';
          });
        }

        return {
          clientRowId: obs.id,
          id: obs.id,
          period: obs.period || '',
          barangayId: obs.barangayId || null,
          indicatorId: obs.indicatorId || null,
          dimensions: dimMap,
          numericValue: obs.numericValue,
          observationStatus: obs.observationStatus || '',
          notes: obs.notes || '',
          rowState: 'SAVED',
          fieldErrors: {},
        };
      });

      setRows(gridRows);
      setSelectedRowIds(new Set());
    } catch (err: any) {
      console.error('Failed to load observations:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to fetch observations.';
      toast.error(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [table.id, dataset?.id]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  // Handle cell value change
  const handleCellChange = (
    clientRowId: string,
    field: 'period' | 'barangayId' | 'indicatorId' | 'numericValue' | 'notes' | 'observationStatus',
    value: any
  ) => {
    if (isReadOnly) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.clientRowId !== clientRowId) return row;

        const updated = { ...row, [field]: value };
        if (updated.rowState === 'SAVED') {
          updated.rowState = 'DIRTY';
        }
        if (updated.fieldErrors?.[field]) {
          const newErrors = { ...updated.fieldErrors };
          delete newErrors[field];
          updated.fieldErrors = newErrors;
        }
        return updated;
      })
    );
  };

  const handleDimensionChange = (
    clientRowId: string,
    dimCode: string,
    value: string
  ) => {
    if (isReadOnly) return;

    setRows((prev) =>
      prev.map((row) => {
        if (row.clientRowId !== clientRowId) return row;

        const updatedDims = { ...row.dimensions, [dimCode]: value };
        const updated = { ...row, dimensions: updatedDims };
        if (updated.rowState === 'SAVED') {
          updated.rowState = 'DIRTY';
        }
        if (updated.fieldErrors?.[`dim_${dimCode}`]) {
          const newErrors = { ...updated.fieldErrors };
          delete newErrors[`dim_${dimCode}`];
          updated.fieldErrors = newErrors;
        }
        return updated;
      })
    );
  };

  // Add new empty row
  const handleAddRow = () => {
    if (isReadOnly) return;

    const newRowId = `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const defaultDims: Record<string, string> = {};
    dimensionBindings.forEach((binding) => {
      const code = binding.dimension?.dimensionCode || '';
      if (code) {
        defaultDims[code] = '';
      }
    });

    const defaultIndicator = indicators.length === 1 ? indicators[0].id : null;
    const defaultPeriod = dataset?.reportingYear ? String(dataset.reportingYear) : new Date().getFullYear().toString();

    const newRow: GridRowData = {
      clientRowId: newRowId,
      period: defaultPeriod,
      barangayId: null,
      indicatorId: defaultIndicator,
      dimensions: defaultDims,
      numericValue: '',
      observationStatus: '',
      notes: '',
      rowState: 'NEW',
      fieldErrors: {},
    };

    setRows((prev) => [newRow, ...prev]);
  };

  // Validate single row locally before dispatching to backend
  const validateRow = (row: GridRowData): { isValid: boolean; errors: Record<string, string> } => {
    const errors: Record<string, string> = {};

    if (!row.period || !row.period.trim()) {
      errors.period = 'Period is required';
    }

    if (indicators.length > 0 && !row.indicatorId) {
      errors.indicatorId = 'Indicator is required';
    }

    if (row.numericValue === '' || row.numericValue === null || isNaN(Number(row.numericValue))) {
      errors.numericValue = 'Valid number required';
    }

    // Required dimensions check
    dimensionBindings.forEach((binding) => {
      const code = binding.dimension?.dimensionCode || '';
      if (binding.isRequired && code) {
        const val = row.dimensions[code];
        if (!val || !val.trim()) {
          errors[`dim_${code}`] = `${binding.dimension?.name || code} is required`;
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Save single row
  const handleSaveRow = async (clientRowId: string) => {
    if (isReadOnly || !dataset) return;

    const targetRow = rows.find((r) => r.clientRowId === clientRowId);
    if (!targetRow) return;

    const { isValid, errors } = validateRow(targetRow);
    if (!isValid) {
      setRows((prev) =>
        prev.map((r) =>
          r.clientRowId === clientRowId
            ? { ...r, rowState: 'ERROR', fieldErrors: errors, errorMessage: 'Validation failed' }
            : r
        )
      );
      toast.error('Please fix validation errors on this row.');
      return;
    }

    // Set row to SAVING
    setRows((prev) =>
      prev.map((r) =>
        r.clientRowId === clientRowId
          ? { ...r, rowState: 'SAVING', errorMessage: undefined }
          : r
      )
    );

    try {
      const numVal = Number(targetRow.numericValue);

      if (targetRow.id) {
        // Update existing observation
        const updated = await updateObservation(table.id, targetRow.id, {
          period: targetRow.period,
          barangayId: targetRow.barangayId,
          indicatorId: targetRow.indicatorId,
          dimensions: targetRow.dimensions,
          numericValue: numVal,
          observationStatus: targetRow.observationStatus || null,
          notes: targetRow.notes || null,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.clientRowId === clientRowId
              ? {
                  ...r,
                  rowState: 'SAVED',
                  errorMessage: undefined,
                  fieldErrors: {},
                  updatedAt: updated.updatedAt,
                }
              : r
          )
        );
        toast.success('Observation updated successfully.');
      } else {
        // Create new observation
        const created = await createObservation(table.id, {
          datasetId: dataset.id,
          period: targetRow.period,
          barangayId: targetRow.barangayId,
          indicatorId: targetRow.indicatorId,
          dimensions: targetRow.dimensions,
          numericValue: numVal,
          observationStatus: targetRow.observationStatus || null,
          notes: targetRow.notes || null,
        });

        setRows((prev) =>
          prev.map((r) =>
            r.clientRowId === clientRowId
              ? {
                  ...r,
                  clientRowId: created.id,
                  id: created.id,
                  rowState: 'SAVED',
                  errorMessage: undefined,
                  fieldErrors: {},
                }
              : r
          )
        );
        toast.success('Observation saved.');
      }
      onRefreshTable?.();
    } catch (err: any) {
      console.error('Save row error:', err);
      const errDetail =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to save observation.';

      setRows((prev) =>
        prev.map((r) =>
          r.clientRowId === clientRowId
            ? {
                ...r,
                rowState: 'ERROR',
                errorMessage: typeof errDetail === 'string' ? errDetail : JSON.stringify(errDetail),
              }
            : r
        )
      );
      toast.error(typeof errDetail === 'string' ? errDetail : 'Save failed.');
    }
  };

  // Delete single row
  const handleDeleteRow = async (clientRowId: string) => {
    if (isReadOnly) return;

    const targetRow = rows.find((r) => r.clientRowId === clientRowId);
    if (!targetRow) return;

    if (!targetRow.id) {
      // Local unpersisted row
      setRows((prev) => prev.filter((r) => r.clientRowId !== clientRowId));
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(clientRowId);
        return next;
      });
      toast.info('Draft row removed.');
      return;
    }

    if (!confirm('Are you sure you want to permanently delete this statistical observation?')) {
      return;
    }

    try {
      await deleteObservation(table.id, targetRow.id);
      setRows((prev) => prev.filter((r) => r.clientRowId !== clientRowId));
      setSelectedRowIds((prev) => {
        const next = new Set(prev);
        next.delete(clientRowId);
        return next;
      });
      toast.success('Observation deleted.');
      onRefreshTable?.();
    } catch (err: any) {
      console.error('Delete error:', err);
      const msg = err?.response?.data?.error?.message || err?.message || 'Failed to delete observation.';
      toast.error(msg);
    }
  };

  // Bulk Save all DIRTY and NEW rows
  const handleBulkSave = async () => {
    if (isReadOnly || !dataset) return;

    const dirtyRows = rows.filter((r) => r.rowState === 'DIRTY' || r.rowState === 'NEW');
    if (dirtyRows.length === 0) {
      toast.info('No changes to save.');
      return;
    }

    // Validate all dirty rows first
    let hasValidationErrors = false;
    const updatedRowsWithValidation = rows.map((row) => {
      if (row.rowState !== 'DIRTY' && row.rowState !== 'NEW') return row;

      const { isValid, errors } = validateRow(row);
      if (!isValid) {
        hasValidationErrors = true;
        return {
          ...row,
          rowState: 'ERROR' as const,
          fieldErrors: errors,
          errorMessage: 'Validation failed on required fields',
        };
      }
      return row;
    });

    if (hasValidationErrors) {
      setRows(updatedRowsWithValidation);
      toast.error('Validation errors found in grid. Please fix highlighted fields before bulk saving.');
      return;
    }

    try {
      setSavingAll(true);

      // Set all dirty rows to SAVING
      setRows((prev) =>
        prev.map((r) =>
          r.rowState === 'DIRTY' || r.rowState === 'NEW'
            ? { ...r, rowState: 'SAVING', errorMessage: undefined }
            : r
        )
      );

      const payload = {
        datasetId: dataset.id,
        observations: dirtyRows.map((r) => ({
          id: r.id, // optional for update
          period: r.period.trim(),
          barangayId: r.barangayId || null,
          indicatorId: r.indicatorId || null,
          dimensions: r.dimensions,
          numericValue: Number(r.numericValue),
          observationStatus: r.observationStatus || null,
          notes: r.notes || null,
        })),
      };

      const result = await bulkSaveObservations(table.id, payload);

      toast.success(
        `Bulk save complete: ${result.created || dirtyRows.length} observations saved successfully.`
      );

      // Reload fresh state from backend to synchronize server IDs
      await loadObservations();
      onRefreshTable?.();
    } catch (err: any) {
      console.error('Bulk save error:', err);
      const errMsg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Bulk save failed. Please check for duplicate coordinates.';

      setRows((prev) =>
        prev.map((r) =>
          r.rowState === 'SAVING'
            ? {
                ...r,
                rowState: 'ERROR',
                errorMessage: typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg),
              }
            : r
        )
      );

      toast.error(typeof errMsg === 'string' ? errMsg : 'Bulk save failed.');
    } finally {
      setSavingAll(false);
    }
  };

  // TSV / Clipboard Paste Parsing
  const handleParsePaste = () => {
    if (!pasteText.trim()) {
      setPasteError('Clipboard text is empty.');
      return;
    }

    try {
      const lines = pasteText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setPasteError('No valid rows found in clipboard data.');
        return;
      }

      const defaultPeriod = dataset?.reportingYear ? String(dataset.reportingYear) : new Date().getFullYear().toString();
      const defaultIndicator = indicators.length === 1 ? indicators[0].id : null;

      const parsedRows: GridRowData[] = [];

      lines.forEach((line, idx) => {
        const columns = line.split('\t').map((c) => c.trim());

        // Dynamic column mapping based on grid structure:
        // Col 0: Period (or fallback default)
        // Col 1: Barangay Name/Code (optional match)
        // Col 2: Indicator Code/Name (optional match)
        // Col 3..N: Bound Dimensions in order
        // Next: Numeric Value
        // Next: Notes / Observation Status

        let colIdx = 0;
        let rowPeriod = defaultPeriod;
        let rowBarangayId: string | null = null;
        let rowIndicatorId = defaultIndicator;

        if (columns[colIdx]) {
          rowPeriod = columns[colIdx];
          colIdx++;
        }

        // Barangay matching
        if (barangays.length > 0 && colIdx < columns.length) {
          const val = columns[colIdx];
          const matchedBg = barangays.find(
            (b) => b.name.toLowerCase() === val.toLowerCase() || b.code === val
          );
          if (matchedBg) {
            rowBarangayId = matchedBg.id;
            colIdx++;
          }
        }

        // Indicator matching
        if (indicators.length > 0 && colIdx < columns.length) {
          const val = columns[colIdx];
          const matchedInd = indicators.find(
            (i) =>
              i.indicatorCode.toLowerCase() === val.toLowerCase() ||
              i.name.toLowerCase() === val.toLowerCase()
          );
          if (matchedInd) {
            rowIndicatorId = matchedInd.id;
            colIdx++;
          }
        }

        // Bound Dimensions
        const rowDims: Record<string, string> = {};
        dimensionBindings.forEach((binding) => {
          const code = binding.dimension?.dimensionCode || '';
          if (code) {
            if (colIdx < columns.length) {
              rowDims[code] = columns[colIdx];
              colIdx++;
            } else {
              rowDims[code] = '';
            }
          }
        });

        // Numeric Value
        let numVal: number | string = '';
        if (colIdx < columns.length) {
          const cleanNum = columns[colIdx].replace(/,/g, '');
          numVal = isNaN(Number(cleanNum)) ? columns[colIdx] : Number(cleanNum);
          colIdx++;
        }

        // Notes
        let rowNotes = '';
        if (colIdx < columns.length) {
          rowNotes = columns[colIdx];
        }

        parsedRows.push({
          clientRowId: `paste-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
          period: rowPeriod,
          barangayId: rowBarangayId,
          indicatorId: rowIndicatorId,
          dimensions: rowDims,
          numericValue: numVal,
          observationStatus: '',
          notes: rowNotes,
          rowState: 'NEW',
          fieldErrors: {},
        });
      });

      setRows((prev) => [...parsedRows, ...prev]);
      setPasteModalOpen(false);
      setPasteText('');
      setPasteError(null);
      toast.success(`Imported ${parsedRows.length} rows from clipboard. Review and click 'Save All Changes'.`);
    } catch (err: any) {
      setPasteError('Failed to parse clipboard data: ' + err.message);
    }
  };

  // Keyboard navigation across cells
  const handleKeyDown = (
    e: React.KeyboardEvent,
    rowIndex: number,
    colKey: string
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move to next row same column or save
      if (rowIndex < rows.length - 1) {
        const nextKey = `${rowIndex + 1}-${colKey}`;
        cellRefs.current[nextKey]?.focus();
      } else {
        handleAddRow();
      }
    }
  };

  // Count dirty rows
  const dirtyCount = rows.filter((r) => r.rowState === 'DIRTY' || r.rowState === 'NEW').length;

  return (
    <div className="space-y-4">
      {/* 1. Grid Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleAddRow}
            disabled={isReadOnly}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Row
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPasteModalOpen(true)}
            disabled={isReadOnly}
            className="h-8 text-xs text-slate-700 dark:text-slate-300"
          >
            <Clipboard className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Paste from Excel
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCsvImportOpen(true)}
            disabled={isReadOnly}
            className="h-8 text-xs text-slate-700 dark:text-slate-300"
            id="btn-import-statistical-csv"
          >
            <Upload className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Import CSV
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadObservations}
            disabled={loading}
            className="h-8 text-xs text-slate-600 dark:text-slate-400"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {dirtyCount > 0 && (
            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 text-xs font-semibold px-2 py-0.5">
              {dirtyCount} unsaved {dirtyCount === 1 ? 'row' : 'rows'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isReadOnly && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>{isViewer ? 'Viewer Mode (Read-Only)' : !dataset ? 'No Dataset Selected' : 'Dataset Locked'}</span>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            onClick={handleBulkSave}
            disabled={isReadOnly || dirtyCount === 0 || savingAll}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm"
          >
            {savingAll ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 mr-1.5" />
            )}
            Save All Changes ({dirtyCount})
          </Button>
        </div>
      </div>

      {/* 2. Interactive Spreadsheet Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading && rows.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
            <p className="text-sm font-medium">Loading statistical observations...</p>
          </div>
        ) : rows.length === 0 ? (
          /* Honest Empty State for Tables with 0 Observations */
          <div className="py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
              <TableIcon className="w-6 h-6" />
            </div>
            <Badge variant="outline" className="mb-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-xs font-semibold">
              EMPTY STATE
            </Badge>
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No observations have been entered for this table yet.
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
              The statistical schema and dimension bindings are active and ready. Start adding statistical records using the button below or paste directly from Excel/CSV.
            </p>
            {!isReadOnly && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  onClick={handleAddRow}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Start Data Entry
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPasteModalOpen(true)}
                  size="sm"
                  className="text-xs"
                >
                  <Clipboard className="w-3.5 h-3.5 mr-1.5" />
                  Paste from Spreadsheet
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 select-none">
                <tr>
                  <th className="py-2.5 px-3 font-bold w-12 text-center text-[11px] border-r border-slate-200 dark:border-slate-700">
                    #
                  </th>
                  <th className="py-2.5 px-3 font-bold w-24 border-r border-slate-200 dark:border-slate-700">
                    State
                  </th>
                  <th className="py-2.5 px-3 font-bold min-w-[100px] border-r border-slate-200 dark:border-slate-700">
                    Period <span className="text-rose-500">*</span>
                  </th>
                  <th className="py-2.5 px-3 font-bold min-w-[140px] border-r border-slate-200 dark:border-slate-700">
                    Barangay
                  </th>

                  {indicators.length > 0 && (
                    <th className="py-2.5 px-3 font-bold min-w-[160px] border-r border-slate-200 dark:border-slate-700">
                      Indicator <span className="text-rose-500">*</span>
                    </th>
                  )}

                  {/* Dynamic bound dimension headers */}
                  {dimensionBindings.map((binding) => (
                    <th
                      key={binding.id}
                      className="py-2.5 px-3 font-bold min-w-[130px] border-r border-slate-200 dark:border-slate-700 bg-indigo-50/50 dark:bg-indigo-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span>{binding.dimension?.name || binding.dimension?.dimensionCode}</span>
                        {binding.isRequired && <span className="text-rose-500 font-bold ml-1">*</span>}
                      </div>
                    </th>
                  ))}

                  <th className="py-2.5 px-3 font-bold min-w-[120px] text-right border-r border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/20">
                    Value <span className="text-rose-500">*</span>
                  </th>

                  <th className="py-2.5 px-3 font-bold min-w-[110px] border-r border-slate-200 dark:border-slate-700">
                    Status Tag
                  </th>

                  <th className="py-2.5 px-3 font-bold min-w-[140px] border-r border-slate-200 dark:border-slate-700">
                    Notes
                  </th>

                  <th className="py-2.5 px-3 font-bold w-24 text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {rows.map((row, index) => {
                  const isDirty = row.rowState === 'DIRTY' || row.rowState === 'NEW';
                  const isSaving = row.rowState === 'SAVING';
                  const isError = row.rowState === 'ERROR';

                  return (
                    <tr
                      key={row.clientRowId}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                        isError
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : isDirty
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : ''
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-1.5 px-2 text-center text-[11px] font-mono text-slate-400 border-r border-slate-100 dark:border-slate-800">
                        {index + 1}
                      </td>

                      {/* Row State Badge */}
                      <td className="py-1.5 px-2.5 border-r border-slate-100 dark:border-slate-800">
                        {row.rowState === 'SAVED' && (
                          <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3 h-3 mr-1 shrink-0" />
                            SAVED
                          </span>
                        )}
                        {row.rowState === 'NEW' && (
                          <span className="inline-flex items-center text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                        {row.rowState === 'DIRTY' && (
                          <span className="inline-flex items-center text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                            DIRTY
                          </span>
                        )}
                        {row.rowState === 'SAVING' && (
                          <span className="inline-flex items-center text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin shrink-0" />
                            SAVING
                          </span>
                        )}
                        {row.rowState === 'ERROR' && (
                          <span
                            className="inline-flex items-center text-[10px] text-rose-600 dark:text-rose-400 font-bold cursor-help"
                            title={row.errorMessage || 'Error on this row'}
                          >
                            <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                            ERROR
                          </span>
                        )}
                      </td>

                      {/* Period Cell */}
                      <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800">
                        <Input
                          ref={(el) => {
                            cellRefs.current[`${index}-period`] = el;
                          }}
                          value={row.period}
                          onChange={(e) => handleCellChange(row.clientRowId, 'period', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'period')}
                          disabled={isReadOnly || isSaving}
                          placeholder="e.g. 2024"
                          className={`h-8 text-xs font-mono bg-transparent ${
                            row.fieldErrors?.period ? 'border-rose-500 focus:ring-rose-500' : ''
                          }`}
                        />
                      </td>

                      {/* Barangay Cell */}
                      <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800">
                        <select
                          value={row.barangayId || ''}
                          onChange={(e) => handleCellChange(row.clientRowId, 'barangayId', e.target.value || null)}
                          disabled={isReadOnly || isSaving}
                          className="w-full h-8 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">(Municipal Total)</option>
                          {barangays.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Indicator Cell (if configured) */}
                      {indicators.length > 0 && (
                        <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800">
                          <select
                            value={row.indicatorId || ''}
                            onChange={(e) => handleCellChange(row.clientRowId, 'indicatorId', e.target.value || null)}
                            disabled={isReadOnly || isSaving}
                            className={`w-full h-8 text-xs bg-transparent border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              row.fieldErrors?.indicatorId ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <option value="">Select Indicator...</option>
                            {indicators.map((ind) => (
                              <option key={ind.id} value={ind.id}>
                                {ind.indicatorCode} - {ind.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}

                      {/* Dynamic Dimension Cells */}
                      {dimensionBindings.map((binding) => {
                        const code = binding.dimension?.dimensionCode || '';
                        const currentVal = row.dimensions[code] || '';
                        const allowedVals = binding.allowedValues || [];
                        const hasError = !!row.fieldErrors?.[`dim_${code}`];

                        return (
                          <td
                            key={binding.id}
                            className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800 bg-indigo-50/20 dark:bg-indigo-950/10"
                          >
                            {allowedVals.length > 0 ? (
                              <select
                                value={currentVal}
                                onChange={(e) => handleDimensionChange(row.clientRowId, code, e.target.value)}
                                disabled={isReadOnly || isSaving}
                                className={`w-full h-8 text-xs bg-transparent border rounded-md px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                  hasError ? 'border-rose-500' : 'border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <option value="">Select...</option>
                                {allowedVals.map((val) => (
                                  <option key={val} value={val}>
                                    {val}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                value={currentVal}
                                onChange={(e) => handleDimensionChange(row.clientRowId, code, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index, `dim_${code}`)}
                                disabled={isReadOnly || isSaving}
                                placeholder={code}
                                className={`h-8 text-xs bg-transparent ${
                                  hasError ? 'border-rose-500 focus:ring-rose-500' : ''
                                }`}
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Numeric Value Cell */}
                      <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800 bg-amber-50/20 dark:bg-amber-950/10">
                        <Input
                          ref={(el) => {
                            cellRefs.current[`${index}-numericValue`] = el;
                          }}
                          type="number"
                          step="any"
                          value={row.numericValue}
                          onChange={(e) => handleCellChange(row.clientRowId, 'numericValue', e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, index, 'numericValue')}
                          disabled={isReadOnly || isSaving}
                          placeholder="0.00"
                          className={`h-8 text-xs text-right font-mono font-semibold bg-transparent ${
                            row.fieldErrors?.numericValue ? 'border-rose-500 focus:ring-rose-500' : ''
                          }`}
                        />
                      </td>

                      {/* Observation Status Tag */}
                      <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800">
                        <select
                          value={row.observationStatus || ''}
                          onChange={(e) => handleCellChange(row.clientRowId, 'observationStatus', e.target.value || null)}
                          disabled={isReadOnly || isSaving}
                          className="w-full h-8 text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-md px-2 focus:outline-none"
                        >
                          <option value="">Normal</option>
                          <option value="ESTIMATED">Estimated</option>
                          <option value="PROVISIONAL">Provisional</option>
                          <option value="FINAL">Final</option>
                        </select>
                      </td>

                      {/* Notes Cell */}
                      <td className="py-1.5 px-2 border-r border-slate-100 dark:border-slate-800">
                        <Input
                          value={row.notes || ''}
                          onChange={(e) => handleCellChange(row.clientRowId, 'notes', e.target.value)}
                          disabled={isReadOnly || isSaving}
                          placeholder="Optional notes"
                          className="h-8 text-xs bg-transparent text-slate-600 dark:text-slate-400"
                        />
                      </td>

                      {/* Actions */}
                      <td className="py-1.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {!isReadOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveRow(row.clientRowId)}
                              disabled={isSaving || (!isDirty && !isError)}
                              className="h-7 w-7 p-0 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                              title="Save this row"
                            >
                              {isSaving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}

                          {!isReadOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRow(row.clientRowId)}
                              disabled={isSaving}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              title="Delete row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Clipboard TSV Paste Modal */}
      {pasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <Clipboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Paste Tabular Data from Excel / Spreadsheet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copy cells from Excel or Google Sheets (Tab-Separated Values) and paste below.
                  </p>
                </div>
              </div>
            </div>

            {pasteError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Expected Column Order:</span>
                <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                  Period → Barangay → Indicator → {dimensionBindings.map((b) => b.dimension?.dimensionCode).join(' → ')} → Value → Notes
                </span>
              </div>
              <textarea
                value={pasteText}
                onChange={(e) => {
                  setPasteText(e.target.value);
                  if (pasteError) setPasteError(null);
                }}
                rows={8}
                placeholder={`2024\tPoblacion\t${indicators[0]?.indicatorCode || 'TOTAL'}\t${dimensionBindings.map((b) => b.allowedValues?.[0] || 'Male').join('\t')}\t1250\tSurvey Notes`}
                className="w-full p-3 font-mono text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPasteModalOpen(false);
                  setPasteText('');
                  setPasteError(null);
                }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
              >
                Import Cells to Grid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Statistical CSV Ingestion Modal */}
      {isCsvImportOpen && (
        <StatisticalCsvImportModal
          isOpen={isCsvImportOpen}
          onClose={() => setIsCsvImportOpen(false)}
          table={table}
          dataset={dataset}
          onSuccess={() => {
            loadObservations();
            if (onRefreshTable) onRefreshTable();
          }}
        />
      )}
    </div>
  );
};
