import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Users, RefreshCw, Loader2, Search, Pencil, Info } from 'lucide-react';

const Customers = ({ handleNotImplemented }) => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { user, session } = useAuth();
    const { toast } = useToast();

    const fetchCustomers = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('user_id', user.id)
            .order('first_name', { ascending: true });

        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao buscar clientes', description: error.message });
        } else {
            setCustomers(data);
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const handleSync = async () => {
        setSyncing(true);
        toast({ title: 'Sincronizando clientes...', description: 'Buscando dados atualizados do WooCommerce.' });
        try {
            const { data, error } = await supabase.functions.invoke('sync-woo-customers', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast({ title: 'Sincronização Concluída!', description: `${data.new_customers_count} clientes foram sincronizados.` });
            await fetchCustomers();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
        } finally {
            setSyncing(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Clientes</h1>
                    <p className="text-slate-600 mt-2">Visualize e gerencie os clientes da sua loja WooCommerce.</p>
                </div>
                <Button onClick={handleSync} disabled={syncing || loading}>
                    {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {syncing ? 'Sincronizando...' : 'Sincronizar com WooCommerce'}
                </Button>
            </div>

            <div className="bg-white/80 backdrop-blur-sm border border-slate-200/80 rounded-xl shadow-sm p-4">
                <div className="flex items-center mb-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, e-mail ou usuário..."
                            className="form-input pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="table-header">Nome</th>
                                <th scope="col" className="table-header">E-mail</th>
                                <th scope="col" className="table-header">Usuário</th>
                                <th scope="col" className="table-header text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan="4" className="text-center p-8"><Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" /></td></tr>
                            ) : filteredCustomers.length === 0 ? (
                                <tr><td colSpan="4" className="text-center p-8 text-slate-500">Nenhum cliente encontrado. Tente sincronizar.</td></tr>
                            ) : (
                                filteredCustomers.map(customer => (
                                    <motion.tr key={customer.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="table-cell font-medium text-slate-900">{`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A'}</td>
                                        <td className="table-cell">{customer.email}</td>
                                        <td className="table-cell">{customer.username}</td>
                                        <td className="table-cell text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Detalhes do Cliente')}>
                                                    <Info className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Editar Cliente')}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Customers;