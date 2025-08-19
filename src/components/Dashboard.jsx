import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
    TrendingUp,
    CheckCircle,
    XCircle,
    Clock,
    BarChart3,
    Loader2
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        authorized: 0,
        rejected: 0,
        pending: 0,
    });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        const fetchStats = async () => {
            if (!user) return;
            setLoading(true);

            const { data, error } = await supabase
                .from('orders')
                .select('nfce_status')
                .eq('user_id', user.id);

            if (error) {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao carregar estatísticas',
                    description: error.message,
                });
                setLoading(false);
                return;
            }

            const newStats = data.reduce((acc, order) => {
                const status = order.nfce_status || 'not_issued';
                if (status === 'authorized') {
                    acc.authorized += 1;
                } else if (status === 'rejected') {
                    acc.rejected += 1;
                } else if (['not_issued', 'pending'].includes(status)) {
                    acc.pending += 1;
                }
                return acc;
            }, { authorized: 0, rejected: 0, pending: 0 });

            setStats({
                ...newStats,
                total: data.length,
            });
            setLoading(false);
        };

        fetchStats();
    }, [user, toast]);

    const cardVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    };

    const MetricCard = ({ icon: Icon, color, label, value, loading }) => (
        <motion.div variants={cardVariants} className="metric-card">
            <Icon className={`w-8 h-8 ${color} mx-auto mb-3`} />
            {loading ? (
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-slate-400" />
            ) : (
                <div className="metric-value">{value}</div>
            )}
            <div className="metric-label">{label}</div>
        </motion.div>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold gradient-text">Dashboard NFC-e</h1>
                    <p className="text-slate-600 mt-2">Visão geral do sistema de emissão de notas fiscais</p>
                </div>
            </div>

            <motion.div 
                className="stats-grid"
                variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                }}
                initial="hidden"
                animate="visible"
            >
                <MetricCard icon={TrendingUp} color="text-blue-600" label="NFC-e Emitidas" value={stats.total} loading={loading} />
                <MetricCard icon={CheckCircle} color="text-green-600" label="Autorizadas" value={stats.authorized} loading={loading} />
                <MetricCard icon={XCircle} color="text-red-600" label="Rejeitadas" value={stats.rejected} loading={loading} />
                <MetricCard icon={Clock} color="text-yellow-600" label="Pendentes" value={stats.pending} loading={loading} />
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div variants={cardVariants} initial="hidden" animate="visible" className="chart-container">
                    <h3 className="chart-title">Emissões por Dia</h3>
                    <div className="flex items-center justify-center h-48 text-slate-400">
                        <BarChart3 className="w-16 h-16" />
                    </div>
                </motion.div>
                <motion.div variants={cardVariants} initial="hidden" animate="visible" className="chart-container">
                    <h3 className="chart-title">Status das NFC-e</h3>
                    <div className="flex items-center justify-center h-48 text-slate-400">
                        <TrendingUp className="w-16 h-16" />
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Dashboard;