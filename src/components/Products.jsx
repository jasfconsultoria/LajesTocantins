import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ShoppingCart, RefreshCw, Loader2, Search, MoreHorizontal, Pencil, Info } from 'lucide-react';

const Products = ({ handleNotImplemented }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const { user, session } = useAuth();
    const { toast } = useToast();

    const fetchProducts = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao buscar produtos', description: error.message });
        } else {
            setProducts(data);
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSync = async () => {
        setSyncing(true);
        toast({ title: 'Sincronizando produtos...', description: 'Buscando dados atualizados do WooCommerce.' });
        try {
            const { data, error } = await supabase.functions.invoke('sync-woo-products', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast({ title: 'Sincronização Concluída!', description: `${data.new_products_count} produtos foram sincronizados.` });
            await fetchProducts();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro na Sincronização', description: error.message });
        } finally {
            setSyncing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Gerenciamento de Produtos</h1>
                    <p className="text-slate-600 mt-2">Visualize e gerencie os produtos da sua loja WooCommerce.</p>
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
                            placeholder="Buscar por nome ou SKU..."
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
                                <th scope="col" className="table-header">Produto</th>
                                <th scope="col" className="table-header">SKU</th>
                                <th scope="col" className="table-header">Preço</th>
                                <th scope="col" className="table-header">Estoque</th>
                                <th scope="col" className="table-header text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan="5" className="text-center p-8"><Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-600" /></td></tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr><td colSpan="5" className="text-center p-8 text-slate-500">Nenhum produto encontrado. Tente sincronizar.</td></tr>
                            ) : (
                                filteredProducts.map(product => (
                                    <motion.tr key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                        <td className="table-cell font-medium text-slate-900">{product.name}</td>
                                        <td className="table-cell">{product.sku || 'N/A'}</td>
                                        <td className="table-cell">{formatCurrency(product.price)}</td>
                                        <td className="table-cell">{product.stock_quantity ?? 'N/A'}</td>
                                        <td className="table-cell text-center">
                                            <div className="flex justify-center items-center space-x-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Detalhes do Produto')}>
                                                    <Info className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleNotImplemented('Editar Produto')}>
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

export default Products;