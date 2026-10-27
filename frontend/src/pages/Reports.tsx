import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { FileDown, Table as TableIcon, FileText } from 'lucide-react';
import api from '../api/axios';

const Reports: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const downloadReport = async (type: 'gpb' | 'gar' | 'beneficiaries', format: 'excel' | 'pdf') => {
    setLoading(`${type}-${format}`); setError(''); setNotice('');
    try {
      let url = '';
      let filename = '';
      
      if (type === 'gpb') {
        url = `/reports/gpb-excel?year=${year}`;
        filename = `GPB_Report_${year}.xlsx`;
      } else if (type === 'gar') {
        url = `/reports/gar-excel?year=${year}`;
        filename = `GAR_Report_${year}.xlsx`;
      } else if (type === 'beneficiaries') {
        url = '/reports/beneficiaries-pdf';
        filename = 'Beneficiary_Registry.pdf';
      }

      const response = await api.get(url, { responseType: 'blob' });
      const blob = response.data;
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      setNotice(`${type.toUpperCase()} report download prepared. Review completeness before use.`);
    } catch (error) {
      setError('Failed to generate report');
    } finally {
      setLoading(null);
    }
  };

  const reportCards = [
    {
      id: 'gpb',
      title: 'GAD Plan and Budget (GPB)',
      description: 'Working export of stored plans and budget items for the selected year.',
      format: 'EXCEL',
      icon: TableIcon,
      action: () => downloadReport('gpb', 'excel')
    },
    {
      id: 'gar',
      title: 'GAD Accomplishment Report (GAR)',
      description: 'Working export of reported accomplishments and expenditure for the selected year.',
      format: 'EXCEL',
      icon: TableIcon,
      action: () => downloadReport('gar', 'excel')
    },
    {
      id: 'beneficiaries',
      title: 'Beneficiary Registry',
      description: 'Up to 100 accessible registry records across all years. Registration does not establish service participation.',
      format: 'PDF',
      icon: FileText,
      action: () => downloadReport('beneficiaries', 'pdf')
    }
  ];

  const years = Array.from({ length: Math.max(2026, new Date().getFullYear()) - 2024 + 1 }, (_, i) => 2024 + i);
  return (
    <div className="analytics-dashboard management-page">
      <header className="dashboard-intro">
        <div><h1>Reports and Exports</h1><p className="text-muted-foreground">Download working exports; official template acceptance is pending.</p></div>
        <div className="period-control"><label htmlFor="report-year">GPB / GAR Year</label><select id="report-year" disabled={!!loading} value={year} onChange={e => { setYear(e.target.value); setError(''); setNotice(''); }}>{years.map(y => <option key={y}>{y}</option>)}</select></div>
      </header>
      <section className="analytics-notice" aria-label="Export scope"><p>Exports use records available to your account. The year filter applies only to GPB and GAR. Source ownership remains with the offices recorded on the underlying plans, accomplishments and registry records.</p></section>
      {error && <p role="alert" className="management-error">{error}. Retry the download below; no export was confirmed.</p>}
      {notice && <p role="status">{notice}</p>}
      {loading && <p role="status">Preparing export...</p>}
      <section className="analytics-panel report-catalog" aria-label="Available exports">
        {reportCards.map(report => <article key={report.id} className="report-row">
          <report.icon size={24} aria-hidden="true" className="text-primary" />
          <div><h2>{report.title}</h2><p className="text-muted-foreground">{report.description}</p><p className="report-metadata">{report.format} / {report.id === 'beneficiaries' ? 'All years / Up to 100 records' : `Fiscal year ${year}`} / Working export</p></div>
          <Button onClick={report.action} disabled={!!loading} aria-label={'Download ' + report.title}><FileDown size={16} aria-hidden="true" />Download</Button>
        </article>)}
      </section>
      <section className="analytics-panel source-metadata" aria-label="Report verification notes">
        <h2>Before using an export</h2><dl>
          <div><dt>Verification</dt><dd>Official GPB and GAR templates require confirmation by the designated report owners. No certification or approval is implied.</dd></div>
          <div><dt>Completeness</dt><dd>Review source records and completeness before using these exports for planning. The registry PDF is limited to 100 records and does not use the year filter.</dd></div>
        </dl>
      </section>
    </div>
  );
};
export default Reports;
