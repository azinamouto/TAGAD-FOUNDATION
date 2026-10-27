import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';

type Row = { barangay_code: string; period: string; male: string | number; female: string | number; source_reference: string };
type Reference = { barangayId: string; isSynthetic: boolean; barangay: { code: string; name: string } };
type Series = { id: string; code: string; name: string; sourceReference: string; owningOfficeId?: string };
type Preview = { rows: Row[]; sourceFileName: string | null; confirmationToken: string | null; results: { rowNumber: number; input: Row; row?: Row; errors: string[] }[] };
type Statistics = { period: string; rows: { barangayId: string; name: string; isSynthetic: boolean; eligible: boolean; male: number | null; female: number | null; total: number | null; sourceReference: string | null }[]; totals: { male: number; female: number; total: number } | null; missing: number };
const errorMessage = (e: any) => e.response?.data?.error?.message || 'Request failed. Check your connection and retry.';
const fieldStyle = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const display = (value: number | null | undefined) => value == null ? 'No data' : value.toLocaleString();

export default function BarangayStatistics() {
  const [context, setContext] = useState<{ series: Series[]; references: Reference[]; canWrite: boolean } | null>(null);
  const [seriesId, setSeriesId] = useState('');
  const [period, setPeriod] = useState('');
  const [form, setForm] = useState<Row>({ barangay_code: '', period: '', male: '', female: '', source_reference: '' });
  const [seriesForm, setSeriesForm] = useState({ code: '', name: '', sourceReference: '' });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [fileKey, setFileKey] = useState(0);
  async function loadContext() {
    const { data } = await api.get('/provisional-gad/context');
    setContext(data.data);
  }
  useEffect(() => { loadContext().catch(e => setError(errorMessage(e))); }, []);
  useEffect(() => {
    setPreview(null); setStats(null); setStatsError('');
    if (!seriesId || !/^\d{4}(?:-(?:Q[1-4]|0[1-9]|1[0-2]))?$/.test(period)) { setStatsLoading(false); return; }
    const controller = new AbortController();
    setStatsLoading(true);
    api.get('/provisional-gad/statistics', { params: { seriesId, period }, signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) setStats(r.data.data); })
      .catch(e => { if (!controller.signal.aborted) setStatsError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setStatsLoading(false); });
    return () => controller.abort();
  }, [seriesId, period, refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await action(); } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  function edit(key: keyof Row, value: string) { setForm(f => ({ ...f, [key]: value })); setPreview(null); setNotice(''); }
  async function manualPreview(e: React.FormEvent) {
    e.preventDefault(); setPreview(null);
    await run(async () => { const r = await api.post('/provisional-gad/preview', { seriesId, rows: [form] }); setPreview(r.data.data); });
  }
  async function upload(file?: File) {
    setPreview(null);
    if (!file) return;
    await run(async () => {
      const data = new FormData(); data.append('seriesId', seriesId); data.append('file', file);
      const r = await api.post('/provisional-gad/preview', data);
      setPreview(r.data.data);
    });
  }
  async function commit() {
    if (!preview?.confirmationToken) return;
    await run(async () => {
      const r = await api.post('/provisional-gad/commit', { seriesId, ...preview, confirmed: true });
      const savedPeriods = [...new Set(preview.rows.map(row => row.period))];
      if (savedPeriods.length === 1) setPeriod(savedPeriods[0]);
      setPreview(null); setNotice('Saved ' + r.data.data.inserted + ' provisional record(s).');
      setRefresh(n => n + 1); setFileKey(n => n + 1);
    });
  }
  const total = [form.male, form.female].every(v => /^\d+$/.test(String(v)) && Number(v) <= 2147483647) ? Number(form.male) + Number(form.female) : null;
  const selectedSeries = context?.series.find(series => series.id === seriesId);
  return <div className="analytics-dashboard provisional-statistics min-w-0">
    <header className="dashboard-intro"><div><p className="dashboard-eyebrow">GAD INTERNAL WORKSPACE</p><h1>Barangay aggregate statistics</h1>
      <p className="mt-2 text-muted-foreground">Provisional male/female counts from identified sources. These are not official population totals or approved LGU statistics. These counts are separate from the beneficiary registry and do not establish program participation.</p></div></header>
    {error && <div role="alert" className="rounded border border-destructive p-3">{error} {!context && <Button onClick={() => run(loadContext)}>Retry</Button>}</div>}
    {notice && <p role="status" className="rounded border p-3">{notice}</p>}
    {!context && !error && <p role="status">Loading source series and references…</p>}
    {context && <>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">Source series<select aria-label="Source series" className={fieldStyle} value={seriesId} disabled={busy} onChange={e => { setSeriesId(e.target.value); setPreview(null); setNotice(''); }}>
            <option value="">Select one source series</option>{context.series.map(s => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select></label>
          <label className="space-y-1">Statistics reporting period<Input aria-label="Statistics reporting period" placeholder="YYYY, YYYY-Q1, or YYYY-MM" value={period} disabled={busy} onChange={e => setPeriod(e.target.value)} /></label>
        </div>
        <p className="text-sm text-muted-foreground">Only one source series and one exact reporting period are shown at a time. Annual, quarterly and monthly labels are kept separate.</p>
        {period && !/^\d{4}(?:-(?:Q[1-4]|0[1-9]|1[0-2]))?$/.test(period) && <p role="alert">Use YYYY, YYYY-Q1 to Q4, or YYYY-MM for the reporting period.</p>}
        {selectedSeries && <section className="source-metadata" aria-label="Selected source metadata"><dl>
          <div><dt>Source reference</dt><dd>{selectedSeries.sourceReference || 'Not supplied'}</dd></div>
          <div><dt>Owning office reference</dt><dd>{selectedSeries.owningOfficeId || 'Not supplied'}</dd></div>
          <div><dt>Verification status</dt><dd>Provisional; not approved LGU statistics.</dd></div>
          <div><dt>Reporting scope</dt><dd>One source series and exact period, within your account access. Last update time is not supplied.</dd></div>
        </dl></section>}
        {context.series.length === 0 && <p role="status">No source series are available in your office scope.</p>}
        {context.canWrite && <details><summary className="cursor-pointer font-medium">Create a source series</summary>
          <form className="grid gap-3 mt-3" onSubmit={e => { e.preventDefault(); run(async () => {
            const r = await api.post('/provisional-gad/series', seriesForm); await loadContext(); setSeriesId(r.data.data.id); setNotice('Source series created for your assigned office.');
          }); }}>
            <p className="text-sm text-muted-foreground">Describe what is counted. Ownership is fixed to your current assigned office when the series is created.</p>
            <label>Stable series code<Input required pattern="[A-Z0-9][A-Z0-9_-]{1,79}" maxLength={80} value={seriesForm.code} onChange={e => setSeriesForm({ ...seriesForm, code: e.target.value })} /></label>
            <label>Series name<Input required maxLength={200} value={seriesForm.name} onChange={e => setSeriesForm({ ...seriesForm, name: e.target.value })} /></label>
            <label>Series source/reference<Input required maxLength={1000} value={seriesForm.sourceReference} onChange={e => setSeriesForm({ ...seriesForm, sourceReference: e.target.value })} /></label>
            <Button disabled={busy} type="submit">Create series</Button>
          </form></details>}
      </CardContent></Card>
      {context.references.length === 0 && <p role="status" className="rounded border p-4">No eligible barangay roster references are available in your scope. Entry is unavailable until a custodian supplies roster evidence. Seed records and map verification do not establish approval.</p>}
      {context.references.some(r => r.isSynthetic) && <p role="status" className="rounded border p-4">Synthetic test fixtures only — these references are not official LGU barangays.</p>}
      <section className="analytics-panel space-y-4" aria-label="Persisted barangay statistics">
        <h2 className="text-xl font-semibold">Persisted barangay statistics</h2>
        {!seriesId || !period ? <p>Select a source series and reporting period to view records.</p> : null}
        {statsLoading && <p role="status">Loading persisted statistics…</p>}
        {statsError && <p role="alert">{statsError} <Button variant="outline" onClick={() => setRefresh(n => n + 1)}>Retry statistics</Button></p>}
        {stats && <>
          {stats.totals === null && <p role="status">No recorded counts for this source and period. Missing values are not zero.</p>}
          <div className="stat-breakdown">{(['male', 'female', 'total'] as const).map(k => <div className="min-w-24" key={k}><p className="capitalize">{k}</p><p className="text-2xl font-semibold tabular-nums">{display(stats.totals?.[k])}</p></div>)}</div>
          <p>{stats.missing} eligible barangay(s) have no record for this selection. Totals cover recorded rows only.</p>
          {stats.rows.some(r => r.total !== null) && <div aria-label="Male and female comparison chart" role="img" style={{ width: '100%', height: Math.max(250, stats.rows.filter(r => r.total !== null).length * 45) }}>
            <ResponsiveContainer><BarChart layout="vertical" data={stats.rows.filter(r => r.total !== null)}><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} /><Tooltip /><Legend /><Bar dataKey="male" name="Male" fill="var(--chart-1)" isAnimationActive={false} /><Bar dataKey="female" name="Female" fill="var(--chart-2)" isAnimationActive={false} /></BarChart></ResponsiveContainer>
          </div>}
          <div className="table-scroll" role="region" aria-label="Provisional counts table" tabIndex={0}><table className="analytics-table"><caption className="text-left mb-2">Counts for {stats.period}; missing values remain “No data”.</caption><thead><tr>{['Barangay', 'Male', 'Female', 'Total', 'Source/reference'].map(c => <th scope="col" className={c === 'Barangay' || c === 'Source/reference' ? undefined : 'numeric'} key={c}>{c}</th>)}</tr></thead><tbody>
            {stats.rows.map(r => <tr key={r.barangayId} className="border-t"><th scope="row">{r.isSynthetic ? '[Synthetic] ' : ''}{r.name}{!r.eligible && ' (reference inactive)'}</th><td className="numeric">{display(r.male)}</td><td className="numeric">{display(r.female)}</td><td className="numeric">{display(r.total)}</td><td className="max-w-xs break-words">{r.sourceReference ?? 'No data'}</td></tr>)}
          </tbody></table></div>
        </>}
      </section>
      {context.canWrite && <Card><CardContent className="pt-6 space-y-5">
        <h2 className="text-xl font-semibold">Encode counts</h2>
        <form onSubmit={manualPreview}>
          <fieldset disabled={busy || !seriesId || !context.references.length} className="grid gap-4 md:grid-cols-2">
            <label>Barangay<select aria-label="Barangay" className={fieldStyle} required value={form.barangay_code} onChange={e => edit('barangay_code', e.target.value)}><option value="">Select a reference</option>
              {context.references.map(r => <option key={r.barangayId} value={r.barangay.code}>{r.isSynthetic ? '[Synthetic] ' : ''}{r.barangay.name} ({r.barangay.code})</option>)}</select></label>
            <label>Entry reporting period<Input required placeholder="YYYY, YYYY-Q1, or YYYY-MM" pattern="\d{4}(-([Q][1-4]|0[1-9]|1[0-2]))?" value={form.period} onChange={e => edit('period', e.target.value)} /></label>
            <label>Male count<Input required inputMode="numeric" pattern="[0-9]+" value={form.male} onChange={e => edit('male', e.target.value)} /></label>
            <label>Female count<Input required inputMode="numeric" pattern="[0-9]+" value={form.female} onChange={e => edit('female', e.target.value)} /></label>
            <label className="md:col-span-2">Source/reference<Input required maxLength={1000} value={form.source_reference} onChange={e => edit('source_reference', e.target.value)} /></label>
            <p aria-live="polite">Calculated total: <strong>{display(total)}</strong></p><Button type="submit">Preview manual entry</Button>
          </fieldset>
        </form>
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold">Import CSV or Excel</h3>
          <p className="text-sm text-muted-foreground">Up to 1,000 rows and 2 MB. Use exact reference codes. XLSX must have one worksheet with plain values and the same columns as the CSV template.</p>
          <Button variant="outline" disabled={busy} onClick={() => run(async () => {
            const r = await api.get('/provisional-gad/template', { responseType: 'blob' });
            const url = URL.createObjectURL(r.data); const a = document.createElement('a'); a.href = url; a.download = 'gad-barangay-template.csv'; a.click(); URL.revokeObjectURL(url);
          })}>Download template</Button>
          <label className="block">Upload CSV or XLSX<input key={fileKey} type="file" className={fieldStyle} accept=".csv,.xlsx" disabled={busy || !seriesId || !context.references.length} onChange={e => upload(e.target.files?.[0])} /></label>
        </div>
        {busy && <p role="status">Processing…</p>}
        {preview && <section className="space-y-3" aria-label="Entry preview">
          <h3 className="font-semibold">Review before saving</h3><p>No records have been saved. Existing coordinates will never be overwritten.</p>
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Import or manual entry preview</caption>
            <thead><tr>{['Row', 'Barangay code', 'Period', 'Male', 'Female', 'Total', 'Source/reference', 'Validation'].map(c => <th className="text-left p-2" key={c}>{c}</th>)}</tr></thead>
            <tbody>{preview.results.map((result, i) => { const row = result.row ?? result.input; return <tr key={i} className={result.errors.length ? 'bg-destructive/10' : ''}>
              <td className="p-2">{result.rowNumber}</td><td>{String(row.barangay_code ?? '')}</td><td>{String(row.period ?? '')}</td><td>{String(row.male ?? '')}</td><td>{String(row.female ?? '')}</td>
              <td>{result.row ? display(Number(row.male) + Number(row.female)) : '—'}</td><td className="max-w-xs break-words">{String(row.source_reference ?? '')}</td><td>{result.errors.join(' ') || 'Valid'}</td></tr>; })}</tbody>
          </table></div>
          {!preview.confirmationToken && <p role="alert">Fix the highlighted rows and preview again. Nothing can be saved while errors remain.</p>}
          <Button disabled={busy || !preview.confirmationToken} onClick={commit}>Confirm and save {preview.results.length} record(s)</Button>
        </section>}
      </CardContent></Card>}

    </>}
  </div>;
}
