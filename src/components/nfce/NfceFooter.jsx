import React from 'react';
import { CheckCircle, Clock, List } from 'lucide-react';

const NfceFooter = ({ totals }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 text-sm font-medium text-slate-700">
      <div className="flex items-center justify-center p-3 bg-slate-50">
        <List className="w-4 h-4 mr-2 text-slate-500" />
        Total de Pedidos: <span className="font-bold ml-1.5">{totals.totalOrders}</span>
      </div>
      <div className="flex items-center justify-center p-3 bg-slate-50">
        <Clock className="w-4 h-4 mr-2 text-yellow-600" />
        Notas Pendentes: <span className="font-bold ml-1.5">{totals.pending}</span>
      </div>
      <div className="flex items-center justify-center p-3 bg-slate-50">
        <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
        Total Autorizado: <span className="font-bold ml-1.5 text-green-700">{formatCurrency(totals.authorized)}</span>
      </div>
    </div>
  );
};

export default NfceFooter;