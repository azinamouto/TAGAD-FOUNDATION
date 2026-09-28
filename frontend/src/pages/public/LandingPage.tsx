import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { publicApi } from '../../api/publicApi';
import { PublicDashboardData } from '../../types/public.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  HeroPeekingConstituents,
  StatsCornerArtwork,
  BarangayNetworkArtwork,
  TopographicWave,
  CardCornerFlourish,
} from '../../components/illustrations';

const SECTOR_COLORS = ['#334155', '#475569', '#64748b', '#0284c7', '#059669', '#d97706', '#dc2626'];

export const LandingPage: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async (year: number) => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getDashboard(year);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load public dashboard:', err);
      setError(err?.response?.data?.error?.message || 'Unable to connect to municipal GAD server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedYear);
  }, [selectedYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const summary = data?.summary;
  const bySector = data?.bySector || [];
  const byBarangay = data?.byBarangay || [];

  const topBarangays = [...byBarangay]
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const sexDistribution = summary
    ? [
        { name: 'Female', value: summary.totalFemale, color: '#e11d48' },
        { name: 'Male', value: summary.totalMale, color: '#2563eb' },
      ]
    : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-16">
      {/* Header & Mandate Introduction */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50/80 via-amber-50/20 to-white dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-900 border border-slate-200/70 dark:border-slate-800 p-6 sm:p-10 lg:p-12 transition-all">
        {/* Subtle layered ambient topographic wave */}
        <TopographicWave className="bottom-0 left-0 right-0 h-24" />

        <div className="relative z-10 max-w-2xl space-y-6">

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">
              Gender and Development Transparency Portal
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              Public records and monitoring of the statutory 5% GAD budget allocation, sex-disaggregated outcomes, and community services across Talibon&apos;s 25 mainland and island barangays.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <Link
              to="/demographics"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-medium rounded transition-colors shadow-sm"
            >
              View Demographics
            </Link>
            <Link
              to="/public-programs"
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:border-slate-400 text-slate-800 dark:text-slate-200 font-medium rounded transition-colors bg-white/60 dark:bg-slate-800/40"
            >
              Browse Programs
            </Link>
            <Link
              to="/public-accomplishments"
              className="px-4 py-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-medium transition-colors"
            >
              Accomplishments &rarr;
            </Link>
          </div>
        </div>

        {/* EDGE PEEKING: Diverse civic constituents entering from the right edge */}
        <div className="hidden md:block absolute -right-2 sm:-right-4 lg:right-2 bottom-0 w-64 sm:w-72 lg:w-88 z-10 pointer-events-none">
          <HeroPeekingConstituents />
        </div>
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Year Selection & Controls */}
      <section className="space-y-10 relative">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 relative z-10">
          <div className="max-w-md">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Annual Performance Summary
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Aggregated results and expenditures for the fiscal period
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="year-select" className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              Fiscal Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="text-xs font-medium bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-3 py-1.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-500 shadow-sm"
            >
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        </div>

        {/* CORNER COMPOSITION: Illustrated constituents reviewing the civic ledger in the top right */}
        <div className="hidden lg:block absolute -top-12 right-28 w-52 pointer-events-none z-0">
          <StatsCornerArtwork />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16">
            <LoadingSpinner size="lg" text="Loading data..." />
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="py-8 space-y-3">
            <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              Data Retrieval Error
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">{error}</p>
            <button
              type="button"
              onClick={() => fetchDashboardData(selectedYear)}
              className="text-xs font-medium text-slate-900 dark:text-white underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Core Statistics (Clean open grid with subtle dividers) */}
        {!loading && !error && summary && (
          <div className="space-y-12 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pt-2">
              <div className="space-y-2 border-l-2 border-slate-900 dark:border-white pl-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Total Constituents Reached
                </div>
                <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {summary.totalBeneficiaries.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {summary.totalFemale.toLocaleString()} female ({summary.femalePercentage.toFixed(1)}%) • {summary.totalMale.toLocaleString()} male
                </div>
              </div>

              <div className="space-y-2 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Target GAD Budget
                </div>
                <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(summary.totalBudgetAllocated)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Statutory 5% annual allocation
                </div>
              </div>

              <div className="space-y-2 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Actual Expenditure
                </div>
                <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(summary.totalBudgetUsed)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {summary.budgetUtilizationRate}% utilization rate
                </div>
              </div>

              <div className="space-y-2 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Active Programs
                </div>
                <div className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                  {summary.totalPrograms}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Across municipal departments
                </div>
              </div>
            </div>

            {/* Visual Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
              {/* Sex-Disaggregated Chart with Corner Composition */}
              <div className="relative space-y-4 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardCornerFlourish />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sex-Disaggregated Distribution
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Proportion of female and male participants
                  </p>
                </div>

                <div className="h-48 w-full flex items-center justify-center">
                  {summary.totalBeneficiaries > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sexDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                        >
                          {sexDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [
                            `${Number(value).toLocaleString()} citizens`,
                            'Participants',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-xs text-slate-400 text-center">No participant data recorded for {selectedYear}</div>
                  )}
                </div>

                <div className="flex items-center justify-around pt-2 text-xs border-t border-slate-100 dark:border-slate-800">
                  <div className="text-center">
                    <span className="text-slate-500 dark:text-slate-400 block">Female</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {summary.totalFemale.toLocaleString()} ({summary.femalePercentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-slate-500 dark:text-slate-400 block">Male</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {summary.totalMale.toLocaleString()} ({(100 - summary.femalePercentage).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Barangay Reach Chart with Corner Composition */}
              <div className="lg:col-span-2 relative space-y-4 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardCornerFlourish />
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Barangay Reach (Top 8)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Constituents served across municipal barangays
                    </p>
                  </div>
                  <Link
                    to="/demographics"
                    className="text-xs font-medium text-slate-900 dark:text-white hover:underline"
                  >
                    View all 25 &rarr;
                  </Link>
                </div>

                <div className="h-56 w-full">
                  {topBarangays.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topBarangays} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <XAxis
                          dataKey="barangay"
                          tick={{ fontSize: 11, fill: '#64748b' }}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                        />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '4px',
                            color: '#f8fafc',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="female" name="Female" fill="#e11d48" stackId="a" />
                        <Bar dataKey="male" name="Male" fill="#2563eb" stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-slate-400">
                      No barangay data available for {selectedYear}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sector Breakdown */}
            <div className="space-y-4 pt-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Sectoral Classification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Target priority and vulnerable groups reached by GAD initiatives
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {bySector.length > 0 ? (
                  bySector.map((sec, idx) => (
                    <div
                      key={sec.sector}
                      className="border-t border-slate-200 dark:border-slate-800 pt-3 space-y-1"
                    >
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {sec.sector}
                      </div>
                      <div className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">
                        {sec.count.toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-4 text-xs text-slate-400">
                    No sectoral records found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <hr className="border-slate-200 dark:border-slate-800" />

      {/* Institutional Framework with Edge-Peeking from the Left */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/30 via-white to-slate-50/50 dark:from-slate-900/40 dark:via-slate-900 dark:to-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 relative z-10">
          {/* EDGE PEEKING: Community members representing 25 barangays entering from the left */}
          <div className="hidden lg:block w-72 shrink-0 -ml-6 -my-4 pointer-events-none">
            <BarangayNetworkArtwork />
          </div>

          <div className="flex-1 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Statutory Framework
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Governing mandates for municipal gender-responsive governance across Talibon&apos;s 25 mainland and island barangays
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              <div className="space-y-2 bg-white/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Statutory 5% Allocation
                </h3>
                <p>
                  Under Republic Act No. 9710, local government units are required to formulate an annual GAD Plan and Budget allocating at least five percent of the total municipal budget.
                </p>
              </div>

              <div className="space-y-2 bg-white/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Sex-Disaggregated Reporting
                </h3>
                <p>
                  Program implementation records are maintained with gender-disaggregated indicators to evaluate equitable impact across female and male constituents.
                </p>
              </div>

              <div className="space-y-2 bg-white/70 dark:bg-slate-800/40 p-4 rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm">
                <h3 className="font-semibold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  All 25 Barangays Covered
                </h3>
                <p>
                  Reporting covers all mainland and island barangay units in Talibon to track geographic accessibility and ensure inclusive community participation.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


