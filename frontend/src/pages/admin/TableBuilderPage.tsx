import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { TableBuilderList } from '../../modules/tableBuilder/components/TableBuilderList';
import { TableDetailView } from '../../modules/tableBuilder/components/TableDetailView';
import { CreateCustomTableModal } from '../../modules/tableBuilder/components/CreateCustomTableModal';

export const TableBuilderPage: React.FC = () => {
  const { id: paramTableId } = useParams<{ id?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const queryTableId = searchParams.get('tableId');
  const selectedTableId = paramTableId || queryTableId;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleSelectTable = (tableId: string) => {
    setSearchParams({ tableId });
  };

  const handleBackToList = () => {
    if (paramTableId) {
      navigate('/admin/table-builder');
    } else {
      searchParams.delete('tableId');
      setSearchParams(searchParams);
    }
  };

  const handleTableCreated = (newTable: any) => {
    if (newTable?.id) {
      setSearchParams({ tableId: newTable.id });
    }
  };

  return (
    <div className="space-y-6">
      {selectedTableId ? (
        <TableDetailView
          tableId={selectedTableId}
          onBack={handleBackToList}
        />
      ) : (
        <TableBuilderList
          onSelectTable={handleSelectTable}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      )}

      <CreateCustomTableModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleTableCreated}
      />
    </div>
  );
};

export default TableBuilderPage;
