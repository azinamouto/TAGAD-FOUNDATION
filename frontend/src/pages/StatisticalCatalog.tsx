import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  StatisticalTableCatalogItem,
  DomainSummary,
  StatisticalVerificationStatus,
  StatisticalTableClassification,
} from '../types/statisticalCatalog';
import {
  getStatisticalTables,
  getStatisticalDomains,
} from '../api/statisticalCatalog';
import { TableDetailModal } from '../modules/statisticalCatalog/components/TableDetailModal';
import {
  Search,
  SlidersHorizontal,
  LayoutGrid,
  List,
  CheckCircle2,
  AlertCircle,
  Database,
  BarChart2,
  Layers,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Info,
  Filter,
} from 'lucide-react';

export const StatisticalCatalog: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tables, setTables] = useState<StatisticalTableCatalogItem[]>([]);
  const [domains, setDomains] = useState<DomainSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedDomain, setSelectedDomain] = useState<string>(searchParams.get('domain') || 'ALL');
  const [selectedClassification, setSelectedClassification] = useState<string>(
    searchParams.get('classification') || 'ALL'
  );
  const [selectedVerification, setSelectedVerification] = useState<string>(
    searchParams.get('verification') || 'ALL'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal State
  const [selectedTable, setSelectedTable] = useState<StatisticalTableCatalogItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [tablesData, domainsData] = await Promise.all([
        getStatisticalTables(),
        getStatisticalDomains(),
      ]);

      const items = Array.isArray(tablesData) ? tablesData : (tablesData as any).data || [];
      setTables(items);
      setDomains(domainsData || []);
    } catch (err: any) {
      console.error('Failed to load statistical catalog:', err);
      setError(err?.response?.data?.error || 'Unable to connect to statistical catalog service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync state with URL params
  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchQuery) params.search = searchQuery;
    if (selectedDomain !== 'ALL') params.domain = selectedDomain;
    if (selectedClassification !== 'ALL') params.classification = selectedClassification;
    if (selectedVerification !== 'ALL') params.verification = selectedVerification;
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedDomain, selectedClassification, selectedVerification, setSearchParams]);

  // Client-side filtering & searching
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      // Domain filter
      if (selectedDomain !== 'ALL') {
        const d = selectedDomain.toLowerCase();
        if (!table.domain.toLowerCase().includes(d)) {
          return false;
        }
      }

      // Classification filter
      if (selectedClassification !== 'ALL') {
        if (table.classification !== selectedClassification) {
          return false;
        }
      }

      // Verification status filter
      if (selectedVerification !== 'ALL') {
        if (table.verificationStatus !== selectedVerification) {
          return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchCode = table.tableCode.toLowerCase().includes(query);
        const matchNumber = String(table.tableNumber).includes(query);
        const matchTitle = table.title.toLowerCase().includes(query);
        const matchDomain = table.domain.toLowerCase().includes(query);
        const matchDesc = table.description ? table.description.toLowerCase().includes(query) : false;
        const matchUnit = table.expectedUnit ? table.expectedUnit.toLowerCase().includes(query) : false;

        if (!matchCode && !matchNumber && !matchTitle && !matchDomain && !matchDesc && !matchUnit) {
          return false;
        }
      }

      return true;
    });
  }, [tables, selectedDomain, selectedClassification, selectedVerification, searchQuery]);

  // Stats calculation
  const totalTables = tables.length;
  const verifiedCount = tables.filter(
    (t) => t.verificationStatus === StatisticalVerificationStatus.VERIFIED
  ).length;
  const unverifiedCount = totalTables - verifiedCount;
  const indicatorCount = tables.filter(
    (t) => t.classification === StatisticalTableClassification.INDICATOR
  ).length;

  const handleInspect = (table: StatisticalTableCatalogItem) => {
    setSelectedTable(table);
    setIsModalOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDomain('ALL');
    setSelectedClassification('ALL');
    setSelectedVerification('ALL');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white">
              <Database className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              PSA CBMS Statistical Table Catalog
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Official 69-table tabulation registry for the Community-Based Monitoring System (CBMS). Explore thematic layout contracts, dimensional grain, and indicator definitions across all 9 canonical domains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total PSA Tables
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {totalTables}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Tables 1 through 69</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Canonical Domains
          </div>
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {domains.length || 9}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Thematic classifications</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Analytical Indicators
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {indicatorCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Target SDG & GAD metrics</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Verification Contract
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {unverifiedCount} Unverified
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {verifiedCount} Verified / {unverifiedCount} Contract Defined
          </div>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Canonical Domains Filter
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
          <button
            onClick={() => setSelectedDomain('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedDomain === 'ALL'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>All Domains</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {tables.length}
            </span>
          </button>

          {domains.map((dom) => {
            const isActive = selectedDomain === dom.domain;
            return (
              <button
                key={dom.domain}
                onClick={() => setSelectedDomain(dom.domain)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{dom.domain}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {dom.tableCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search 69 tables by title, code (e.g. STAT-TAB-01), domain, or unit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Selectors & View Toggle */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Classification */}
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Classifications</option>
              <option value={StatisticalTableClassification.AGGREGATED_STATISTICS}>
                Aggregated Statistics
              </option>
              <option value={StatisticalTableClassification.INDICATOR}>
                Indicators Only
              </option>
            </select>

            {/* Verification Status */}
            <select
              value={selectedVerification}
              onChange={(e) => setSelectedVerification(e.target.value)}
              className="px-2.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value={StatisticalVerificationStatus.VERIFIED}>Verified</option>
              <option value={StatisticalVerificationStatus.UNVERIFIED}>Unverified</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800/60 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Counter & Active Filter Tags */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredTables.length}</strong> of{' '}
            {tables.length} statistical tables
          </div>
          {(selectedDomain !== 'ALL' ||
            selectedClassification !== 'ALL' ||
            selectedVerification !== 'ALL' ||
            searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Loading PSA CBMS 69-table catalog...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center space-y-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/50">
          <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{error}</p>
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-12 text-center space-y-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Filter className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No statistical tables matched your filter
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search keywords, clearing domain filters, or switching verification categories.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-3.5 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTables.map((table) => {
            const isVerified = table.verificationStatus === StatisticalVerificationStatus.VERIFIED;
            const isIndicator = table.classification === StatisticalTableClassification.INDICATOR;

            return (
              <div
                key={table.tableCode}
                onClick={() => handleInspect(table)}
                className="group p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-700/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between cursor-pointer space-y-4"
              >
                <div className="space-y-2.5">
                  {/* Card Header Tags */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {table.tableCode}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        #{table.tableNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Verification / Data Status Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                          isVerified || table.hasRealData || table.dataStatus === 'REAL DATA'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {isVerified || table.hasRealData || table.dataStatus === 'REAL DATA' ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            REAL DATA
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-2.5 h-2.5" />
                            UNVERIFIED
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                    {table.title}
                  </h3>

                  {/* Domain Tag */}
                  <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{table.domain}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {table.description || 'PSA official community-based monitoring tabulation.'}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                    {table.expectedUnit || 'Households'}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                    Inspect Contract <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4 w-28">Code</th>
                  <th className="py-3 px-4">Official PSA Table Title</th>
                  <th className="py-3 px-4">Canonical Domain</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Expected Unit</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTables.map((table) => {
                  const isVerified = table.verificationStatus === StatisticalVerificationStatus.VERIFIED;
                  const isIndicator = table.classification === StatisticalTableClassification.INDICATOR;

                  return (
                    <tr
                      key={table.tableCode}
                      onClick={() => handleInspect(table)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-slate-400">{table.tableNumber}</td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {table.tableCode}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                        {table.title}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{table.domain}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            isIndicator
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                          }`}
                        >
                          {isIndicator ? 'Indicator' : 'Aggregated'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{table.expectedUnit || 'Households'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                            isVerified || table.hasRealData || table.dataStatus === 'REAL DATA'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {isVerified || table.hasRealData || table.dataStatus === 'REAL DATA'
                            ? 'REAL DATA'
                            : 'UNVERIFIED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspect(table);
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded transition-colors"
                        >
                          View Contract
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table Detail Inspection Modal */}
      <TableDetailModal
        table={selectedTable}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default StatisticalCatalog;
