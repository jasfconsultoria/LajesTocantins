import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

import NfceHeader from '@/components/nfce/NfceHeader';
import NfceFilterBar from '@/components/nfce/NfceFilterBar';
import NfceOrderTable from '@/components/nfce/NfceOrderTable';
import OrderDetailsDialog from '@/components/nfce/OrderDetailsDialog';
import NfceDetailsDialog from '@/components/nfce/NfceDetailsDialog';
import NfceFooter from '@/components/nfce/NfceFooter';
import EmissionProgressModal from '@/components/nfce/EmissionProgressModal';
import { Button } from './ui/button.jsx';
import { AlertTriangle, Zap } from 'lucide-react';

const Nfce = ({ isWooConnected, setActiveTab, isSupabaseConnected, onWooConnectionChange }) => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [selectedOrders, setSelectedOrders] = useState([]);
    const [processingOrders, setProcessingOrders] = useState(new Set());
    const [isSyncing, setIsSyncing] = useState(false);
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [selectedOrderForView, setSelectedOrderForView] = useState(null);
    const [selectedNfceForDetails, setSelectedNfceForDetails] = useState(null);
    const [orderToEmit, setOrderToEmit] = useState(null);
    const [companyData, setCompanyData] = useState(null);
    const { toast } = useToast();
    const { user, session } = useAuth();

    const ensureSettings = useCallback(async () => {
        if (!user) return;
        const { error } = await supabase.rpc('ensure_user_settings_exist');
        if (error) {
            console.error("Error ensuring user settings:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao verificar configurações',
                description: 'Não foi possível garantir que suas configurações de empresa e NFC-e existem.',
            });
        }
    }, [user, toast]);
    
    const fetchInitialData = useCallback(async () => {
        if (!user) return;
        
        try {
            await ensureSettings();
    
            const { data: company, error: companyError } = await supabase
                .from('companies')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (companyError && companyError.code !== 'PGRST116') {
                throw companyError;
            }
            setCompanyData(company);
    
            const { data, error } = await supabase
                .from('orders')
                .select('*, items:order_items(*)')
                .eq('user_id', user.id)
                .in('woo_status', ['processing', 'completed', 'processando', 'concluído'])
                .order('order_date', { ascending: false });
    
            if (error) {
                throw error;
            }
            
            const formattedOrders = data.map(o => ({
                id: o.id,
                customer: o.customer_name,
                date: o.order_date,
                total: `R$ ${parseFloat(o.total_value).toFixed(2).replace('.', ',')}`,
                total_value: o.total_value,
                status: o.woo_status,
                nfceStatus: o.nfce_status || 'not_issued',
                nfeNumber: o.nfe_number,
                chaveAcesso: o.chave_acesso,
                protocol: o.protocol,
                xml: o.xml_content,
                items: o.items || [],
            }));
            setOrders(formattedOrders);

        } catch(error) {
             toast({
                variant: 'destructive',
                title: 'Erro ao buscar dados iniciais',
                description: error.message,
            });
        }

    }, [user, toast, ensureSettings]);
    
    const handleSyncOrders = useCallback(async (isInitialSync = false) => {
        if (!isWooConnected) {
            if (!isInitialSync) {
                toast({ variant: 'destructive', title: 'WooCommerce Desconectado', description: 'Configure a conexão na aba WooCommerce.' });
            }
            return;
        }
        setIsSyncing(true);
        if (!isInitialSync) {
            toast({ title: "Sincronizando...", description: "Buscando novos pedidos do WooCommerce. Isso pode levar um momento..." });
        }

        try {
            const { data, error } = await supabase.functions.invoke('sync-woo-orders', {
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
    
            if (error) throw error;
    
            if (data.new_orders_count === 0) {
                 if (!isInitialSync) toast({ title: "Nenhum Pedido Novo", description: "Não foram encontrados novos pedidos para sincronizar." });
            } else {
                 if (!isInitialSync) toast({ title: "Sincronização Concluída!", description: `${data.new_orders_count} pedido(s) foram sincronizados.` });
            }
    
        } catch (error) {
            const errorMsg = error.message || 'Falha ao buscar pedidos.';
            if (!isInitialSync) toast({ variant: 'destructive', title: 'Erro na Sincronização', description: errorMsg });
        } finally {
            await fetchInitialData();
            setIsSyncing(false);
        }

    }, [isWooConnected, toast, session, fetchInitialData]);

    const checkConnectionAndSync = useCallback(async () => {
        if (!user || !session) return;
        
        try {
            const { data, error } = await supabase.functions.invoke('sync-woo-orders', {
                method: 'POST',
                body: JSON.stringify({ test_connection: true }),
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            onWooConnectionChange(true);
            await handleSyncOrders(true);

        } catch (e) {
            onWooConnectionChange(false);
            await fetchInitialData();
        }
    }, [user, session, onWooConnectionChange, handleSyncOrders, fetchInitialData]);

    useEffect(() => {
        if (isSupabaseConnected && user) {
            checkConnectionAndSync();
        }
    }, [isSupabaseConnected, user, checkConnectionAndSync]);

    const handleFilter = useCallback((filters) => {
        let tempOrders = [...orders];
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            tempOrders = tempOrders.filter(o =>
                String(o.id).includes(term) ||
                o.customer.toLowerCase().includes(term)
            );
        }
        if (filters.status) {
            tempOrders = tempOrders.filter(o => {
                const currentStatus = o.nfceStatus || 'not_issued';
                if (filters.status === 'pending') {
                    return ['not_issued', 'rejected', 'pending'].includes(currentStatus);
                }
                return currentStatus === filters.status;
            });
        }
        if (filters.startDate) {
            tempOrders = tempOrders.filter(o => new Date(o.date) >= new Date(filters.startDate));
        }
        if (filters.endDate) {
            const endOfDay = new Date(filters.endDate + 'T23:59:59');
            tempOrders = tempOrders.filter(o => new Date(o.date) <= endOfDay);
        }
        setFilteredOrders(tempOrders);
    }, [orders]);

    useEffect(() => {
        setFilteredOrders(orders);
    }, [orders]);

    const handleGenerateNfce = async (orderId) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            setOrderToEmit(order);
        }
    };

    const onEmissionComplete = () => {
        setOrderToEmit(null);
        fetchInitialData();
    };

    const handleBatchGenerate = async () => {
        setIsBatchProcessing(true);
        toast({ title: 'Iniciando emissão em lote...', description: 'As notas serão processadas uma a uma.' });
        
        const ordersToProcess = orders.filter(o => selectedOrders.includes(o.id));
        
        for (const order of ordersToProcess) {
            await new Promise(resolve => {
                setOrderToEmit({ ...order, isBatch: true, onBatchComplete: resolve });
            });
        }
        
        setSelectedOrders([]);
        setIsBatchProcessing(false);
        toast({ title: 'Emissão em lote concluída!', description: 'Todos os pedidos selecionados foram processados.' });
        await fetchInitialData();
    };
    
    const handleCancelNfce = async (orderId) => {
        const { error } = await supabase.from('orders').update({ nfce_status: 'cancelled' }).eq('id', orderId);
        if (error) {
            toast({ variant: 'destructive', title: 'Erro ao Cancelar', description: error.message });
        } else {
            toast({ title: "🗑️ NFC-e Cancelada", description: `A NFC-e para o pedido #${orderId} foi cancelada.` });
            await fetchInitialData();
        }
    };

    const handleDownloadXml = (order) => {
        if (!order.xml) {
            toast({ variant: 'destructive', title: 'XML não encontrado', description: 'O XML para esta nota ainda não foi gerado ou salvo.' });
            return;
        }
        const blob = new Blob([order.xml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${order.chaveAcesso || `nfce-${order.nfeNumber}`}.xml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: "📥 Download Iniciado", description: `O XML da NFC-e #${order.nfeNumber} está sendo baixado.` });
    };

    const totals = useMemo(() => {
        const authorizedTotal = filteredOrders
            .filter(o => o.nfceStatus === 'authorized')
            .reduce((sum, order) => {
                const value = parseFloat(order.total.replace('R$ ', '').replace(',', '.'));
                return sum + (isNaN(value) ? 0 : value);
            }, 0);
        
        const pendingCount = filteredOrders.filter(o => ['not_issued', 'rejected', 'pending'].includes(o.nfceStatus)).length;

        return {
            authorized: authorizedTotal,
            pending: pendingCount,
            totalOrders: filteredOrders.length
        };
    }, [filteredOrders]);

    return (
        <div className="space-y-6">
            <NfceHeader
                selectedOrdersCount={selectedOrders.length}
                onSync={() => handleSyncOrders(false)}
                onBatchGenerate={handleBatchGenerate}
                isSyncing={isSyncing}
                isBatchProcessing={isBatchProcessing}
                isWooConnected={isWooConnected}
            />

            {!isSupabaseConnected && (
                 <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-r-lg">
                    <div className="flex">
                        <div className="py-1"><Zap className="h-5 w-5 mr-3 text-red-600"/></div>
                        <div>
                            <p className="font-bold">ERRO DE CONEXÃO COM O BACKEND</p>
                            <p className="text-sm">Não foi possível conectar ao Supabase. As funcionalidades de produção estão desativadas. Verifique a integração.</p>
                        </div>
                    </div>
                </div>
            )}

            {!isWooConnected && (
                <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-r-lg">
                    <div className="flex">
                        <div className="py-1"><AlertTriangle className="h-5 w-5 mr-3"/></div>
                        <div>
                            <p className="font-bold">Ação Necessária: Conecte sua loja</p>
                            <p className="text-sm">Para sincronizar pedidos, você precisa primeiro configurar a integração com WooCommerce.</p>
                            <Button variant="link" className="p-0 h-auto mt-1 text-yellow-900 font-bold" onClick={() => setActiveTab('woocommerce')}>
                                Ir para Configurações do WooCommerce
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="data-table-container">
                <NfceFilterBar onFilter={handleFilter} initialOrders={orders}/>
                <NfceOrderTable
                    orders={filteredOrders}
                    selectedOrders={selectedOrders}
                    processingOrders={processingOrders}
                    onSelectOrder={setSelectedOrders}
                    onViewOrder={(order) => setSelectedOrderForView(order)}
                    onViewNfceDetails={(order) => setSelectedNfceForDetails(order)}
                    onGenerateNfce={handleGenerateNfce}
                    onDownloadXml={handleDownloadXml}
                    onCancelNfce={handleCancelNfce}
                    companyData={companyData}
                />
                <NfceFooter totals={totals} />
            </div>

            <OrderDetailsDialog
                order={selectedOrderForView}
                isOpen={!!selectedOrderForView}
                onClose={() => setSelectedOrderForView(null)}
            />

            <NfceDetailsDialog
                order={selectedNfceForDetails}
                isOpen={!!selectedNfceForDetails}
                onClose={() => setSelectedNfceForDetails(null)}
            />

            <EmissionProgressModal
                order={orderToEmit}
                isOpen={!!orderToEmit}
                onClose={onEmissionComplete}
            />
        </div>
    );
};

export default Nfce;