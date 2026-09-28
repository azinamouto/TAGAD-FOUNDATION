import React, { useEffect, useState } from 'react';
import { Search, ArrowUpDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { publicApi } from '../../api/publicApi';
import { PublicDemographicsData, PublicBarangay } from '../../types/public.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PublicDemographics: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedBarangayId, setSelectedBarangayId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'total' | 'female' | 'male' | 'barangay'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [data, setData] = useState<PublicDemographicsData | null>(null);
  const [barangays, setBarangays] = useState<PublicBarangay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBarangays = async () => {
      try {
        const brgyList = await publicApi.getBarangays();
        setBarangays(Array.isArray(brgyList) ? brgyList : []);
      } catch (err) {
        console.error('Failed to load barangays list:', err);
        setBarangays([]);
      }
    };
    fetchBarangays();
  }, []);

  const loadDemographics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getDemographics({
        year: selectedYear,
        barangayId: selectedBarangayId || undefined,
      });
      setData(res || null);
    } catch (err: any) {
      console.error('Failed to load demographics:', err);
      setError(err?.response?.data?.error?.message || 'Failed to retrieve demographic statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDemographics();
  }, [selectedYear, selectedBarangayId]);

  const totals = data?.totals || null;
  const bySector = Array.isArray(data?.bySector) ? data.bySector : [];
  const rawBarangays = Array.isArray(data?.byBarangay) ? data.byBarangay : [];

  const filteredBarangays = rawBarangays
    .filter((b) => (b?.barangay || '').toLowerCase().includes((searchTerm || '').toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'barangay') {
        comparison = (a?.barangay || '').localeCompare(b?.barangay || '');
      } else {
        comparison = ((a && a[sortField]) || 0) - ((b && b[sortField]) || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const toggleSort = (field: 'total' | 'female' | 'male' | 'barangay') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header Section */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground dark:text-muted-foreground">
          Demographic Registry • Talibon, Bohol
        </div>
        <h1 className="text-3xl font-semibold text-foreground dark:text-foreground tracking-tight">
          Sex-Disaggregated Demographics
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-3xl leading-relaxed">
          Aggregated demographic indicators of participants reached across Talibon&apos;s 25 mainland and island barangays. Records are maintained to monitor equitable service delivery.
        </p>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Filter Controls */}
      <section className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="demographics-year" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Year:
            </label>
            <select
              id="demographics-year"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="demographics-barangay" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Barangay:
            </label>
            <select
              id="demographics-barangay"
              value={selectedBarangayId}
              onChange={(e) => setSelectedBarangayId(e.target.value)}
              className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            >
              <option value="">All 25 Barangays</option>
              {(barangays || []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={loadDemographics}
          className="text-xs font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white underline"
        >
          Refresh Data
        </button>
      </section>

      {/* Loading & Error State */}
      {loading && (
        <div className="py-16">
          <LoadingSpinner size="lg" text="Loading demographic data..." />
        </div>
      )}

      {error && !loading && (
        <div className="py-8 space-y-3">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
            Failed to Load Data
          </h3>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={loadDemographics}
            className="text-xs font-medium text-foreground dark:text-foreground underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && totals && (
        <div className="space-y-12">
          {/* Key Totals Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-1 border-l-2 border-border dark:border-white pl-4">
              <div className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">
                Total Reach
              </div>
              <div className="text-3xl font-semibold text-foreground dark:text-foreground tabular-nums">
                {totals.totalBeneficiaries.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                Registered constituents in GAD programs
              </div>
            </div>

            <div className="space-y-1 border-l-2 border-rose-600 pl-4">
              <div className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">
                Female Reach
              </div>
              <div className="text-3xl font-semibold text-foreground dark:text-foreground tabular-nums">
                {totals.female.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {totals.femalePercentage.toFixed(1)}% of total participants
              </div>
            </div>

            <div className="space-y-1 border-l-2 border-blue-600 pl-4">
              <div className="text-xs text-muted-foreground dark:text-muted-foreground font-medium">
                Male Reach
              </div>
              <div className="text-3xl font-semibold text-foreground dark:text-foreground tabular-nums">
                {totals.male.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                {totals.malePercentage.toFixed(1)}% of total participants
              </div>
            </div>
          </div>

          {/* Sector Breakdown */}
          <div className="space-y-4 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
                Special Sector Distribution
              </h2>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Beneficiaries tracked across special sectors (PWD, 4Ps, Solo Parents, Senior Citizens, Youth, IP)
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {bySector.map((sec) => {
                const pct = sec.percentage ? sec.percentage.toFixed(1) : '0';
                return (
                  <div
                    key={sec.sector}
                    className="border-t border-border dark:border-border pt-3 space-y-1"
                  >
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                      {sec.sector}
                    </div>
                    <div className="text-xl font-semibold text-foreground dark:text-foreground tabular-nums">
                      {sec.count.toLocaleString()}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Barangay Chart */}
          <div className="space-y-4 pt-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
                Barangay Reach Comparison
              </h2>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Sex-disaggregated participant volume per barangay
              </p>
            </div>

            <div className="h-64 w-full">
              {filteredBarangays.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredBarangays} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <XAxis
                      dataKey="barangay"
                      tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--popover)',
                        borderColor: 'var(--chart-1)',
                        borderRadius: '4px',
                        color: 'var(--popover-foreground)',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="female" name="Female" fill="var(--chart-female)" stackId="a" />
                    <Bar dataKey="male" name="Male" fill="var(--chart-male)" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  No records match the current filter criteria.
                </div>
              )}
            </div>
          </div>

          {/* Barangay Granular Data Table */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
                  Barangay Directory
                </h2>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Showing {filteredBarangays.length} of {rawBarangays.length} barangays
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter barangay..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground placeholder-slate-400 focus:outline-none focus:border-border"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border dark:border-border text-muted-foreground dark:text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">
                      <button
                        type="button"
                        onClick={() => toggleSort('barangay')}
                        className="flex items-center gap-1 hover:text-foreground dark:hover:text-white"
                      >
                        <span>Barangay</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('female')}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white"
                      >
                        <span>Female Reach</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('male')}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white"
                      >
                        <span>Male Reach</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort('total')}
                        className="inline-flex items-center gap-1 hover:text-foreground dark:hover:text-white"
                      >
                        <span>Total</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-right">Female %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border">
                  {filteredBarangays.map((b) => {
                    const ratio = b.total > 0 ? (b.female / b.total) * 100 : 0;
                    return (
                      <tr
                        key={b.barangay}
                        className="hover:bg-muted dark:hover:bg-muted/40"
                      >
                        <td className="py-2 px-3 font-medium text-foreground dark:text-foreground">
                          {b.barangay}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground dark:text-foreground tabular-nums">
                          {b.female.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-foreground dark:text-foreground tabular-nums">
                          {b.male.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-foreground dark:text-foreground tabular-nums">
                          {b.total.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                          {ratio.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBarangays.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No barangays match the search term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

