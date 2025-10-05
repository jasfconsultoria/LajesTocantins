import React, { useState } from 'react';
import { Database } from 'lucide-react';

const Logs = () => {
    const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '' });

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Logs de Emissão</h1>
                <p className="text-slate-600 mt-2">Acompanhe todas as operações de emissão de notas fiscais.</p>
            </div>

            <div className="filter-bar">
                <select name="type" className="status-filter" value={filters.type} onChange={handleFilterChange}>
                    <option value="">Todos os tipos</option>
                    <option value="success">Sucesso</option>
                    <option value="error">Erro</option>
                    <option value="processing">Processando</option>
                </select>
                <input name="startDate" type="date" className="date-picker" value={filters.startDate} onChange={handleFilterChange} />
                <input name="endDate" type="date" className="date-picker" value={filters.endDate} onChange={handleFilterChange} />
            </div>

            <div className="space-y-4">
                <div className="text-center p-8 text-slate-500 bg-white rounded-lg shadow">
                     <Database className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                    <h3 className="text-lg font-semibold">Nenhum Log Encontrado</h3>
                    <p>Ainda não há registros de emissão para os filtros selecionados.</p>
                </div>
            </div>
        </div>
    );
};

export default Logs;