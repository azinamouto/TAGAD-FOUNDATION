import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertCircle, Info, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../api/axios';
import { Skeleton } from '../components/ui/skeleton';

type Summary = { totalBeneficiaries: number; totalMale: number; totalFemale: number; totalPrograms: number; totalBudgetAllocated: number; totalBudgetUsed: number };
type Barangay = { barangay: string; male: number | null; female: number | null };
type Entry = { id: string; firstName?: string; lastName?: string; sex?: string; barangay?: string; sector?: string; office?: string; dateEncoded?: string };
type Stats = { summary: Summary; byBarangay: Barangay[]; recentBeneficiaries: Entry[] };
const measured = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const count = (value: unknown) => measured(value) ? value.toLocaleString() : 'Not recorded';
const currency = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
const recordedDate = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not recorded';
function parseStats(payload: any): Stats | null {
  const raw = payload?.data || payload;
  const summary = raw?.summary || raw;
  const fields = ['totalBeneficiaries', 'totalMale', 'totalFemale', 'totalPrograms', 'totalBudgetAllocated', 'totalBudgetUsed'];
  if (!fields.every(key => measured(summary?.[key])) || !Array.isArray(raw?.byBarangay) || !Array.isArray(raw?.recentBeneficiaries)) return null;
  if (raw.byBarangay.some((row: any) => !row || typeof row.barangay !== 'string') || raw.recentBeneficiaries.some((row: any) => !row || typeof row.id !== 'string')) return null;
  return { summary, byBarangay: raw.byBarangay.map((row: any) => ({ barangay: row.barangay, male: measured(row.male) ? row.male : null, female: measured(row.female) ? row.female : null })), recentBeneficiaries: raw.recentBeneficiaries };
}
const Dashboard: React.FC = () => {
  const { hash } = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setStats(null);
    setError('');
    api.get('/dashboard/stats?year=' + year).then(({ data }) => {
      if (!active) return;
      const parsed = parseStats(data);
      setStats(parsed);
      if (!parsed) setError('The analytics response is incomplete. Statistics cannot be displayed reliably. Please try again or contact your administrator if this continues.');
    }).catch(() => {
      if (active) setError('We could not retrieve the registry and budget statistics. Please try again. If the service remains unavailable, contact your administrator.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year, attempt]);
  useEffect(() => {
    if (!loading && hash === '#barangay-statistics') document.getElementById('barangay-statistics')?.scrollIntoView();
  }, [hash, loading]);
  const summary = stats?.summary;
  const genderData = summary ? [{ name: 'Male', value: summary.totalMale }, { name: 'Female', value: summary.totalFemale }] : [];
  const years = Array.from({ length: Math.max(2026, new Date().getFullYear()) - 2023 + 1 }, (_, i) => 2023 + i);
  return (
    <div className="analytics-dashboard">
      <section className="dashboard-intro">
        <div><p className="dashboard-eyebrow">GENDER AND DEVELOPMENT</p><h1>Dashboard and Barangay Statistics</h1><p className="text-muted-foreground">Registry insights and program budgets for the Municipality of Talibon.</p></div>
        <div className="period-control"><label htmlFor="dash-year">Reporting year</label><select id="dash-year" value={year} onChange={event => setYear(Number(event.target.value))}>{years.map(value => <option key={value}>{value}</option>)}</select></div>
      </section>

      <section className="analytics-notice" aria-label="Data scope">
        <Info size={20} aria-hidden="true" />
        <div><h2>Understand the reporting scope</h2><p>The year filter applies to programs and expenditures. Registry counts and recent entries cover all years and only records available to your account. Registry records do not establish municipal population or service participation.</p></div>
      </section>

      {loading ? <section role="status" aria-live="polite" aria-label="Loading analytics" className="space-y-4"><p className="text-muted-foreground">Loading analytics for {year}…</p><div className="analytics-grid">{[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}</div><Skeleton className="h-80 rounded-lg" /></section>
      : error || !stats || !summary ? <section role="alert" className="analytics-error">
        <span className="error-icon"><AlertCircle size={24} aria-hidden="true" /></span>
        <div><p className="text-sm text-muted-foreground">Reporting year {year}</p><h2>Failed to load analytics</h2><p>{error || 'Analytics are currently unavailable.'}</p><button className="workspace-button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />Retry analytics</button></div>
      </section> : <>
        <section className="analytics-grid" aria-label="Primary statistics">
          <article className="analytics-panel">
            <div className="panel-heading"><div><h2>Registered Records</h2><p>Current non-archived beneficiary registry · All years</p></div></div>
            <p className="stat-value">{count(summary.totalBeneficiaries)}<span>records</span></p>
            <dl className="stat-breakdown"><div><dt>Male</dt><dd>{count(summary.totalMale)}</dd></div><div><dt>Female</dt><dd>{count(summary.totalFemale)}</dd></div><div><dt>Derived total (male + female)</dt><dd>{count(summary.totalMale + summary.totalFemale)}</dd></div></dl>
          </article>
          <article className="analytics-panel">
            <div className="panel-heading"><div><h2>Programs and budget</h2><p>Fiscal year {year} · Program targets and reported expenditures</p></div></div>
            <p className="stat-value">{count(summary.totalPrograms)}<span>programs</span></p>
            <dl className="stat-breakdown"><div><dt>GAD Budget Allocated</dt><dd>{currency(summary.totalBudgetAllocated)}</dd></div><div><dt>Budget Utilized</dt><dd>{currency(summary.totalBudgetUsed)}</dd></div></dl>
            <p className="panel-footnote">{summary.totalBudgetAllocated > 0 ? ((summary.totalBudgetUsed / summary.totalBudgetAllocated) * 100).toFixed(1) + '% of planned budget utilized' : 'Utilization rate is unavailable without an allocated budget.'}</p>
          </article>
        </section>

        <section id="barangay-statistics" className="analytics-panel barangay-panel">
          <div className="panel-heading"><div><h2>Beneficiaries by Barangay</h2><p>Source: current non-archived registry · All years · Recorded sex</p></div><a href="#barangay-table" className="analytics-text-link">View data table</a></div>
          {stats.byBarangay.length === 0 ? <p className="analytics-empty">No barangay registry records are available in your scope.</p> :
          <div className="chart-scroll" role="region" aria-label="Barangay comparison chart; data table follows" tabIndex={0}>
            <div style={{ height: 320, minWidth: Math.max(560, stats.byBarangay.length * 72) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.byBarangay} margin={{ top: 12, right: 20, left: 0, bottom: 40 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="barangay" fontSize={12} interval={0} angle={-35} textAnchor="end" height={65} tick={{ fill: 'var(--muted-foreground)' }} />
                  <YAxis fontSize={12} allowDecimals={false} tick={{ fill: 'var(--muted-foreground)' }} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 14 }} />
                  <Bar isAnimationActive={false} dataKey="male" fill="var(--chart-1)" name="Male" maxBarSize={28} />
                  <Bar isAnimationActive={false} dataKey="female" fill="var(--chart-2)" name="Female" maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>}
          <div id="barangay-table" className="table-scroll" role="region" aria-label="Barangay registry data" tabIndex={0}>
            <table className="analytics-table"><caption>Barangay-level registry counts · All years. Missing counts are marked “Not recorded”.</caption><thead><tr><th scope="col">Barangay</th><th scope="col" className="numeric">Male</th><th scope="col" className="numeric">Female</th><th scope="col" className="numeric">Derived total</th></tr></thead><tbody>
              {stats.byBarangay.map((row, i) => <tr key={row.barangay + i}><th scope="row">{row.barangay}</th><td className="numeric">{count(row.male)}</td><td className="numeric">{count(row.female)}</td><td className="numeric">{count(measured(row.male) && measured(row.female) ? row.male + row.female : null)}</td></tr>)}
              {!stats.byBarangay.length && <tr><td colSpan={4}>No barangay data available.</td></tr>}
            </tbody></table>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="panel-heading"><div><h2>Recorded sex distribution</h2><p>Source: current non-archived registry · All years</p></div></div>
          <div className="distribution-layout">
            {summary.totalMale + summary.totalFemale > 0 ? <div className="distribution-chart" role="img" aria-label={'Registry distribution: male ' + summary.totalMale + ', female ' + summary.totalFemale}>
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={genderData} innerRadius={58} outerRadius={88} dataKey="value" stroke="var(--card)" strokeWidth={3}>{genderData.map((row, i) => <Cell key={row.name} fill={i === 0 ? 'var(--chart-1)' : 'var(--chart-2)'} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
            </div> : <p className="analytics-empty">No recorded male or female registry entries in your scope.</p>}
            <table className="analytics-table"><caption>Tabular alternative · Recorded sex</caption><thead><tr><th scope="col">Recorded sex</th><th scope="col" className="numeric">Records</th></tr></thead><tbody>{genderData.map((row, i) => <tr key={row.name}><th scope="row"><span className="series-dot" style={{ background: i === 0 ? 'var(--chart-1)' : 'var(--chart-2)' }} />{row.name}</th><td className="numeric">{count(row.value)}</td></tr>)}<tr><th scope="row">Derived total</th><td className="numeric">{count(summary.totalMale + summary.totalFemale)}</td></tr></tbody></table>
          </div>
        </section>

        <section className="analytics-panel">
          <div className="panel-heading"><div><h2>Recent Data Entries</h2><p>Latest encoded registry records · All years · Within your access scope</p></div></div>
          <div className="table-scroll" role="region" aria-label="Recent registry entries" tabIndex={0}><table className="analytics-table"><caption className="sr-only">Recent beneficiary registry records and source offices</caption><thead><tr>{['Beneficiary', 'Sex', 'Barangay', 'Sector', 'Owning office', 'Date encoded'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>
            {stats.recentBeneficiaries.map(entry => <tr key={entry.id}><th scope="row">{[entry.firstName, entry.lastName].filter(Boolean).join(' ') || 'Not recorded'}</th><td>{entry.sex || 'Not recorded'}</td><td>{entry.barangay || 'Not recorded'}</td><td>{entry.sector || 'Not recorded'}</td><td>{entry.office || 'Not recorded'}</td><td className="whitespace-nowrap">{recordedDate(entry.dateEncoded)}</td></tr>)}
            {!stats.recentBeneficiaries.length && <tr><td colSpan={6} className="analytics-empty">No recent registry entries are available in your scope.</td></tr>}
          </tbody></table></div>
        </section>
      </>}

      <section className="analytics-panel source-metadata" aria-labelledby="source-heading">
        <h2 id="source-heading">Sources and reporting notes</h2>
        <dl><div><dt>Registry source & period</dt><dd>Current non-archived beneficiary registry · All years</dd></div><div><dt>Budget source & period</dt><dd>Program budget targets and reported accomplishments · {year}</dd></div><div><dt>Validation status</dt><dd>Not supplied by the analytics service. Registry counts are not official population statistics.</dd></div><div><dt>Last updated</dt><dd>Not supplied by the analytics service. Entry dates indicate encoding, not the last update.</dd></div></dl>
      </section>
    </div>
  );
};
export default Dashboard;

