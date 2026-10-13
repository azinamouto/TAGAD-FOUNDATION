import React, { useState, useEffect, useMemo } from 'react';
import { TableDefinitionItem, DatasetItem } from '../../../types/statisticalData';
import { listTables } from '../../../api/tableBuilder';
import { listDatasets } from '../../../api/statisticalData';
import { DatasetSelector } from './DatasetSelector';
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
  Table as TableIcon,
  Search,
  Filter,
  Layers,
  BarChart3,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Database,
  Loader2,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StatisticalDataCatalogProps {
  onSelectTable: (table: TableDefinitionItem) => void;
  selectedDataset: DatasetItem | null;
  onSelectDataset: (dataset: DatasetItem | null) => void;
}

export const StatisticalDataCatalog: React.FC<StatisticalDataCatalogProps> = ({
  onSelectTable,
  selectedDataset,
  onSelectDataset,
}) => {
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableDefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Load the 69 seeded tables from authoritative backend API
  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await listTables({ limit: 100 });
      setTables(res.tables || []);
    } catch (err) {
      console.error('Failed to load statistical table catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // Summary Metrics derivation from actual loaded metadata
  const summary = useMemo(() => {
    const totalTables = tables.length;
    let totalDimensions = 0;
    let totalIndicators = 0;
    let totalAttributes = 0;

    tables.forEach((t) => {
      const dims = t.dimensionCount ?? (t.dimensionBindings?.length || 0);
      const inds = t.indicatorCount ?? (t.indicators?.length || 0);
      totalDimensions += dims;
      totalIndicators += inds;
      totalAttributes += dims + inds;
    });

    return {
      totalTables,
      totalDimensions,
      totalIndicators,
      totalAttributes,
    };
  }, [tables]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Search matching: table number, tableCode, title, or domain
      const search = searchQuery.toLowerCase().trim();
      const matchSearch =
        !search ||
        table.title.toLowerCase().includes(search) ||
        table.tableCode.toLowerCase().includes(search) ||
        String(table.tableNumber).includes(search) ||
        table.domain.toLowerCase().includes(search);

      // Domain filter
      const matchDomain =
        domainFilter === 'ALL' ||
        table.domain.toUpperCase() === domainFilter.toUpperCase();

      // Data Status filter
      const isVerified =
        table.verificationStatus === 'VERIFIED' ||
        table.hasRealData ||
        table.dataStatus === 'REAL DATA';
      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'REAL_DATA' && isVerified) ||
        (statusFilter === 'UNVERIFIED' && !isVerified);

      return matchSearch && matchDomain && matchStatus;
    });
  }, [tables, searchQuery, domainFilter, statusFilter]);

  // Unique domains present in actual data
  const domains = useMemo(() => {
    const set = new Set<string>();
    tables.forEach((t) => {
      if (t.domain) set.add(t.domain);
    });
    return Array.from(set).sort();
  }, [tables]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Dataset Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="bg-accent dark:bg-accent/50 text-primary dark:text-primary border-primary dark:border-primary text-[11px] font-semibold">
              <FileSpreadsheet className="w-3 h-3 mr-1 inline" />
              Statistical Data Entry Workspace
            </Badge>
            <Badge variant="outline" className="text-[11px] text-muted-foreground font-mono">
              Retained Statistical Tables
            </Badge>
          </div>
          <h1 className="text-2xl font-black text-foreground dark:text-foreground tracking-tight">
            Statistical Data Entry & Catalog
          </h1>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground max-w-2xl mt-0.5">
            Select an authoritative statistical table from the 69 seeded municipal definitions to enter, edit, and bulk-import gender-disaggregated observations into DRAFT datasets.
          </p>
        </div>
      </div>

      {/* 2. Target Dataset Selector Banner */}
      <DatasetSelector
        selectedDataset={selectedDataset}
        onSelectDataset={onSelectDataset}
      />

      {/* 3. Top-Level Summary Analytics Derived from Authoritative Backend Data */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground">Total Tables</span>
            <div className="p-1.5 rounded-lg bg-accent dark:bg-accent/50 text-primary dark:text-primary">
              <TableIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground dark:text-foreground">{summary.totalTables}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Seeded Tables</span>
          </div>
        </div>

        <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground">Bound Dimensions</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Sliders className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground dark:text-foreground">{summary.totalDimensions}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Disaggregations</span>
          </div>
        </div>

        <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground dark:text-muted-foreground">Configured Indicators</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-foreground dark:text-foreground">{summary.totalIndicators}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Metrics</span>
          </div>
        </div>

        <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-3.5 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white dark:from-indigo-950/20 dark:to-slate-900 border-primary/60 dark:border-primary/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary dark:text-primary">Total Attributes</span>
            <div className="p-1.5 rounded-lg bg-accent dark:bg-accent/50 text-primary dark:text-primary">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-primary dark:text-primary">{summary.totalAttributes}</span>
            <span className="text-[11px] text-primary dark:text-primary font-semibold font-mono">(Dims + Inds)</span>
          </div>
        </div>
      </div>

      {/* 4. Search and Filter Bar */}
      <div className="bg-card dark:bg-background border border-border dark:border-border rounded-xl p-3.5 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, code (e.g. T-01), #..."
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
              <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Filter by Domain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Domains ({tables.length})</SelectItem>
              {domains.map((dom) => (
                <SelectItem key={dom} value={dom} className="text-xs">
                  {dom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
              <SelectValue placeholder="Data Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Data Status</SelectItem>
              <SelectItem value="REAL_DATA" className="text-xs">REAL DATA</SelectItem>
              <SelectItem value="UNVERIFIED" className="text-xs">UNVERIFIED</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || domainFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setDomainFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="h-9 text-xs text-muted-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* 5. 69 Statistical Table Catalog List / Grid */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 bg-card dark:bg-background border border-border dark:border-border rounded-xl flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-sm font-medium">Loading authoritative 69 Statistical Table Catalog...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="py-16 bg-card dark:bg-background border border-border dark:border-border rounded-xl text-center px-4">
            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground dark:text-foreground">No matching tables found</h3>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or domain filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredTables.map((table) => {
              const dims = table.dimensionCount ?? (table.dimensionBindings?.length || 0);
              const inds = table.indicatorCount ?? (table.indicators?.length || 0);
              const totalAttrs = dims + inds;

              return (
                <div
                  key={table.id}
                  className="bg-card dark:bg-background border border-border dark:border-border hover:border-primary dark:hover:border-primary rounded-xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-2.5">
                    {/* Top row: Table Number & Domain badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-accent dark:bg-accent/60 text-primary dark:text-primary font-mono font-bold text-xs border border-primary dark:border-primary">
                          #{String(table.tableNumber || 0).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground font-semibold">
                          {table.tableCode}
                        </span>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground border-border dark:border-border"
                      >
                        {table.domain}
                      </Badge>
                    </div>

                    {/* Table Title */}
                    <div>
                      <h3 className="text-sm font-bold text-foreground dark:text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-2">
                        {table.title}
                      </h3>
                      {table.description && (
                        <p className="text-[11px] text-muted-foreground dark:text-muted-foreground line-clamp-2 mt-1">
                          {table.description}
                        </p>
                      )}
                    </div>

                    {/* Attribute Summary Calculation */}
                    <div className="grid grid-cols-3 gap-1.5 py-2 px-2.5 bg-muted dark:bg-muted/60 rounded-lg border border-border dark:border-border/80 text-center">
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-medium">Dimensions</span>
                        <span className="text-xs font-bold text-foreground dark:text-foreground">{dims}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-muted-foreground font-medium">Indicators</span>
                        <span className="text-xs font-bold text-foreground dark:text-foreground">{inds}</span>
                      </div>
                      <div className="border-l border-border dark:border-border pl-1">
                        <span className="block text-[10px] font-bold text-primary dark:text-primary">Attributes</span>
                        <span className="text-xs font-black text-primary dark:text-primary">{totalAttrs}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer status & Action */}
                  <div className="mt-4 pt-3 border-t border-border dark:border-border flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {table.verificationStatus === 'VERIFIED' || table.hasRealData || table.dataStatus === 'REAL DATA' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          REAL DATA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          UNVERIFIED
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] bg-muted dark:bg-muted/50 text-muted-foreground border-border dark:border-border font-medium">
                        INPUT-READY
                      </Badge>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => onSelectTable(table)}
                      className="h-8 text-xs bg-primary hover:bg-primary text-white font-medium group-hover:shadow-sm"
                    >
                      <span>Enter Data</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
