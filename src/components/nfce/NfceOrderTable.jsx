import React from 'react';
import { FileText } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import NfceOrderRow from '@/components/nfce/NfceOrderRow';

const NfceOrderTable = ({
  orders,
  selectedOrders,
  processingOrders,
  onSelectOrder,
  onViewOrder,
  onGenerateNfce,
  onDownloadXml,
  onCancelNfce,
  onViewNfceDetails,
}) => {
  const handleSelectAll = (checked) => {
    if (checked) {
      const allOrderIds = orders
        .filter((o) => ['not_issued', 'rejected'].includes(o.nfceStatus))
        .map((order) => order.id);
      onSelectOrder(allOrderIds);
    } else {
      onSelectOrder([]);
    }
  };

  const selectableOrdersCount = orders.filter((o) =>
    ['not_issued', 'rejected'].includes(o.nfceStatus)
  ).length;

  const isAllSelected =
    selectableOrdersCount > 0 && selectedOrders.length === selectableOrdersCount;
  const isIndeterminate = selectedOrders.length > 0 && !isAllSelected;

  return (
    <div className="data-table responsive-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="table-header">
            <th className="p-3 w-12 text-center">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Selecionar todos"
                disabled={selectableOrdersCount === 0}
                data-state={
                  isIndeterminate
                    ? 'indeterminate'
                    : isAllSelected
                    ? 'checked'
                    : 'unchecked'
                }
              />
            </th>
            <th className="text-left p-3">Nº Pedido</th>
            <th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Data</th>
            <th className="text-left p-3">Total</th>
            <th className="text-left p-3">Status Pedido</th>
            <th className="text-left p-3">Status Nota</th>
            <th className="text-center p-3">Ações</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? (
            orders.map((order) => (
              <NfceOrderRow
                key={order.id}
                order={order}
                isSelected={selectedOrders.includes(order.id)}
                isProcessing={processingOrders.has(order.id)}
                onSelect={(id) => onSelectOrder(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                onView={onViewOrder}
                onGenerate={onGenerateNfce}
                onDownload={onDownloadXml}
                onCancel={onCancelNfce}
                onViewNfceDetails={onViewNfceDetails}
              />
            ))
          ) : (
            <tr>
              <td colSpan="8" className="text-center p-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold">Nenhum pedido encontrado</h3>
                <p>Clique em "Sincronizar Pedidos" para buscar os dados mais recentes da sua loja.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default NfceOrderTable;