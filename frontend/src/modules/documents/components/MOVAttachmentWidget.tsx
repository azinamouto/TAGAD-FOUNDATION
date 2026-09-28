import React, { useEffect, useState } from 'react';
import { listMOV, uploadMOV, downloadMOV, MOVAttachment } from '../../../api/movAttachments';
import { Button } from '../../../components/ui/button';

export function MOVAttachmentWidget({ accomplishmentId, canUpload }: { accomplishmentId: string; canUpload: boolean }) {
  const [items, setItems] = useState<MOVAttachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError('');
    listMOV(accomplishmentId).then(data => { if (active) setItems(data); })
      .catch(() => { if (active) setError('Unable to load attachments.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [accomplishmentId, reload]);
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { setError('Maximum file size is 20 MB.'); return; }
    setBusy(true); setError('');
    try { await uploadMOV(accomplishmentId, file); setReload(value => value + 1); }
    catch (error: any) { setError(error.response?.data?.error?.message || 'Upload failed. Please retry.'); }
    finally { setBusy(false); }
  }
  async function download(id: string) {
    setBusy(true); setError('');
    try {
      const url = await downloadMOV(accomplishmentId, id);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; anchor.click();
    } catch { setError('Download unavailable. Please retry.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3">
    {error && <p role="alert" className="text-destructive">{error} <Button variant="outline" onClick={() => setReload(value => value + 1)} disabled={busy}>Retry</Button></p>}
    {canUpload && <label className="block">Upload verification file (maximum 20 MB)
      <input type="file" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} />
    </label>}
    {busy && <p role="status">Processing attachments...</p>}
    {!busy && !error && !items.length && <p>No attachments yet.</p>}
    <ul>{items.map(item => <li key={item.id} className="flex items-center justify-between gap-4 py-2">
      <span>{item.fileName} ({Math.ceil(item.fileSizeBytes / 1024)} KB)</span>
      <Button variant="outline" disabled={busy} onClick={() => void download(item.id)}>Download</Button>
    </li>)}</ul>
  </section>;
}
