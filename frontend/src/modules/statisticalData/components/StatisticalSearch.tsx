import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import { Button } from '../../../components/ui/button';
interface Result { tableCode: string; title: string; tableId: string | null; matchingObservationCount: number; accessibleObservationCount: number }
export function StatisticalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [meaning, setMeaning] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function search(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResults([]); setMeaning('');
    try { const { data } = await api.get('/admin/statistical-search', { params: { q: query } }); setResults(data.data.tables); setMeaning(data.data.summaryMeaning); }
    catch { setError('Statistical search is unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="p-4 rounded border border-border bg-card text-card-foreground space-y-3">
    <h2 className="font-semibold">Search stored observations</h2>
    <form onSubmit={search} className="flex gap-2">
      <input aria-label="Search stored observations" maxLength={100} value={query} onChange={event => setQuery(event.target.value)} className="flex-1 border border-input bg-background rounded p-2" />
      <Button type="submit" disabled={busy}>{busy ? 'Searching...' : 'Search data'}</Button>
    </form>
    {error && <p role="alert">{error}</p>}
    {meaning && <p>{meaning}</p>}
    {meaning && !results.length && <p>No matching observations or tables.</p>}
    <ul>{results.map(result => <li key={result.tableCode} className="py-2">
      {result.tableId ? <Link className="underline" to={`/admin/statistical-data/${result.tableId}`}>{result.title}</Link> : result.title}
      <span> ? {result.matchingObservationCount} matching / {result.accessibleObservationCount} accessible observations</span>
    </li>)}</ul>
  </section>;
}
