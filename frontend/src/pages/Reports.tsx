import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { FileDown, Table as TableIcon, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { apiUrl } from '../api/apiUrl';

const Reports: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState<string | null>(null);

  const downloadReport = async (type: 'gpb' | 'gar' | 'beneficiaries', format: 'excel' | 'pdf') => {
    setLoading(`${type}-${format}`);
    try {
      let url = '';
      let filename = '';
      
      if (type === 'gpb') {
        url = apiUrl(`/reports/gpb-excel?year=${year}`);
        filename = `GPB_Report_${year}.xlsx`;
      } else if (type === 'gar') {
        url = apiUrl(`/reports/gar-excel?year=${year}`);
        filename = `GAR_Report_${year}.xlsx`;
      } else if (type === 'beneficiaries') {
        url = apiUrl(`/reports/beneficiaries-pdf?year=${year}`);
        filename = `Beneficiary_List_${year}.pdf`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('tagad_token')}`
        }
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success(`${type.toUpperCase()} Report downloaded successfully`);
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(null);
    }
  };

  const reportCards = [
    {
      id: 'gpb',
      title: 'GAD Plan and Budget (GPB)',
      description: 'Comprehensive annual plan showing proposed GAD activities and budget allocations.',
      format: 'EXCEL',
      icon: TableIcon,
      action: () => downloadReport('gpb', 'excel')
    },
    {
      id: 'gar',
      title: 'GAD Accomplishment Report (GAR)',
      description: 'Official report of achievements, actual beneficiaries, and budget utilization.',
      format: 'EXCEL',
      icon: TableIcon,
      action: () => downloadReport('gar', 'excel')
    },
    {
      id: 'beneficiaries',
      title: 'Beneficiary Registry',
      description: 'Complete list of individuals who availed of LGU programs and services.',
      format: 'PDF',
      icon: FileText,
      action: () => downloadReport('beneficiaries', 'pdf')
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#111827]">Reports Central</h1>
          <p className="text-sm font-medium text-[#6B7280]">Generate and download official GAD documents</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-[#E5E7EB] shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Report Year</span>
          <select 
            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-[#6366F1] cursor-pointer outline-none"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y.toString()}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {reportCards.map((report) => (
          <Card key={report.id} className="border-[#E5E7EB] shadow-sm flex flex-col bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="p-8 pb-4">
              <div className="w-12 h-12 rounded-xl bg-[#F9FAFB] flex items-center justify-center mb-6 group-hover:bg-[#EEF2FF] transition-colors">
                <report.icon className="h-6 w-6 text-[#9CA3AF] group-hover:text-[#6366F1]" />
              </div>
              <CardTitle className="text-xl font-bold text-[#111827] mb-2">{report.title}</CardTitle>
              <CardDescription className="text-sm font-medium text-[#6B7280] leading-relaxed">
                {report.description}
              </CardDescription>
            </CardHeader>
            <div className="flex-1" />
            <CardFooter className="px-8 py-6 bg-gray-50/50 flex justify-between items-center border-t border-gray-50">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-white border border-gray-100 text-[#9CA3AF] uppercase tracking-widest">
                {report.format}
              </span>
              <Button 
                onClick={report.action} 
                disabled={!!loading}
                className="bg-[#6366F1] hover:bg-[#4F46E5] text-white rounded-lg shadow-sm font-bold px-6 h-10"
              >
                {loading?.startsWith(report.id) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileDown className="h-4 w-4 mr-2" /> Download
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-16 p-8 bg-[#EEF2FF] rounded-[2rem] border border-[#E0E7FF] flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-[#6366F1] opacity-[0.03] rounded-full" />
        <div className="p-5 bg-white rounded-[1.5rem] shadow-sm border border-indigo-100 relative">
          <FileText className="h-10 w-10 text-[#6366F1]" />
        </div>
        <div className="text-center md:text-left relative">
          <h3 className="text-xl font-bold text-[#111827]">Need specific data insights?</h3>
          <p className="text-[#6366F1] text-sm font-medium max-w-xl mt-2 leading-relaxed">
            These documents follow official municipal templates. For custom datasets or filtered visualisations, visit the Data Encoding or Monitoring modules to export tailored views.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Reports;
