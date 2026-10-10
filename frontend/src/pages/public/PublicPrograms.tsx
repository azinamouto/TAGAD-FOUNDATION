import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { PublicProgram } from '../../types/public.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PublicPrograms: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getPrograms({
        year: selectedYear,
        sector: selectedSector || undefined,
      });
      setPrograms(res);
    } catch (err: any) {
      console.error('Failed to load public programs:', err);
      setError(err?.response?.data?.error?.message || 'Failed to retrieve public GAD programs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [selectedYear, selectedSector]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredPrograms = programs.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.office.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAllocated = filteredPrograms.reduce((acc, curr) => acc + (curr.budgetTarget || 0), 0);
  const totalExpended = filteredPrograms.reduce((acc, curr) => acc + (curr.budgetActual || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header Section */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground dark:text-muted-foreground">
          Program Directory • Municipality of Talibon
        </div>
        <h1 className="text-3xl font-semibold text-foreground dark:text-foreground tracking-tight">
          Municipal GAD Programs
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-3xl leading-relaxed">
          Public directory of gender-responsive projects implemented by municipal departments (MSWDO, MHO, MAO, MPDC, Mayor&apos;s Office) for the welfare of women, children, and specialized sectors.
        </p>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Filter and Search Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="programs-year" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Year:
            </label>
            <select
              id="programs-year"
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
            <label htmlFor="programs-sector" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Sector:
            </label>
            <select
              id="programs-sector"
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            >
              <option value="">All Sectors</option>
              <option value="Health">Health & Nutrition</option>
              <option value="Social Protection">Social Protection</option>
              <option value="Agriculture">Agriculture & Fisheries</option>
              <option value="Education">Education & Youth</option>
              <option value="Infrastructure">Infrastructure & Sanitation</option>
              <option value="Governance">Governance & Gender Mainstreaming</option>
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search programs or office..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground placeholder-slate-400 focus:outline-none focus:border-border"
          />
        </div>
      </section>

      {/* Aggregate Banner for Filtered Result */}
      {!loading && !error && filteredPrograms.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <div className="space-y-1 border-l-2 border-border dark:border-white pl-4">
            <div className="text-xs text-muted-foreground font-medium">Programs Listed</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {filteredPrograms.length} Initiatives
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Allocated Budget</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {formatCurrency(totalAllocated)}
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Actual Expended</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {formatCurrency(totalExpended)}
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error State */}
      {loading && (
        <div className="py-16">
          <LoadingSpinner size="lg" text="Loading programs directory..." />
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
            onClick={loadPrograms}
            className="text-xs font-medium text-foreground dark:text-foreground underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Program Items List (Clean Editorial Layout) */}
      {!loading && !error && (
        <div className="divide-y divide-border dark:divide-border">
          {filteredPrograms.map((prog) => {
            const budgetPct =
              prog.budgetTarget > 0
                ? Math.min(100, Math.round((prog.budgetActual / prog.budgetTarget) * 100))
                : 0;

            return (
              <div
                key={prog.id}
                className="py-8 first:pt-0 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                      {prog.sector} • FY {prog.fiscalYear} • Implementing Unit: <span className="font-medium text-foreground dark:text-foreground">{prog.officeName || prog.office}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground dark:text-foreground">
                      {prog.title}
                    </h3>
                  </div>

                  <div className="text-xs font-medium text-muted-foreground dark:text-muted-foreground shrink-0">
                    Status: <span className="text-foreground dark:text-foreground font-semibold">{prog.status}</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed max-w-4xl">
                  {prog.description || 'No detailed project narrative provided for this program.'}
                </p>

                {/* Financial & Reach Details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-muted-foreground dark:text-muted-foreground block">Allocated</span>
                    <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                      {formatCurrency(prog.budgetTarget)}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground dark:text-muted-foreground block">Expended</span>
                    <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                      {formatCurrency(prog.budgetActual)} ({budgetPct}%)
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground dark:text-muted-foreground block">Female Reach</span>
                    <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                      {prog.actualFemale.toLocaleString()} / {prog.targetFemale.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground dark:text-muted-foreground block">Male Reach</span>
                    <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                      {prog.actualMale.toLocaleString()} / {prog.targetMale.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPrograms.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No programs found matching the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

