import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { getStatusBadge } from '@/lib/utils.jsx';
import NfceActions from '@/components/nfce/NfceActions';

const NfceOrderRow = ({ order, isSelected, isProcessing, onSelect, onView, onGenerate, onDownload, onCancel, onViewNfceDetails }) => {
  
  const getOrderStatusBadge = (status) => {
    const baseClasses = 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    switch (status.toLowerCase()) {
      case 'processing':
      case 'processando':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'completed':
      case 'concluído':
        return `${baseClasses} bg-green-100 text-green-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const translateStatus = (status) => {
    const statusMap = {
      processing: 'Processando',
      completed: 'Concluído',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  return (
    <tr className="table-row">
      <td className="p-3 text-center">
        {['not_issued', 'rejected', 'pending'].includes(order.nfceStatus) && !isProcessing && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(order.id)}
            aria-label={`Selecionar pedido ${order.id}`}
          />
        )}
      </td>
      <td className="p-3 font-mono font-medium">#{order.id}</td>
      <td className="p-3">{order.customer}</td>
      <td className="p-3">{new Date(order.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</td>
      <td className="p-3 font-medium">{order.total}</td>
      <td className="p-3">
        <span className={getOrderStatusBadge(order.status)}>{translateStatus(order.status)}</span>
      </td>
      <td className="p-3">{getStatusBadge(order.nfceStatus, order.nfeNumber)}</td>
      <td className="p-3 text-center">
        <NfceActions
          order={order}
          isProcessing={isProcessing}
          onView={onView}
          onGenerate={onGenerate}
          onDownload={onDownload}
          onCancel={onCancel}
          onViewNfceDetails={onViewNfceDetails}
        />
      </td>
    </tr>
  );
};

export default NfceOrderRow;