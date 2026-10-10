import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { publicApi } from '../../api/publicApi';
import { PublicGADPlan, PublicOffice } from '../../types/public.types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const PublicGADPlans: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});

  const [plans, setPlans] = useState<PublicGADPlan[]>([]);
  const [offices, setOffices] = useState<PublicOffice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffices = async () => {
      try {
        const offList = await publicApi.getOffices();
        setOffices(offList);
      } catch (err) {
        console.error('Failed to load offices list:', err);
      }
    };
    fetchOffices();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await publicApi.getGADPlans({
        year: selectedYear,
        officeId: selectedOfficeId || undefined,
      });
      setPlans(res);
      const initialExpanded: Record<string, boolean> = {};
      res.forEach((p) => {
        initialExpanded[p.id] = true;
      });
      setExpandedPlans(initialExpanded);
    } catch (err: any) {
      console.error('Failed to load GAD plans:', err);
      setError(err?.response?.data?.error?.message || 'Failed to retrieve approved GAD plans.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [selectedYear, selectedOfficeId]);

  const toggleExpand = (id: string) => {
    setExpandedPlans((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredPlans = plans.filter(
    (p) =>
      p.officeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.office.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.items.some(
        (item) =>
          item.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.genderIssue.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.targetGroup.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const totalGADBudget = filteredPlans.reduce((acc, curr) => acc + (curr.gadBudget || 0), 0);
  const totalItemsCount = filteredPlans.reduce((acc, curr) => acc + (curr.items?.length || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      {/* Header Section */}
      <section className="space-y-4">
        <div className="text-xs font-semibold tracking-wider uppercase text-muted-foreground dark:text-muted-foreground">
          Annual GAD Plan & Budget (GPB) • Municipality of Talibon
        </div>
        <h1 className="text-3xl font-semibold text-foreground dark:text-foreground tracking-tight">
          Approved GAD Plans & Budgets
        </h1>
        <p className="text-sm text-muted-foreground dark:text-muted-foreground max-w-3xl leading-relaxed">
          Official Gender and Development Plan and Budget matrices reviewed and approved by the Talibon GFPS and Municipal Council in accordance with national guidelines.
        </p>
      </section>

      <hr className="border-border dark:border-border" />

      {/* Filter and Search Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <label htmlFor="plans-year" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Year:
            </label>
            <select
              id="plans-year"
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
            <label htmlFor="plans-office" className="font-medium text-muted-foreground dark:text-muted-foreground">
              Office:
            </label>
            <select
              id="plans-office"
              value={selectedOfficeId}
              onChange={(e) => setSelectedOfficeId(e.target.value)}
              className="bg-card dark:bg-background border border-border dark:border-border rounded px-2.5 py-1 text-foreground dark:text-foreground"
            >
              <option value="">All Municipal Offices</option>
              {offices.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.name} ({off.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search activities, issues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-card dark:bg-background border border-border dark:border-border rounded text-foreground dark:text-foreground placeholder-slate-400 focus:outline-none focus:border-border"
          />
        </div>
      </section>

      {/* Aggregate Metric Banner */}
      {!loading && !error && filteredPlans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
          <div className="space-y-1 border-l-2 border-border dark:border-white pl-4">
            <div className="text-xs text-muted-foreground font-medium">Department Plans</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {filteredPlans.length} GPB Plans
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Total GAD Budget</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {formatCurrency(totalGADBudget)}
            </div>
          </div>

          <div className="space-y-1 border-l-2 border-border dark:border-border pl-4">
            <div className="text-xs text-muted-foreground font-medium">Line Activities</div>
            <div className="text-2xl font-semibold text-foreground dark:text-foreground tabular-nums">
              {totalItemsCount} Actions
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error State */}
      {loading && (
        <div className="py-16">
          <LoadingSpinner size="lg" text="Loading approved GAD plans..." />
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
            onClick={loadPlans}
            className="text-xs font-medium text-foreground dark:text-foreground underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Plans List */}
      {!loading && !error && (
        <div className="space-y-10">
          {filteredPlans.map((plan) => {
            const isExpanded = expandedPlans[plan.id] !== false;
            return (
              <div
                key={plan.id}
                className="border-t border-border dark:border-border pt-6 space-y-4"
              >
                {/* Plan Header */}
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      FY {plan.fiscalYear} • Approved Plan
                    </div>
                    <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
                      {plan.officeName} ({plan.office})
                    </h2>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground mr-1.5">Budget:</span>
                      <span className="font-semibold text-foreground dark:text-foreground tabular-nums">
                        {formatCurrency(plan.gadBudget)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(plan.id)}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground dark:hover:text-white"
                    >
                      <span>{isExpanded ? 'Hide' : 'Show'} ({plan.items.length})</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Plan Items Table/List */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border dark:border-border text-muted-foreground dark:text-muted-foreground">
                          <th className="py-2.5 px-3 font-semibold">Activity</th>
                          <th className="py-2.5 px-3 font-semibold">Gender Issue / Mandate</th>
                          <th className="py-2.5 px-3 font-semibold">Target Group</th>
                          <th className="py-2.5 px-3 font-semibold">Performance Indicator</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border dark:divide-border">
                        {plan.items.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-muted dark:hover:bg-muted/40">
                            <td className="py-2 px-3 font-medium text-foreground dark:text-foreground align-top">
                              {item.activity}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground dark:text-muted-foreground align-top max-w-xs">
                              {item.genderIssue}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground dark:text-muted-foreground align-top">
                              {item.targetGroup}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground dark:text-muted-foreground align-top max-w-xs">
                              {item.performanceIndicator}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-foreground dark:text-foreground tabular-nums align-top whitespace-nowrap">
                              {formatCurrency(item.budget)}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {item.fundSource}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {plan.items.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-muted-foreground">
                              No line items registered for this plan.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          {filteredPlans.length === 0 && (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No approved GAD plans found for the selected filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

