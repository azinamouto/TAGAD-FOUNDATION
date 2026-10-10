import { StatisticalSummary } from './StatisticalSummary';
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
      <div className="py-24 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <p className="text-sm font-medium">Loading statistical table workspace...</p>
      </div>
    );
  }

  if (error || !table) {
    return (
      <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-8 text-center max-w-lg mx-auto mt-10">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-foreground dark:text-foreground">Table Not Found</h3>
        <p className="text-xs text-muted-foreground mt-1 mb-5">{error || 'Unable to retrieve table details.'}</p>
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
      {table.isSystemTable && selectedDataset && <StatisticalSummary key={`${tableId}:${selectedDataset.id}`} tableId={table.id} datasetId={selectedDataset.id} />}
      {/* 1. Top Navigation & Table Header Banner */}
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="text-xs text-muted-foreground dark:text-muted-foreground hover:text-primary dark:hover:text-primary -ml-2 h-8"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to 69 Statistical Tables Catalog
        </Button>

        <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-accent dark:bg-accent/60 text-primary dark:text-primary font-mono font-bold text-xs border border-primary dark:border-primary">
                  Table #{String(table.tableNumber || 0).padStart(2, '0')}
                </span>
                <span className="font-mono text-xs text-muted-foreground font-semibold bg-muted dark:bg-muted px-2 py-0.5 rounded">
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

              <h1 className="text-xl font-black text-foreground dark:text-foreground tracking-tight">
                {table.title}
              </h1>

              {table.description && (
                <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-3xl">
                  {table.description}
                </p>
              )}
            </div>

            {/* Total Attributes Card Badge */}
            <div className="flex items-center gap-2 bg-accent/50 dark:bg-accent/30 border border-primary dark:border-primary/50 p-3 rounded-xl shrink-0">
              <div className="p-2 rounded-lg bg-accent dark:bg-accent/50 text-primary dark:text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary">
                  Total Attributes
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-primary dark:text-primary">{totalAttributes}</span>
                  <span className="text-[10px] text-primary dark:text-primary font-medium">
                    ({dimsCount} Dims + {indsCount} Inds)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bound Dimensions & Indicators Reference Bar */}
          <div className="mt-4 pt-3 border-t border-border dark:border-border flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground dark:text-muted-foreground">
              <Sliders className="w-3.5 h-3.5 text-primary" />
              <span className="font-semibold text-foreground dark:text-foreground">Bound Dimensions:</span>
              {table.dimensionBindings && table.dimensionBindings.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {table.dimensionBindings.map((b) => (
                    <span
                      key={b.id}
                      className="px-1.5 py-0.5 rounded bg-muted dark:bg-muted text-foreground dark:text-foreground text-[11px] font-mono"
                      title={b.allowedValues?.length ? `Allowed: ${b.allowedValues.join(', ')}` : 'Free text'}
                    >
                      {b.dimension?.name || b.dimension?.dimensionCode}
                      {b.isRequired && <span className="text-rose-500 font-bold ml-0.5">*</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground italic">None (Municipal Aggregate)</span>
              )}
            </div>

            {table.indicators && table.indicators.length > 0 && (
              <div className="flex items-center gap-1.5 text-muted-foreground dark:text-muted-foreground ml-auto">
                <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold text-foreground dark:text-foreground">Indicators:</span>
                <span className="text-xs text-muted-foreground dark:text-muted-foreground font-mono">
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
