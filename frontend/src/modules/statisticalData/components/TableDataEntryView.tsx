import React, { useState, useEffect } from 'react';
import { TableDefinitionItem, DatasetItem } from '../../../types/statisticalData';
import { getTableById } from '../../../api/tableBuilder';
import { DatasetSelector } from './DatasetSelector';
import { DataEntryGrid } from './DataEntryGrid';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  ArrowLeft,
  Table as TableIcon,
  Sliders,
  BarChart3,
  Layers,
  Database,
  Calendar,
  HelpCircle,
  Loader2,
  Info,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';

interface TableDataEntryViewProps {
  tableId: string;
  onBack: () => void;
  selectedDataset: DatasetItem | null;
  onSelectDataset: (dataset: DatasetItem | null) => void;
}

export const TableDataEntryView: React.FC<TableDataEntryViewProps> = ({
  tableId,
  onBack,
  selectedDataset,
  onSelectDataset,
}) => {
  const [table, setTable] = useState<TableDefinitionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTableDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTableById(tableId);
      setTable(data);
    } catch (err: any) {
      console.error('Failed to load table definition:', err);
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to load table definition.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableDetail();
  }, [tableId]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        <p className="text-sm font-medium">Loading statistical table workspace...</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Table Not Found</h3>
        <p className="text-xs text-slate-500 mt-1 mb-5">{error || 'Unable to retrieve table details.'}</p>
        <Button onClick={onBack} size="sm" variant="outline" className="text-xs">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Catalog
        </Button>
      </div>
    );
  }

  const dimsCount = table.dimensionBindings?.length || table.dimensionCount || 0;
  const indsCount = table.indicators?.length || table.indicatorCount || 0;
  const totalAttributes = dimsCount + indsCount;

  return (
    <div className="space-y-6">
      {/* 1. Top Navigation & Table Header Banner */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 -ml-2 h-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to 69 Statistical Tables Catalog
        </Button>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-xs border border-indigo-200 dark:border-indigo-800">
                  Table #{String(table.tableNumber || 0).padStart(2, '0')}
                </span>
                <span className="font-mono text-xs text-slate-500 font-semibold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                  {table.tableCode}
                </span>
                <Badge variant="outline" className="text-[11px] font-semibold">
                  {table.domain}
                </Badge>
                {table.classification && (
                  <Badge variant="secondary" className="text-[10px]">
                    {table.classification}
                  </Badge>
                )}
                {table.isSystemTable && (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">
                    PSA/CBMS System Table
                  </Badge>
                )}
              </div>

              <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {table.title}
              </h1>

              {table.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-3xl">
                  {table.description}
                </p>
              )}
            </div>

            {/* Total Attributes Card Badge */}
            <div className="flex items-center gap-2 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-xl shrink-0">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Total Attributes
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-indigo-950 dark:text-indigo-100">{totalAttributes}</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    ({dimsCount} Dims + {indsCount} Inds)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bound Dimensions & Indicators Reference Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">Bound Dimensions:</span>
              {table.dimensionBindings && table.dimensionBindings.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {table.dimensionBindings.map((b) => (
                    <span
                      key={b.id}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-mono"
                      title={b.allowedValues?.length ? `Allowed: ${b.allowedValues.join(', ')}` : 'Free text'}
                    >
                      {b.dimension?.name || b.dimension?.dimensionCode}
                      {b.isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400 italic">None (Municipal Aggregate)</span>
              )}
            </div>

            {table.indicators && table.indicators.length > 0 && (
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 ml-auto">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-slate-700 dark:text-slate-300">Indicators:</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {table.indicators.length} configured
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Target Dataset Context Bar */}
      <DatasetSelector
        selectedDataset={selectedDataset}
        onSelectDataset={onSelectDataset}
      />

      {/* 3. Interactive Data Entry Spreadsheet Grid */}
      <DataEntryGrid
        table={table}
        dataset={selectedDataset}
        onRefreshTable={fetchTableDetail}
      />
    </div>
  );
};
