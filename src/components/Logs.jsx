import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, XCircle, Info, Database } from 'lucide-react';

const LogIcon = ({ status }) => {
    switch (status) {
        case 'success':
            return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error':
            return <XCircle className="w-5 h-5 text-red-500" />;
        case 'processing':
            return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
        default:
            return <Info className="w-5 h-5 text-slate-500" />;
    }
};

const LogEntry = ({ log }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { status, details, created_at, order_id } = log;

    const getMessage = () => {
        if (status === 'success') return `NFC-e para pedido #${order_id} autorizada com sucesso.`;
        if (status === 'error') return `Falha na emissão da NFC-e para o pedido #${order_id}.`;
        if (status === 'processing') return `Processando emissão para o pedido #${order_id}...`;
        return `Log para pedido #${order_id}.`;
    };

    return (
        <div className={`log-entry ${status}-log`}>
            <div className="flex items-start space-x-4">
                <div className="mt-1">
                    <LogIcon status={status} />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-800">{getMessage()}</p>
                        <p className="text-xs text-slate-500">{new Date(created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    {details && (
                        <div className="mt-2">
                             <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setIsExpanded(!isExpanded)}>
                                {isExpanded ? 'Ocultar Detalhes' : 'Mostrar Detalhes'}
                            </Button>
                            {isExpanded && (
                                <pre className="mt-2 p-3 bg-slate-50 rounded-md text-xs whitespace-pre-wrap break-words">
                                    {JSON.stringify(details, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ type: '', startDate: '', endDate: '' });
    const { user } = useAuth();
    const { toast } = useToast();

    const fetchLogs = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        let query = supabase
            .from('emission_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (filters.type) {
            query = query.eq('status', filters.type);
        }
        if (filters.startDate) {
            query = query.gte('created_at', new Date(filters.startDate).toISOString());
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate);
            endOfDay.setHours(23, 59, 59, 999);
            query = query.lte('created_at', endOfDay.toISOString());
        }
        
        const { data, error } = await query;

        if (error) {
            toast({
                variant: 'destructive',
                title: 'Erro ao buscar logs',
                description: error.message,
            });
            setLogs([]);
        } else {
            setLogs(data);
        }
        setLoading(false);
    }, [user, toast, filters]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

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
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : logs.length > 0 ? (
                    logs.map(log => <LogEntry key={log.id} log={log} />)
                ) : (
                    <div className="text-center p-8 text-slate-500 bg-white rounded-lg shadow">
                         <Database className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-lg font-semibold">Nenhum Log Encontrado</h3>
                        <p>Ainda não há registros de emissão para os filtros selecionados.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Logs;