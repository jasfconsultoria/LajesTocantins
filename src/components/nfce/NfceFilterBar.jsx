import React, { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';

const NfceFilterBar = ({ onFilter, initialOrders }) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDate = (date) => date.toISOString().split('T')[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState(formatDate(firstDayOfMonth));
  const [endDate, setEndDate] = useState(formatDate(today));

  const applyFilters = useCallback(() => {
    onFilter({ searchTerm, status, startDate, endDate });
  }, [searchTerm, status, startDate, endDate, onFilter]);

  useEffect(() => {
    const handler = setTimeout(() => {
      applyFilters();
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, applyFilters]);
  
  useEffect(() => {
    applyFilters();
  }, [status, startDate, endDate, initialOrders, applyFilters]);

  return (
    <div className="filter-bar">
      <div className="flex-grow relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nº do pedido ou nome do cliente..."
          className="search-input w-full pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <input
        type="date"
        className="date-picker"
        value={startDate}
        onChange={(e) => setStartDate(e.target.value)}
        max={endDate || formatDate(today)}
      />
      <input
        type="date"
        className="date-picker"
        value={endDate}
        onChange={(e) => setEndDate(e.target.value)}
        min={startDate}
        max={formatDate(today)}
      />
      <select
        className="status-filter"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option value="">Todos os status</option>
        <option value="pending">Pendente</option>
        <option value="authorized">Autorizada</option>
        <option value="rejected">Rejeitada</option>
        <option value="cancelled">Cancelada</option>
      </select>
    </div>
  );
};

export default NfceFilterBar;