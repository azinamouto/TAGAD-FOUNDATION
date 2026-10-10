import React, { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { Button } from '../../../components/ui/button';
interface Summary { groups: { period: string; indicatorId: string; indicatorName: string; unit: string; observationCount: number; minimum: string; maximum: string; arithmeticMean: string }[]; pagination: { hasMore: boolean }; summaryMeaning: string }
export function StatisticalSummary({ tableId, datasetId }: { tableId: string; datasetId: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    api.get(`/admin/statistical-search/tables/${tableId}/summary`, { params: { datasetId, page, limit: 50 }, signal: controller.signal })
      .then(({ data }) => setResult(data.data)).catch(() => { if (!controller.signal.aborted) setError('Summary unavailable.'); });
    return () => controller.abort();
  }, [tableId, datasetId, page, retry]);
  return <section className="p-4 border border-border rounded space-y-3 overflow-x-auto">
    <h2 className="font-semibold">Dataset summary</h2>
    {error ? <p role="alert">{error} <Button variant="outline" onClick={() => setRetry(value => value + 1)}>Retry</Button></p> : !result ? <p role="status">Loading summary...</p> : <>
      <p className="text-sm text-muted-foreground">{result.summaryMeaning}</p>
      {!result.groups.length ? <p>No unsuppressed observations.</p> : <table className="w-full text-left text-sm"><thead><tr>{['Period', 'Indicator', 'Unit', 'Count', 'Minimum', 'Maximum', 'Unweighted mean'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead>
        <tbody>{result.groups.map((group, index) => <tr key={index}>{[group.period, group.indicatorName, group.unit, group.observationCount, group.minimum, group.maximum, group.arithmeticMean].map((value, column) => <td className="p-2" key={column}>{value ?? '?'}</td>)}</tr>)}</tbody></table>}
      <Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</Button>
      <span> Page {page} </span><Button variant="outline" disabled={!result.pagination.hasMore} onClick={() => setPage(value => value + 1)}>Next</Button>
    </>}
  </section>;
}
