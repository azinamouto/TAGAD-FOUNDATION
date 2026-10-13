import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
   PieChart,
   Pie,
   Cell,
   ResponsiveContainer,
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid,
   Tooltip,
   Legend,
 } from 'recharts';
 import api from '../api/axios';
 import { Skeleton } from '../components/ui/skeleton';

const Dashboard: React.FC = () => {
  const { hash } = useLocation();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get(`/dashboard/stats?year=${year}`);
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [year]);

  useEffect(() => {
    if (!loading && hash === '#barangay-statistics') {
      document.getElementById('barangay-statistics')?.scrollIntoView();
    }
  }, [hash, loading]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="py-16 space-y-3">
        <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
          Failed to load analytics
        </h3>
        <p className="text-xs text-muted-foreground dark:text-muted-foreground">
          There was an error fetching the dashboard statistics. Please refresh the page.
        </p>
      </div>
    );
  }

  const rawData = stats?.data || stats || {};
  const summary = rawData?.summary || rawData;

  const totalBeneficiaries = Number(summary?.totalBeneficiaries ?? rawData?.totalBeneficiaries ?? 0);
  const totalMale = Number(summary?.totalMale ?? rawData?.totalMale ?? 0);
  const totalFemale = Number(summary?.totalFemale ?? rawData?.totalFemale ?? 0);
  const totalPrograms = Number(summary?.totalPrograms ?? rawData?.totalPrograms ?? 0);
  const totalBudgetAllocated = Number(summary?.totalBudgetAllocated ?? rawData?.totalBudgetAllocated ?? 0);
  const totalBudgetUsed = Number(summary?.totalBudgetUsed ?? rawData?.totalBudgetUsed ?? 0);
  const byBarangay = Array.isArray(rawData?.byBarangay) ? rawData.byBarangay : [];
  const recentBeneficiaries = Array.isArray(rawData?.recentBeneficiaries) ? rawData.recentBeneficiaries : [];

  const GENDER_COLORS = ['var(--chart-1)', 'var(--chart-2)'];

  const genderData = [
    { name: 'Male', value: totalMale },
    { name: 'Female', value: totalFemale },
  ];

  const budgetUsagePercent =
    totalBudgetAllocated > 0 ? (totalBudgetUsed / totalBudgetAllocated) * 100 : 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Header & Controls */}
      <section className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground dark:text-foreground">
            Dashboard and Barangay Statistics
          </h1>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">
            Municipality of Talibon • Gender and Development Statistics
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="dash-year" className="font-medium text-muted-foreground dark:text-muted-foreground">
            Year:
          </label>
          <select
            id="dash-year"
            className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </section>

      <p className="text-sm text-muted-foreground">
        Source: current non-archived beneficiary registry, program budgets and reported accomplishments.
        The year filter applies to programs and expenditures; registry counts and recent entries cover all years.
        Registry records do not establish municipal population or service participation. Interactive mapping is not yet available.
      </p>
      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-1 border-l-2 border-border dark:border-white pl-4">
          <div className="text-xs text-muted-foreground font-medium">Registered Records</div>
          <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
            {totalBeneficiaries.toLocaleString()}
          </div>
          <div className="text-[11px] text-muted-foreground">
            M: {totalMale.toLocaleString()} • F: {totalFemale.toLocaleString()}
          </div>
        </div>

        <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
          <div className="text-xs text-muted-foreground font-medium">Programs in Selected Year</div>
          <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
            {totalPrograms}
          </div>
          <div className="text-[11px] text-muted-foreground">FY {year} Monitoring</div>
        </div>

        <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
          <div className="text-xs text-muted-foreground font-medium">GAD Budget Allocated</div>
          <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
            {formatCurrency(totalBudgetAllocated)}
          </div>
          <div className="text-[11px] text-muted-foreground">Program budget targets</div>
        </div>

        <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
          <div className="text-xs text-muted-foreground font-medium">Budget Utilized</div>
          <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
            {formatCurrency(totalBudgetUsed)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {budgetUsagePercent.toFixed(1)}% of planned budget
          </div>
        </div>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Charts Section */}
      <section id="barangay-statistics" className="scroll-mt-20 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Barangay Distribution (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
              Beneficiaries by Barangay
            </h2>
            <p className="text-xs text-muted-foreground">Current non-archived registry records by barangay and recorded sex</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byBarangay} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="barangay"
                  fontSize={10}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={50}
                  stroke="var(--chart-2)"
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis fontSize={10} stroke="var(--chart-2)" tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    borderRadius: '4px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="male" stackId="a" fill="var(--chart-1)" name="Male" />
                <Bar dataKey="female" stackId="a" fill="var(--chart-2)" name="Female" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Ratio (1 col) */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
              Gender Distribution
            </h2>
            <p className="text-xs text-muted-foreground">Male and Female participant ratio</p>
          </div>
          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {genderData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={GENDER_COLORS[index % GENDER_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    borderRadius: '4px',
                  }}
                />
                <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Recent Entries */}
      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground dark:text-foreground">
            Recent Data Entries
          </h2>
          <p className="text-xs text-muted-foreground">Latest encoded demographic records</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border dark:border-border text-muted-foreground dark:text-muted-foreground">
                <th className="py-2.5 px-3 font-semibold">Beneficiary</th>
                <th className="py-2.5 px-3 font-semibold">Sex</th>
                <th className="py-2.5 px-3 font-semibold">Barangay</th>
                <th className="py-2.5 px-3 font-semibold">Sector</th>
                <th className="py-2.5 px-3 font-semibold text-right">Date Encoded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border dark:divide-border">
              {recentBeneficiaries.map((b: any) => (
                <tr key={b.id} className="hover:bg-muted dark:hover:bg-muted/40">
                  <td className="py-2.5 px-3 font-medium text-foreground dark:text-foreground">
                    {b.firstName} {b.lastName}
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground dark:text-muted-foreground">{b.sex}</td>
                  <td className="py-2.5 px-3 text-muted-foreground dark:text-muted-foreground">{b.barangay}</td>
                  <td className="py-2.5 px-3 text-muted-foreground dark:text-muted-foreground">{b.sector}</td>
                  <td className="py-2.5 px-3 text-right text-muted-foreground dark:text-muted-foreground">
                    {b.dateEncoded
                      ? new Date(b.dateEncoded).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Recent'}
                  </td>
                </tr>
              ))}
              {recentBeneficiaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No recent registry entries are available in your scope.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

