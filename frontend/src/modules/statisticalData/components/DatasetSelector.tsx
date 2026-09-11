import React, { useState, useEffect } from 'react';
import { DatasetItem } from '../../../types/statisticalData';
import { listDatasets } from '../../../api/statisticalData';
import { CreateDatasetModal } from './CreateDatasetModal';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Database,
  Plus,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building2,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface DatasetSelectorProps {
  selectedDataset: DatasetItem | null;
  onSelectDataset: (dataset: DatasetItem | null) => void;
  disabled?: boolean;
}

export const DatasetSelector: React.FC<DatasetSelectorProps> = ({
  selectedDataset,
  onSelectDataset,
  disabled = false,
}) => {
  const { user, hasRole, isAdmin, isSuperAdmin } = useAuth();
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const isViewer = !isAdmin && !isSuperAdmin && !hasRole('ENCODER');

  const fetchDatasets = async () => {
    try {
      setLoading(true);
      const res = await listDatasets({ limit: 100 });
      setDatasets(res.datasets);

      // If nothing selected yet and we have datasets, default to first active draft or first dataset
      if (!selectedDataset && res.datasets.length > 0) {
        const draft = res.datasets.find((d) => d.publicationStatus === 'DRAFT') || res.datasets[0];
        onSelectDataset(draft);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDatasetChange = (datasetId: string) => {
    const found = datasets.find((d) => d.id === datasetId);
    if (found) {
      onSelectDataset(found);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] font-semibold">
            DRAFT (Editable)
          </Badge>
        );
      case 'VALIDATED':
        return (
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold">
            VALIDATED
          </Badge>
        );
      case 'OFFICIAL':
        return (
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px] font-semibold">
            <Lock className="w-2.5 h-2.5 mr-1 inline" /> OFFICIAL (Locked)
          </Badge>
        );
      case 'PUBLISHED':
        return (
          <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 text-[10px] font-semibold">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline" /> PUBLISHED
          </Badge>
        );
      case 'WITHDRAWN':
        return (
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 text-[10px] font-semibold">
            WITHDRAWN
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Target Statistical Dataset
              </span>
              {selectedDataset && getStatusBadge(selectedDataset.publicationStatus)}
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {selectedDataset ? selectedDataset.name : 'No dataset selected'}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center text-xs text-slate-500 gap-1.5 px-3 py-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              Loading datasets...
            </div>
          ) : (
            <Select
              value={selectedDataset?.id || ''}
              onValueChange={handleDatasetChange}
              disabled={disabled || datasets.length === 0}
            >
              <SelectTrigger className="w-[260px] h-9 text-xs font-medium bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <SelectValue placeholder="Select working dataset..." />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {datasets.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs py-2">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                        <span>{d.name}</span>
                        <span className="text-[10px] text-slate-500 font-normal font-mono">({d.datasetCode})</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span>{d.publicationStatus}</span>
                        {d.reportingYear && <span>• {d.reportingYear}</span>}
                        {d.sourceAgency && <span>• {d.sourceAgency}</span>}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {!isViewer && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              disabled={disabled}
              className="h-9 text-xs border-dashed border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Dataset
            </Button>
          )}
        </div>
      </div>

      {selectedDataset && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
            <span>Code:</span>
            <span className="font-semibold">{selectedDataset.datasetCode}</span>
          </div>

          {selectedDataset.sourceAgency && (
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Agency: {selectedDataset.sourceAgency}</span>
            </div>
          )}

          {selectedDataset.reportingYear && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Year: {selectedDataset.reportingYear}</span>
            </div>
          )}

          {selectedDataset.publicationStatus !== 'DRAFT' && (
            <div className="ml-auto flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-md text-[11px] font-medium border border-amber-200 dark:border-amber-800">
              <Lock className="w-3 h-3 shrink-0" />
              <span>Dataset is {selectedDataset.publicationStatus}. Observations are read-only and locked against new mutations.</span>
            </div>
          )}
        </div>
      )}

      {datasets.length === 0 && !loading && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No datasets found. Create a DRAFT dataset to begin entering statistical observations.</span>
          </div>
          {!isViewer && (
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-3 h-3 mr-1" />
              Create DRAFT Dataset
            </Button>
          )}
        </div>
      )}

      <CreateDatasetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newDs) => {
          setDatasets((prev) => [newDs, ...prev]);
          onSelectDataset(newDs);
        }}
      />
    </div>
  );
};
