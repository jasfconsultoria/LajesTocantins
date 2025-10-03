import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Hand, Calendar, TrendingUp, Users, FileText, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const Dashboard = () => {
    const { user, activeCompany } = useAuth();
    const { toast } = useToast();
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const [previousMonthlyRevenue, setPreviousMonthlyRevenue] = useState(0);
    const [uniqueClients, setUniqueClients] = useState(0);
    const [averageTicket, setAverageTicket] = useState(0);
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

            // Fetch current month's data
            const { data: currentMonthData, error: currentMonthError } = await supabase
                .from('orcamento_summary_view')
                .select('total_liquido_calculado, cliente_id')
                .eq('cnpj_empresa', activeCompany.cnpj)
                .eq('faturado', true)
                .gte('data_orcamento', currentMonthStart)
                .lte('data_orcamento', currentMonthEnd);

            if (currentMonthError) throw currentMonthError;

            let currentRevenue = 0;
            let currentUniqueClients = new Set();
            let currentTotalTickets = 0;
            let currentTicketCount = 0;

            if (currentMonthData) {
                currentRevenue = currentMonthData.reduce((sum, item) => sum + (item.total_liquido_calculado || 0), 0);
                currentMonthData.forEach(item => {
                    if (item.cliente_id) {
                        currentUniqueClients.add(item.cliente_id);
                    }
                    if (item.total_liquido_calculado !== null) {
                        currentTotalTickets += item.total_liquido_calculado;
                        currentTicketCount++;
                    }
                });
            }

            setMonthlyRevenue(currentRevenue);
            setUniqueClients(currentUniqueClients.size);
            setAverageTicket(currentTicketCount > 0 ? currentTotalTickets / currentTicketCount : 0);

            // Fetch previous month's data for growth calculation
            const { data: prevMonthData, error: prevMonthError } = await supabase
                .from('orcamento_summary_view')
                .select('total_liquido_calculado')
                .eq('cnpj_empresa', activeCompany.cnpj)
                .eq('faturado', true)
                .gte('data_orcamento', prevMonthStart)
                .lte('data_orcamento', prevMonthEnd);

            if (prevMonthError) throw prevMonthError;

            let prevRevenue = 0;
            if (prevMonthData) {
                prevRevenue = prevMonthData.reduce((sum, item) => sum + (item.total_liquido_calculado || 0), 0);
            }
            setPreviousMonthlyRevenue(prevRevenue);

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
            setAverageTicket(0);
        } finally {
            setLoading(false);
        }
    }, [user, activeCompany, toast]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const calculateGrowth = () => {
        if (previousMonthlyRevenue === 0) {
            return monthlyRevenue > 0 ? '+100%' : '0%';
        }
        const growth = ((monthlyRevenue - previousMonthlyRevenue) / previousMonthlyRevenue) * 100;
        return `${growth >= 0 ? '+' : ''}${growth.toFixed(2)}%`;
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold gradient-text">Dashboard</h1>
                <p className="text-slate-600 mt-2">Bem-vindo ao seu painel de controle.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
            ) : (
                <div className="stats-grid">
                    <div className="metric-card">
                        <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                        <div className="metric-value">{formatCurrency(monthlyRevenue)}</div>
                        <div className="metric-label">Faturamento Mensal</div>
                    </div>
                    <div className="metric-card">
                        <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
                        <div className="metric-value">{calculateGrowth()}</div>
                        <div className="metric-label">Crescimento (Mês a Mês)</div>
                    </div>
                    <div className="metric-card">
                        <Users className="w-8 h-8 text-purple-600 mx-auto mb-3" />
                        <div className="metric-value">{uniqueClients}</div>
                        <div className="metric-label">Clientes Únicos</div>
                    </div>
                    <div className="metric-card">
                        <FileText className="w-8 h-8 text-orange-600 mx-auto mb-3" />
                        <div className="metric-value">{formatCurrency(averageTicket)}</div>
                        <div className="metric-label">Ticket Médio</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;