import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { PublicAccomplishment } from '../../types/public.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PublicAccomplishments: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [accomplishments, setAccomplishments] = useState<PublicAccomplishment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAccomplishments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getAccomplishments({
        year: selectedYear,
        quarter: selectedQuarter ? parseInt(selectedQuarter, 10) : undefined,
      });
      setAccomplishments(res);
    } catch (err: any) {
      console.error('Failed to load accomplishments:', err);
      setError(err?.response?.data?.error?.message || 'Failed to retrieve GAD accomplishments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccomplishments();
  }, [selectedYear, selectedQuarter]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredAccomplishments = accomplishments.filter(
    (a) =>
      a.activityTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.actualOutput.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.outputSummary && a.outputSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
      a.office.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUtilized = filteredAccomplishments.reduce((acc, curr) => acc + (curr.actualBudgetUsed || 0), 0);
  const totalBeneficiariesServed = filteredAccomplishments.reduce(
    (acc, curr) => acc + (curr.totalBeneficiaries || 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header Section */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground dark:text-muted-foreground">
          Accomplishment Feed • Municipality of Talibon
        </div>
        <h1 className="text-3xl font-semibold text-foreground dark:text-foreground tracking-tight">
          GAD Accomplishments & Verification
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-3xl leading-relaxed">
          Physical and financial accomplishments verified by the Talibon Gender and Development Focal Point System (GFPS). Records of public fund utilization and citizen reach.
        </p>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Filter and Search Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="accomp-year" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Year:
            </label>
            <select
              id="accomp-year"
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
            <label htmlFor="accomp-quarter" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Quarter:
            </label>
            <select
              id="accomp-quarter"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            >
              <option value="">All Quarters</option>
              <option value="1">Q1 (Jan - Mar)</option>
              <option value="2">Q2 (Apr - Jun)</option>
              <option value="3">Q3 (Jul - Sep)</option>
              <option value="4">Q4 (Oct - Dec)</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search output or office..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground placeholder-slate-400 focus:outline-none focus:border-border"
          />
        </div>
      </section>

      {/* Aggregate Metric Banner */}
      {!loading && !error && filteredAccomplishments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <div className="space-y-1 border-l-2 border-border dark:border-white pl-4">
            <div className="text-xs text-muted-foreground font-medium">Recorded Entries</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {filteredAccomplishments.length} Reports
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Verified Budget Expended</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {formatCurrency(totalUtilized)}
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Direct Citizen Reach</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {totalBeneficiariesServed.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error State */}
      {loading && (
        <div className="py-16">
          <LoadingSpinner size="lg" text="Loading accomplishment reports..." />
        </div>
      )}

      {error && !loading && (
        <div className="py-8 space-y-3">
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-400">
            Connection Error
          </h3>
          <p className="text-xs text-muted-foreground dark:text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={loadAccomplishments}
            className="text-xs font-medium text-foreground dark:text-foreground underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Accomplishments Feed List */}
      {!loading && !error && (
        <div className="divide-y divide-border dark:divide-border">
          {filteredAccomplishments.map((item) => (
            <div
              key={item.id}
              className="py-8 first:pt-0 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Q{item.quarter} FY {item.fiscalYear} • {item.office}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
                    {item.activityTitle}
                  </h3>
                </div>

                <div className="text-xs font-medium text-muted-foreground dark:text-muted-foreground shrink-0">
                  Expended: <span className="text-foreground dark:text-foreground font-semibold tabular-nums">{formatCurrency(item.actualBudgetUsed)}</span>
                </div>
              </div>

              <div className="space-y-2 max-w-4xl">
                <div className="text-xs font-medium text-muted-foreground">Actual Physical Output</div>
                <p className="text-xs text-foreground dark:text-foreground leading-relaxed">
                  {item.actualOutput}
                </p>
                {item.outputSummary && (
                  <p className="text-xs text-muted-foreground italic">
                    Note: {item.outputSummary}
                  </p>
                )}
              </div>

              {/* Reach Stats */}
              <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground dark:text-muted-foreground pt-1">
                <div>
                  <span className="text-muted-foreground mr-1.5">Total Served:</span>
                  <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                    {item.totalBeneficiaries.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-1.5">Female:</span>
                  <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                    {item.actualFemale.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground mr-1.5">Male:</span>
                  <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                    {item.actualMale.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {filteredAccomplishments.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No accomplishment records found for the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

