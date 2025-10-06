import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Hand, Calendar, TrendingUp, Users, FileText, Loader2, ShoppingCart, MapPin, User } from 'lucide-react';
import { formatCurrency, normalizeString } from '@/lib/utils';
import ClientSalesChart from '@/components/charts/ClientSalesChart';
import CitySalesChart from '@/components/charts/CitySalesChart';

const Dashboard = () => {
    const { user, activeCompany } = useAuth();
    const { toast } = useToast();
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const [previousMonthlyRevenue, setPreviousMonthlyRevenue] = useState(0);
    const [uniqueClients, setUniqueClients] = useState(0);
    const [totalOrders, setTotalOrders] = useState(0); 
    const [salesByClient, setSalesByClient] = useState([]); 
    const [salesByCity, setSalesByCity] = useState([]); 
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        if (!user || !activeCompany?.cnpj) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const today = new Date();
            const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
            const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

            const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString();
            const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999).toISOString();

            // Fetch current month's data for all metrics
            const { data: currentMonthBudgets, error: currentMonthError } = await supabase
                .from('orcamento_summary_view')
                .select('total_liquido_calculado, cliente_id, nome_cliente')
                .eq('cnpj_empresa', activeCompany.cnpj)
                .eq('status_orcamento', 'faturado') // Changed from faturado: true
                .gte('data_orcamento', currentMonthStart)
                .lte('data_orcamento', currentMonthEnd);

            if (currentMonthError) throw currentMonthError;

            let currentRevenue = 0;
            let currentUniqueClients = new Set();
            let currentTotalOrders = 0;
            const clientSalesMap = new Map();
            const clientCpfCnpjToIdMap = new Map(); 

            if (currentMonthBudgets) {
                currentTotalOrders = currentMonthBudgets.length;
                currentMonthBudgets.forEach(item => {
                    currentRevenue += (item.total_liquido_calculado || 0);
                    if (item.cliente_id) {
                        currentUniqueClients.add(item.cliente_id);
                        clientCpfCnpjToIdMap.set(item.cliente_id, item.cliente_id); 
                    }

                    // Aggregate sales by client
                    const clientKey = item.cliente_id || 'Desconhecido';
                    const clientName = item.nome_cliente || 'Cliente Desconhecido';
                    const currentClientTotal = clientSalesMap.get(clientKey) || { name: clientName, total: 0 };
                    currentClientTotal.total += (item.total_liquido_calculado || 0);
                    clientSalesMap.set(clientKey, currentClientTotal);
                });
            }

            setMonthlyRevenue(currentRevenue);
            setUniqueClients(currentUniqueClients.size);
            setTotalOrders(currentTotalOrders);

            // Sort and set top 10 clients
            const sortedClientSales = Array.from(clientSalesMap.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
            setSalesByClient(sortedClientSales);

            // Fetch previous month's data for growth calculation
            const { data: prevMonthData, error: prevMonthError } = await supabase
                .from('orcamento_summary_view')
                .select('total_liquido_calculado')
                .eq('cnpj_empresa', activeCompany.cnpj)
                .eq('status_orcamento', 'faturado') // Changed from faturado: true
                .gte('data_orcamento', prevMonthStart)
                .lte('data_orcamento', prevMonthEnd);

            if (prevMonthError) throw prevMonthError;

            let prevRevenue = 0;
            if (prevMonthData) {
                prevRevenue = prevMonthData.reduce((sum, item) => sum + (item.total_liquido_calculado || 0), 0);
            }
            setPreviousMonthlyRevenue(prevRevenue);

            // Fetch client details for sales by city
            const uniqueClientCpfCnpjs = Array.from(currentUniqueClients);
            let salesByCityMap = new Map();

            if (uniqueClientCpfCnpjs.length > 0) {
                const { data: peopleData, error: peopleError } = await supabase
                    .from('pessoas_com_municipio') 
                    .select('cpf_cnpj, municipio_nome, uf')
                    .in('cpf_cnpj', uniqueClientCpfCnpjs);

                if (peopleError) throw peopleError;

                const clientLocationMap = new Map();
                if (peopleData) {
                    peopleData.forEach(p => {
                        clientLocationMap.set(p.cpf_cnpj, { city: p.municipio_nome, uf: p.uf });
                    });
                }

                currentMonthBudgets.forEach(item => {
                    if (item.cliente_id && item.total_liquido_calculado) {
                        const location = clientLocationMap.get(item.cliente_id);
                        if (location && location.city && location.uf) {
                            const cityKey = `${location.city}/${location.uf}`;
                            const currentCityTotal = salesByCityMap.get(cityKey) || { city: location.city, uf: location.uf, total: 0 };
                            currentCityTotal.total += item.total_liquido_calculado;
                            salesByCityMap.set(cityKey, currentCityTotal);
                        }
                    }
                });
            }

            const sortedCitySales = Array.from(salesByCityMap.values())
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
            setSalesByCity(sortedCitySales);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados do Dashboard",
                description: error.message,
            });
            setMonthlyRevenue(0);
            setPreviousMonthlyRevenue(0);
            setUniqueClients(0);
            setTotalOrders(0);
            setSalesByClient([]);
            setSalesByCity([]);
        } finally {
            setLoading(false);
        }
    }, [user, activeCompany, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const calculateGrowth = () => {
        if (previousMonthlyRevenue === 0) {
            return { value: monthlyRevenue > 0 ? '+100%' : '0%', isPositive: monthlyRevenue > 0 };
        }
        const growth = ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100;
        return { value: `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`, isPositive: growth >= 0 };
    };

    const growthData = calculateGrowth();

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-slate-600 mt-2">Bem-vindo ao seu painel de controle.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white flex flex-col items-center text-center">
                            <Calendar className="w-10 h-10 text-blue-600 mb-3" />
                            <div className="text-3xl font-bold text-slate-800 mb-1">{formatCurrency(monthlyRevenue)}</div>
                            <div className="text-sm text-slate-500">Faturamento Mensal</div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white flex flex-col items-center text-center">
                            <TrendingUp className={`w-10 h-10 mb-3 ${growthData.isPositive ? 'text-green-600' : 'text-red-600'}`} />
                            <div className={`text-3xl font-bold mb-1 ${growthData.isPositive ? 'text-green-800' : 'text-red-800'}`}>{growthData.value}</div>
                            <div className="text-sm text-slate-500">Crescimento (Mês a Mês)</div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white flex flex-col items-center text-center">
                            <Users className="w-10 h-10 text-purple-600 mb-3" />
                            <div className="text-3xl font-bold text-slate-800 mb-1">{uniqueClients}</div>
                            <div className="text-sm text-slate-500">Clientes Únicos</div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white flex flex-col items-center text-center">
                            <ShoppingCart className="w-10 h-10 text-orange-600 mb-3" /> 
                            <div className="text-3xl font-bold text-slate-800 mb-1">{totalOrders}</div>
                            <div className="text-sm text-slate-500">Total de Pedidos</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <User className="w-6 h-6 text-blue-600" /> Top 10 Vendas por Cliente
                            </h3>
                            {salesByClient.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Nenhuma venda por cliente encontrada.</p>
                            ) : (
                                <ClientSalesChart data={salesByClient} />
                            )}
                        </div>

                        <div className="bg-white/80 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-white">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin className="w-6 h-6 text-green-600" /> Top 10 Vendas por Cidade
                            </h3>
                            {salesByCity.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Nenhuma venda por cidade encontrada.</p>
                            ) : (
                                <CitySalesChart data={salesByCity} />
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;