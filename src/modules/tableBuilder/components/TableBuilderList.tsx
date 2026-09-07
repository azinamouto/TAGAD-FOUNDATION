import React, { useState, useEffect } from 'react';
import {
  TableDefinitionItem,
  TableListQueryParams,
  StatisticalTableClassification,
  StatisticalVerificationStatus,
} from '../../../types/tableBuilder';
import { listTables } from '../../../api/tableBuilder';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Search,
  PlusCircle,
  Lock,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  SlidersHorizontal,
  Activity,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Eye,
  Edit2,
  Shield,
  HelpCircle,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

interface TableBuilderListProps {
  onSelectTable: (tableId: string) => void;
  onOpenCreateModal: () => void;
}

export const TableBuilderList: React.FC<TableBuilderListProps> = ({
  onSelectTable,
  onOpenCreateModal,
}) => {
  const { isAdmin, isSuperAdmin } = useAuth();
  const canMutate = isAdmin || isSuperAdmin;

  const [tables, setTables] = useState<TableDefinitionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filter state
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [systemTableFilter, setSystemTableFilter] = useState('ALL');
  const [classificationFilter, setClassificationFilter] = useState('ALL');
  const [verificationFilter, setVerificationFilter] = useState('ALL');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch Tables
  const fetchTableData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: TableListQueryParams = {
        page,
        limit,
        search: debouncedSearch || undefined,
        domain: domainFilter !== 'ALL' ? domainFilter : undefined,
        classification: classificationFilter !== 'ALL' ? classificationFilter : undefined,
        verificationStatus: verificationFilter !== 'ALL' ? verificationFilter : undefined,
        isSystemTable:
          systemTableFilter === 'SYSTEM'
            ? true
            : systemTableFilter === 'CUSTOM'
            ? false
            : undefined,
      };

      const response = await listTables(params);
      setTables(response.tables || []);
      setTotalCount(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to load table definitions:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Failed to connect to Table Builder catalog.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [
    page,
    debouncedSearch,
    domainFilter,
    systemTableFilter,
    classificationFilter,
    verificationFilter,
  ]);

  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDomainFilter('ALL');
    setSystemTableFilter('ALL');
    setClassificationFilter('ALL');
    setVerificationFilter('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 inline-flex items-center gap-1">
              <Database className="w-3 h-3" />
              Statistical CMS & Table Catalog
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              Sprint 12 / Issue #14
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Table Builder & Indicator Registry
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Configure canonical PSA 69-table gender statistics, define custom municipal tabulations, bind analytical disaggregation dimensions, and manage computed GAD indicators.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTableData}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {canMutate && (
            <Button
              size="sm"
              onClick={onOpenCreateModal}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Create Custom Table
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Catalog Items
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {totalCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Matching active filters</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              PSA System Tables
            </span>
            <Lock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            69
          </div>
          <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Canonical #1–#69 (Protected)</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Custom Tabulations
            </span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">
            {Math.max(0, totalCount > 69 ? totalCount - 69 : 0)}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Custom & LGU-defined</p>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Access Clearance
            </span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white mt-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {canMutate ? 'Admin / Authoritative' : 'Catalog Viewer'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {canMutate ? 'Mutations Permitted' : 'Read-Only Mode'}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search table code, title, domain, or unit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* System vs Custom */}
          <div>
            <select
              value={systemTableFilter}
              onChange={(e) => {
                setSystemTableFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Table Types</option>
              <option value="SYSTEM">System Tables (#1–69)</option>
              <option value="CUSTOM">Custom Tables (#100+)</option>
            </select>
          </div>

          {/* Classification */}
          <div>
            <select
              value={classificationFilter}
              onChange={(e) => {
                setClassificationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Classifications</option>
              <option value={StatisticalTableClassification.AGGREGATED_STATISTICS}>Aggregated Stats</option>
              <option value={StatisticalTableClassification.INDICATOR}>Indicator Tables</option>
              <option value={StatisticalTableClassification.DERIVED_METRIC}>Derived Metrics</option>
              <option value={StatisticalTableClassification.REFERENCE_DATA}>Reference Data</option>
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => {
                setVerificationFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Data Statuses</option>
              <option value={StatisticalVerificationStatus.VERIFIED}>REAL DATA (Verified)</option>
              <option value={StatisticalVerificationStatus.PROVISIONAL}>Provisional</option>
              <option value={StatisticalVerificationStatus.UNVERIFIED}>UNVERIFIED (Placeholder)</option>
            </select>
          </div>
        </div>

        {/* Active filter reset if any active */}
        {(search ||
          systemTableFilter !== 'ALL' ||
          classificationFilter !== 'ALL' ||
          verificationFilter !== 'ALL' ||
          domainFilter !== 'ALL') && (
          <div className="flex items-center justify-between text-xs pt-1 text-slate-500 border-t border-slate-100 dark:border-slate-800">
            <span>Filters applied. Showing {tables.length} of {totalCount} records.</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTableData}
            className="text-xs border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Tables List / Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
            <p>Loading statistical table catalog...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              No statistical table definitions found
            </p>
            <p className="max-w-md mx-auto text-slate-400">
              Try adjusting your search or filter parameters.
            </p>
            {canMutate && (
              <Button
                size="sm"
                onClick={onOpenCreateModal}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white mt-2"
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
                Create First Custom Table
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 w-16">#</th>
                  <th className="py-3 px-4 w-32">Table Code</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4 w-44">Domain</th>
                  <th className="py-3 px-4 w-32">Classification</th>
                  <th className="py-3 px-4 w-32">Data Status</th>
                  <th className="py-3 px-4 w-28 text-center">Structure</th>
                  <th className="py-3 px-4 w-24 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tables.map((table) => {
                  const isSystem = table.isSystemTable;
                  const isVerified =
                    table.verificationStatus === StatisticalVerificationStatus.VERIFIED;
                  const isIndicator =
                    table.classification === StatisticalTableClassification.INDICATOR;

                  return (
                    <tr
                      key={table.id}
                      onClick={() => onSelectTable(table.id)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      {/* Table Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        #{table.tableNumber}
                      </td>

                      {/* Code + Type badge */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">
                            {table.tableCode}
                          </span>
                          <div>
                            {isSystem ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                                <Lock className="w-2.5 h-2.5" />
                                SYSTEM
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded">
                                <Sparkles className="w-2.5 h-2.5" />
                                CUSTOM
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 max-w-md">
                          <div className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {table.title}
                          </div>
                          {table.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {table.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Domain */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">
                          {table.domain}
                        </span>
                      </td>

                      {/* Classification */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            isIndicator
                              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {isIndicator ? 'Indicator Table' : 'Aggregated Stats'}
                        </span>
                      </td>

                      {/* Data Status */}
                      <td className="py-3.5 px-4">
                        {isVerified || table.hasRealData || table.dataStatus === 'REAL DATA' ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            REAL DATA
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            UNVERIFIED
                          </span>
                        )}
                      </td>

                      {/* Dimensions & Indicators Count */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                          <span
                            title="Bound Dimensions"
                            className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                          >
                            <SlidersHorizontal className="w-2.5 h-2.5 inline mr-1 text-slate-400" />
                            {table.dimensionCount !== undefined
                              ? table.dimensionCount
                              : table.dimensionBindings?.length || 0}
                          </span>
                          <span
                            title="Indicators"
                            className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded"
                          >
                            <Activity className="w-2.5 h-2.5 inline mr-1 text-slate-400" />
                            {table.indicatorCount !== undefined
                              ? table.indicatorCount
                              : table.indicators?.length || 0}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTable(table.id);
                          }}
                          className="text-xs h-7 px-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing Page <strong className="text-slate-900 dark:text-white">{page}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{totalPages}</strong> (
            {totalCount} total tables)
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="text-xs h-8 px-2.5"
            >
              <ChevronLeft className="w-3.5 h-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="text-xs h-8 px-2.5"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
