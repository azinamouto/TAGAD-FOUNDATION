import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { StatisticalDataCatalog } from '../../modules/statisticalData/components/StatisticalDataCatalog';
import { TableDataEntryView } from '../../modules/statisticalData/components/TableDataEntryView';
import { TableDefinitionItem, DatasetItem } from '../../types/statisticalData';

export const StatisticalDataEntryPage: React.FC = () => {
  const { tableId: paramTableId } = useParams<{ tableId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTableId = searchParams.get('tableId');
  const activeTableId = paramTableId || queryTableId;

  // Lifted active dataset state so it persists across table navigation
  const [selectedDataset, setSelectedDataset] = useState<DatasetItem | null>(null);

  const handleSelectTable = (table: TableDefinitionItem) => {
    navigate(`/admin/statistical-data/${table.id}`);
  };

  const handleBack = () => {
    navigate('/admin/statistical-data');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {activeTableId ? (
        <TableDataEntryView
          tableId={activeTableId}
          onBack={handleBack}
          selectedDataset={selectedDataset}
          onSelectDataset={setSelectedDataset}
        />
      ) : (
        <StatisticalDataCatalog
          onSelectTable={handleSelectTable}
          selectedDataset={selectedDataset}
          onSelectDataset={setSelectedDataset}
        />
      )}
    </div>
  );
};

export default StatisticalDataEntryPage;
